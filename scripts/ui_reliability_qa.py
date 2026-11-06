"""Exercise audited UI failures against shipped assets; every external API is isolated."""
import argparse
import json
import os
from pathlib import Path
from playwright.sync_api import expect, sync_playwright
import e2e_smoke as smoke
from admin_entrypoint_finance_qa import pages_server
from mobile_forms_qa import readonly_api

PROBE = '''window.__uiIdle={frames:0,mutations:0};const frame=requestAnimationFrame;
window.requestAnimationFrame=fn=>frame.call(window,t=>{window.__uiIdle.frames++;fn(t)});
new MutationObserver(rs=>window.__uiIdle.mutations+=rs.length).observe(document,{subtree:true,childList:true});'''
SELECTOR = 'button:not(:disabled),a[href],input:not(:disabled):not([type=hidden]),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])'


def trap(page, dialog, checks, label):
    page.wait_for_function('(el)=>el.contains(document.activeElement)', arg=dialog.element_handle())
    controls = dialog.locator(SELECTOR).filter(visible=True)
    controls.first.focus()
    page.keyboard.press('Shift+Tab')
    checks.check(dialog.evaluate('(el)=>el.contains(document.activeElement)'), label + ': reverse tab stays inside')
    controls.last.focus()
    page.keyboard.press('Tab')
    checks.check(dialog.evaluate('(el)=>el.contains(document.activeElement)'), label + ': forward tab stays inside')
    checks.check(dialog.get_attribute('aria-modal') == 'true', label + ': dialog semantics')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', default='dist')
    parser.add_argument('--artifacts', default='ui-reliability-test-results')
    parser.add_argument('--browser', choices=['chromium', 'webkit'], default='chromium')
    args = parser.parse_args()
    checks = smoke.Checks(Path(args.artifacts).resolve())
    config = json.loads((smoke.PROJECT_ROOT / 'config/vacleaner.json').read_text())
    release = json.loads((smoke.PROJECT_ROOT / 'release.json').read_text())
    with pages_server(Path(args.root).resolve()) as base, sync_playwright() as pw:
        options = {'headless': True}
        if args.browser == 'chromium':
            options['args'] = ['--no-sandbox']
        if exe := os.environ.get('PLAYWRIGHT_' + args.browser.upper() + '_EXECUTABLE'):
            options['executable_path'] = exe
        browser = getattr(pw, args.browser).launch(**options)
        for width in [390, 1440]:
            context = browser.new_context(viewport={'width': width, 'height': 900}, service_workers='block')
            smoke.install_routes(context, base, smoke.make_api_handler(config))
            context.add_init_script(PROBE)
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(base + '/bronuvannia/', wait_until='networkidle')
            expect(page.locator('.vx-smart-entry')).to_be_visible()
            # Existing slot-binding repair completes after six seconds. Measure settled idle.
            page.wait_for_timeout(6800)
            for stage in ['initial', 'selected']:
                if stage == 'selected':
                    page.locator('[data-vx-task="mattress"]').click()
                    product = page.locator('.booking-products button[data-product-code="puzzi_jimmy"]')
                    product.click()
                    expect(product).to_have_attribute('aria-pressed', 'true')
                    page.wait_for_timeout(600)
                page.evaluate('window.__uiIdle={frames:0,mutations:0}')
                page.wait_for_timeout(1200)
                sample = page.evaluate('window.__uiIdle')
                checks.check(sample['mutations'] <= 4 and sample['frames'] <= 8,
                             f'{width}/{stage}: booking settles {sample}')
                checks.check(page.locator('.booking-summary-total span').inner_text() == 'Вартість бронювання',
                             f'{width}/{stage}: approved total label')
            builds = page.evaluate('window.dataLayer.filter(x=>x.analytics_build).map(x=>x.analytics_build)')
            checks.check(bool(builds) and all(x == str(release['build']) for x in builds), f'{width}: analytics uses stamped build {builds}')
            checks.check(not errors, f'{width}: no runtime errors {errors}')
            checks.screenshot(page, f'booking-{width}.png')
            context.close()

        # All repair/load hooks share one catalog result; a user may retry a failed read later.
        for failed in [False, True]:
            context = browser.new_context(viewport={'width': 390, 'height': 844}, service_workers='block')
            count = {'settings': 0}
            fallback = smoke.make_api_handler(config)
            def api(route):
                if '/vacleaner-settings' in route.request.url:
                    count['settings'] += 1
                    if failed:
                        route.fulfill(status=503, content_type='application/json', body='{"error":"test_outage"}')
                        return
                fallback(route)
            smoke.install_routes(context, base, api)
            page = context.new_page()
            page.goto(base + '/pidbir/', wait_until='networkidle')
            page.wait_for_timeout(2200)
            checks.check(count['settings'] == 1, f'quiz failure={failed}: one catalog request across boot hooks')
            trap(page, page.locator('.vq-dialog'), checks, f'quiz failure={failed}')
            checks.check(page.evaluate('[...document.body.children].filter(x=>!x.classList.contains("vq-layer")).every(x=>x.inert)'), 'quiz background is inert')
            if failed:
                page.clock.install()
                page.clock.fast_forward(10001)
                with page.expect_response(lambda response: '/vacleaner-settings' in response.url):
                    page.evaluate('window.__VAC_OPEN_SMART_GUIDE__()')
                checks.check(count['settings'] == 2, 'quiz: later user open retries failed catalog')
            checks.screenshot(page, f'quiz-{failed}.png')
            context.close()

        # An embedded quiz restores the invoking element and its previous inert state.
        context = browser.new_context(viewport={'width': 390, 'height': 844}, service_workers='block')
        smoke.install_routes(context, base, smoke.make_api_handler(config))
        page = context.new_page()
        page.goto(base + '/', wait_until='networkidle')
        if not page.evaluate('Boolean(window.VACLEANER_CORE)'):
            page.add_script_tag(url=base + '/assets/vacleaner-core.js')
        if not page.evaluate('Boolean(window.__VAC_OPEN_SMART_GUIDE__)'):
            page.add_script_tag(url=base + '/assets/public-quiz.js?v=' + str(release['build']))
        page.locator('.menu-button').focus()
        page.evaluate('window.__quizOpener=document.activeElement;window.__VAC_OPEN_SMART_GUIDE__()')
        expect(page.locator('.vq-dialog')).to_be_visible()
        page.keyboard.press('Escape')
        checks.check(page.evaluate('document.activeElement===window.__quizOpener&&!window.__quizOpener.inert&&!window.__quizOpener.closest("[inert]")'), 'embedded quiz restores focus and background')
        context.close()

        for asset in ['/_next/static/chunks/0m_p1bxtorv5i.js', '/assets/booking-hardening-v4144.js']:
            context = browser.new_context(viewport={'width': 390, 'height': 844}, service_workers='block')
            blocked = {'active': True}
            fallback = smoke.make_api_handler(config)
            def routing(route):
                url = route.request.url
                if url.startswith(smoke.SUPABASE_HOST):
                    fallback(route)
                elif url.startswith(base):
                    if blocked['active'] and asset in url:
                        route.abort()
                    else:
                        route.continue_()
                else:
                    route.abort()
            context.route('**/*', routing)
            page = context.new_page()
            page.goto(base + '/bronuvannia/', wait_until='domcontentloaded')
            notice = page.locator('#vac-page-recovery')
            expect(notice).to_be_visible(timeout=16000)
            checks.check(notice.locator('a').get_attribute('href') == 'tel:+380953919569', f'{asset}: manager contact works without hydration')
            checks.check(smoke.no_horizontal_overflow(page), f'{asset}: recovery fits mobile viewport')
            checks.screenshot(page, 'recovery-' + ('chunk' if '_next' in asset else 'enhancement') + '.png')
            blocked['active'] = False
            notice.get_by_role('button', name='Спробувати ще раз').click()
            page.wait_for_selector('html[data-vacleaner-hydrated="1"]', state='attached')
            expect(page.locator('.vx-smart-entry')).to_be_visible()
            expect(page.locator('#vac-page-recovery')).to_have_count(0)
            checks.check(True, f'{asset}: retry reloads a working booking')
            context.close()

        for width in [390, 1440]:
            context = browser.new_context(viewport={'width': width, 'height': 900}, service_workers='block')
            context.add_init_script(smoke.session_script())
            forbidden = []
            smoke.install_routes(context, base, readonly_api(config, forbidden))
            page = context.new_page()
            page.goto(base + '/admin/bronuvannia/', wait_until='networkidle')
            page.locator('.mobile-nav [data-mobile-view=bookings]:visible,.nav [data-view=bookings]:visible').first.click()
            page.locator('.booking-card').first.wait_for()
            page.locator('.booking-card .booking-row-head').first.evaluate('(el)=>{window.__detailOpener=el}')
            page.locator('.booking-card .booking-row-head').first.click()
            detail = page.locator('.detail')
            trap(page, detail, checks, f'admin {width}')
            detail.locator('[data-action="finance"]:visible').click()
            expect(page.locator('#financeForm')).to_be_visible()
            page.locator('#financeForm').get_by_role('button', name='Закрити', exact=True).click()
            expect(detail).to_be_visible()
            trap(page, detail, checks, f'admin {width} after finance')
            checks.screenshot(page, f'admin-detail-{width}.png')
            page.keyboard.press('Escape')
            expect(detail).to_have_count(0)
            page.wait_for_function('() => document.activeElement===window.__detailOpener&&!window.__detailOpener.closest("[inert]")')
            checks.check(page.evaluate('document.activeElement===window.__detailOpener&&!window.__detailOpener.closest("[inert]")'), f'admin {width}: close restores list focus')
            checks.check(not forbidden, f'admin {width}: no business writes {forbidden}')
            context.close()
        browser.close()
    checks.artifacts.mkdir(parents=True, exist_ok=True)
    (checks.artifacts / 'result.json').write_text(json.dumps({'browser': args.browser, 'passed': checks.passed, 'failed': checks.failed}, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'passed': checks.passed, 'failed': checks.failed}), flush=True)
    return int(bool(checks.failed))


if __name__ == '__main__':
    raise SystemExit(main())
