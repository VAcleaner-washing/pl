"""Supervise unchanged full suites in the approved remote browser environment.

No browser APIs are patched. Every declared job runs both suites even if the
first fails, retains failures, and returns nonzero if either suite fails.
"""
import argparse
import datetime
import hashlib
import importlib.metadata
import json
import os
import subprocess
import sys
import threading
import time
from pathlib import Path


def resources():
    result = {}
    for name in ['memory.current', 'memory.peak', 'memory.max', 'memory.events']:
        try:
            result[name] = (Path('/sys/fs/cgroup') / name).read_text().strip()
        except OSError:
            result[name] = 'unavailable'
    try:
        stat = os.statvfs('/dev/shm')
        result['shmAvailable'] = stat.f_frsize * stat.f_bavail
    except OSError:
        result['shmAvailable'] = 'unavailable'
    rows = []
    for directory in Path('/proc').iterdir():
        if not directory.name.isdigit():
            continue
        try:
            fields = dict(line.split(':', 1) for line in
                          (directory / 'status').read_text().splitlines() if ':' in line)
            rows.append({'pid': int(directory.name),
                         'ppid': int(fields.get('PPid', '0').strip()),
                         'name': fields.get('Name', '').strip(),
                         'rssKiB': int(fields.get('VmRSS', '0 kB').split()[0])})
        except (OSError, ValueError):
            continue
    result['largestProcesses'] = sorted(rows, key=lambda row: row['rssKiB'], reverse=True)[:12]
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', required=True)
    parser.add_argument('--artifacts', required=True)
    args = parser.parse_args()
    if os.environ.get('GITHUB_ACTIONS') != 'true':
        parser.error('Run only in the approved remote GitHub Actions diagnostic')
    root = Path(args.root).resolve()
    out = Path(args.artifacts).resolve()
    out.mkdir(parents=True, exist_ok=True)
    expected = 'c1f59213bb90c8185414ded45fe846108d5d04bb'
    assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip() == expected
    client = importlib.metadata.version('playwright')
    assert client == os.environ['PW_CLIENT_VERSION']
    suite_files = ['scripts/admin_staging_screens_qa.py', 'scripts/admin_lab_qa.py']
    assert subprocess.run(['git', 'diff', '--exit-code', '--', *suite_files], cwd=root).returncode == 0
    metadata = {'source': expected, 'client': client,
                'declaredSample': os.environ['DECLARED_SAMPLE'],
                'tracePolicy': 'Original R4 tracing enabled; original LAB harness unchanged',
                'harnessSha256': {p: hashlib.sha256((root / p).read_bytes()).hexdigest() for p in suite_files},
                'inputManifestSha256': hashlib.sha256((root / 'webkit-diagnostic-build.json').read_bytes()).hexdigest(),
                'physicalIphone': False, 'network': 'Original fixture route guards; no remote forwarding'}
    (out / 'environment.json').write_text(json.dumps(metadata, indent=2) + '\n')
    suites = [('screens', ['scripts/admin_staging_screens_qa.py', '--browser', 'webkit', '--width', '1440']),
              ('lab', ['scripts/admin_lab_qa.py', '--browser', 'webkit'])]
    outcomes = []
    for label, arguments in suites:
        target = out / label
        target.mkdir(parents=True, exist_ok=True)
        stop = threading.Event()
        def observe():
            with (target / 'resources.jsonl').open('w') as handle:
                while True:
                    row = {'at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                           'monotonic': time.monotonic(), **resources()}
                    handle.write(json.dumps(row) + '\n')
                    handle.flush()
                    if stop.wait(1):
                        break
        watcher = threading.Thread(target=observe, daemon=True)
        watcher.start()
        command = [sys.executable, *arguments, '--artifacts', str(target)]
        print('DECLARED_SUITE_START ' + json.dumps({'suite': label, 'command': command, **metadata}), flush=True)
        started = time.monotonic()
        code = None
        try:
            with (target / 'stdout.log').open('w') as log:
                process = subprocess.Popen(command, cwd=root, stdout=subprocess.PIPE,
                                           stderr=subprocess.STDOUT, text=True,
                                           env={**os.environ, 'PYTHONUNBUFFERED': '1'})
                for line in process.stdout:
                    log.write(line)
                    log.flush()
                    print(line, end='', flush=True)
                code = process.wait()
        finally:
            stop.set()
            watcher.join(timeout=5)
            result_path = target / 'result.json'
            try:
                result = json.loads(result_path.read_text()) if result_path.is_file() else None
            except (OSError, ValueError):
                result = None
            outcome = {'suite': label, 'exitCode': code,
                       'durationSeconds': round(time.monotonic() - started, 3),
                       'result': result, 'resourcesAfter': resources()}
            outcomes.append(outcome)
            (out / 'result.json').write_text(json.dumps({**metadata, 'outcomes': outcomes}, indent=2) + '\n')
            print('DECLARED_SUITE_END ' + json.dumps({k: outcome[k] for k in ['suite', 'exitCode', 'durationSeconds']}), flush=True)
    return int(any(row['exitCode'] != 0 for row in outcomes))


if __name__ == '__main__':
    raise SystemExit(main())
