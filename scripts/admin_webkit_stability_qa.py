"""Remote-CI-only diagnostics around unchanged admin acceptance suites.

The immediate variant retains the original capture timing. The settled variant
waits for already-running finite animations to finish; it never disables them.
Neither variant suppresses failures, retries an action, or changes assertions.
"""
import argparse
import datetime
import importlib.metadata
import json
import os
import platform
import runpy
import sys
import time
import traceback
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def resources():
    result = {}
    for name in ['memory.current', 'memory.peak', 'memory.max', 'memory.events']:
        try:
            result[name] = (Path('/sys/fs/cgroup') / name).read_text().strip()
        except OSError:
            result[name] = 'unavailable'
    try:
        stat = os.statvfs('/dev/shm')
        result['shm'] = {'total': stat.f_frsize * stat.f_blocks,
                         'available': stat.f_frsize * stat.f_bavail}
    except OSError:
        result['shm'] = 'unavailable'
    processes = []
    for directory in Path('/proc').iterdir():
        if not directory.name.isdigit():
            continue
        try:
            fields = dict(line.split(':', 1) for line in
                          (directory / 'status').read_text().splitlines() if ':' in line)
            processes.append({'pid': int(directory.name),
                              'ppid': int(fields.get('PPid', '0').strip()),
                              'name': fields.get('Name', '').strip(),
                              'state': fields.get('State', '').strip(),
                              'rssKiB': int(fields.get('VmRSS', '0 kB').split()[0])})
        except (OSError, ValueError):
            continue
    result['largestProcesses'] = sorted(processes, key=lambda row: row['rssKiB'], reverse=True)[:15]
    try:
        available = ['MemAvailable:', 'MemFree:', 'Shmem:']
        result['hostMemory'] = [line for line in Path('/proc/meminfo').read_text().splitlines()
                                if any(line.startswith(prefix) for prefix in available)]
    except OSError:
        result['hostMemory'] = 'unavailable'
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--suite', choices=['audit', 'screens'], default='audit')
    parser.add_argument('--capture', choices=['immediate', 'settled'], required=True)
    parser.add_argument('--browser', choices=['webkit', 'chromium'], default='webkit')
    parser.add_argument('--width', type=int, choices=[440, 1440], default=1440)
    parser.add_argument('--artifacts', required=True)
    args = parser.parse_args()
    if os.environ.get('GITHUB_ACTIONS') != 'true':
        parser.error('Run only in the existing remote GitHub Actions browser environment')
    for stream in [sys.stdout, sys.stderr]:
        if hasattr(stream, 'reconfigure'):
            stream.reconfigure(line_buffering=True)
    from playwright.sync_api import Browser, BrowserContext, BrowserType, Locator, Page

    out = Path(args.artifacts).resolve()
    out.mkdir(parents=True, exist_ok=True)
    events = []
    page_count = 0
    context_count = 0
    page_ids = {}
    context_ids = {}
    closing = set()
    audit_contexts = []
    traced = set()
    last = {'operation': None, 'selector': None, 'page': None, 'dom': None}

    def event(name, **details):
        row = {'event': name, 'at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
               'monotonic': time.monotonic(), 'capture': args.capture,
               'lastOperation': dict(last), 'resources': resources(), **details}
        events.append(row)
        # Keep original stdout, DOM and screenshot failures; this file is extra
        # evidence, rather than a replacement success/failure signal.
        with (out / 'events.jsonl').open('a') as handle:
            handle.write(json.dumps(row, ensure_ascii=False, allow_nan=False) + '\n')
        print('WEBKIT_DIAGNOSTIC ' + json.dumps(row, ensure_ascii=False, allow_nan=False), flush=True)

    def dom(page):
        try:
            return page.evaluate('''()=>({
              title:document.querySelector('#pageTitle')?.textContent,
              view:document.documentElement.dataset.adminView,
              readyState:document.readyState,visibility:document.visibilityState,
              nodes:document.querySelectorAll('*').length,
              viewport:{width:innerWidth,height:innerHeight},
              activeElement:document.activeElement?.name||document.activeElement?.id||document.activeElement?.tagName,
              fonts:document.fonts.status,
              finiteAnimations:document.getAnimations().flatMap(a=>{
                const t=a.effect?.getComputedTiming();
                if(!t||!Number.isFinite(t.endTime))return[];
                return[{state:a.playState,duration:t.duration,
                  target:a.effect?.target?.className||a.effect?.target?.tagName,
                  type:a.constructor.name}]
              })
            })''')
        except Exception as error:
            return {'unavailable': type(error).__name__}

    def attach_page(page):
        nonlocal page_count
        page_count += 1
        label = page_count
        page_ids[id(page)] = label
        page.on('crash', lambda: event('page-crash', page=label, lastKnownDOM=last['dom']))
        page.on('close', lambda: event('page-close', page=label,
                                      intentionalContextClose=id(page.context) in closing))
        page.on('pageerror', lambda error: event('application-pageerror', page=label, error=str(error)))
        event('page-created', page=label)

    original_launch = BrowserType.launch
    original_context = Browser.new_context
    original_context_close = BrowserContext.close
    original_browser_close = Browser.close
    original_click = Locator.click
    original_screenshot = Page.screenshot

    def save_trace(context, reason):
        if args.suite != 'audit' or id(context) in traced:
            return
        traced.add(id(context))
        try:
            trace = out / f'context-{context_ids[id(context)]}-{reason}-trace.zip'
            context.tracing.stop(path=str(trace))
            event('trace-saved', artifact=trace.name)
        except Exception as error:
            event('trace-unavailable', error=str(error))

    def failure_traces():
        # Export before the original suite's sync_playwright context manager
        # shuts down its connection while propagating an exception.
        for context in audit_contexts:
            save_trace(context, 'failure')

    def launch(browser_type, *call_args, **kwargs):
        event('before-browser-launch', engine=browser_type.name)
        browser = original_launch(browser_type, *call_args, **kwargs)
        browser.on('disconnected', lambda: event('browser-disconnected', intentional=id(browser) in closing))
        event('browser-launched', engine=browser_type.name, version=browser.version)
        return browser

    def new_context(browser, *call_args, **kwargs):
        nonlocal context_count
        context = original_context(browser, *call_args, **kwargs)
        context_count += 1
        label = context_count
        context_ids[id(context)] = label
        context.on('page', attach_page)
        # The generated screen suite already owns its traces. Starting a second
        # recorder would itself change the test. Audit-r1 currently has none.
        if args.suite == 'audit':
            context.tracing.start(screenshots=True, snapshots=True, sources=True)
            audit_contexts.append(context)
        event('context-created', context=label, viewport=kwargs.get('viewport'))
        return context

    def close_context(context, *call_args, **kwargs):
        closing.add(id(context))
        if args.suite == 'audit':
            save_trace(context, 'close')
        event('before-context-close', context=context_ids.get(id(context)))
        return original_context_close(context, *call_args, **kwargs)

    def close_browser(browser, *call_args, **kwargs):
        closing.add(id(browser))
        event('before-browser-close')
        return original_browser_close(browser, *call_args, **kwargs)

    def click(locator, *call_args, **kwargs):
        page = getattr(locator, 'page', None)
        last.update(operation='Locator.click', selector=str(locator),
                    page=page_ids.get(id(page)) if page else None,
                    dom=dom(page) if page else None)
        event('before-click')
        try:
            result = original_click(locator, *call_args, **kwargs)
        except Exception as error:
            event('click-error', error=str(error))
            failure_traces()
            raise
        event('after-click')
        return result

    def screenshot(page, *call_args, **kwargs):
        last.update(operation='Page.screenshot', selector=str(kwargs.get('path')),
                    page=page_ids.get(id(page)), dom=dom(page))
        event('before-screenshot', options={k: v for k, v in kwargs.items() if k in ['full_page', 'animations', 'timeout']})
        if args.capture == 'settled':
            # This is a controlled comparison, not an alternate gate that may
            # silently replace the original condition. Infinite loading spinners
            # remain running, and every finite animation actually finishes.
            page.evaluate('''async()=>{
              await document.fonts.ready;
              await Promise.all(document.getAnimations()
                .filter(a=>Number.isFinite(a.effect?.getComputedTiming().endTime))
                .map(a=>a.finished.catch(()=>{})));
            }''')
            event('finite-animations-settled', dom=dom(page))
        try:
            result = original_screenshot(page, *call_args, **kwargs)
        except Exception as error:
            event('screenshot-error', error=str(error))
            failure_traces()
            raise
        event('after-screenshot')
        return result

    BrowserType.launch = launch
    Browser.new_context = new_context
    BrowserContext.close = close_context
    Browser.close = close_browser
    Locator.click = click
    Page.screenshot = screenshot

    suite_path = ROOT / 'scripts' / ('admin_audit_r1_qa.py' if args.suite == 'audit' else 'admin_staging_screens_qa.py')
    original_argv = sys.argv
    sys.argv = [str(suite_path), '--browser', args.browser, '--artifacts', str(out / 'suite')]
    if args.suite == 'screens':
        sys.argv += ['--width', str(args.width)]
    exit_code = 0
    failure = None
    event('suite-start', suite=str(suite_path.name), runtime={
        'python': platform.python_version(), 'platform': platform.platform(),
        'playwright': importlib.metadata.version('playwright'),
        'browsersPath': os.environ.get('PLAYWRIGHT_BROWSERS_PATH'),
    })
    try:
        runpy.run_path(str(suite_path), run_name='__main__')
    except SystemExit as error:
        exit_code = error.code if isinstance(error.code, int) else int(bool(error.code))
    except Exception as error:
        exit_code = 1
        failure = {'error': str(error), 'traceback': traceback.format_exc()}
        event('suite-exception', **failure)
        traceback.print_exc()
    finally:
        sys.argv = original_argv
        event('suite-end', exitCode=exit_code)
    result = {'suite': args.suite, 'browser': args.browser, 'capture': args.capture,
              'exitCode': exit_code, 'failure': failure, 'pages': page_count,
              'contexts': context_count, 'events': len(events),
              'pageCrashes': [row for row in events if row['event'] == 'page-crash'],
              'unexpectedDisconnects': [row for row in events if row['event'] == 'browser-disconnected' and not row['intentional']],
              'interpretation': 'Controlled evidence; successful variant does not erase failures or prove root cause.'}
    (out / 'diagnostic-result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({key: result[key] for key in ['suite', 'browser', 'capture', 'exitCode', 'pages', 'contexts']}), flush=True)
    return exit_code


if __name__ == '__main__':
    raise SystemExit(main())
