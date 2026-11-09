"""Exercise friend-code attachment through the shipped booking editor.

All Supabase traffic is intercepted. Only synthetic fixture writes are allowed.
"""
import argparse
import json
import os
from pathlib import Path

from playwright.sync_api import expect, sync_playwright
import admin_idle_qa as idle
import e2e_smoke as smoke
from admin_entrypoint_finance_qa import pages_server


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--browser', choices=['chromium', 'webkit'], default='chromium')
    parser.add_argument('--root', default='dist')
    parser.add_argument('--artifacts', default='pwa-test-results/friend-referral')
    args = parser.parse_args()
    checks = smoke.Checks(Path(args.artifacts).resolve())
    config = json.loads((smoke.PROJECT_ROOT / 'config/vacleaner.json').read_text())
    with pages_server(Path(args.root).resolve()) as base, sync_playwright() as pw:
        options = {'headless': True}
        if args.browser == 'chromium':
            options['args'] = ['--no-sandbox']
        if exe := os.environ.get(f'PLAYWRIGHT_{args.browser.upper()}_EXECUTABLE'):
            options['executable_path'] = exe
        browser = getattr(pw, args.browser).launch(**options)
        for width in [320, 390, 430, 768, 1440]:
            context = browser.new_context(viewport={'width': width, 'height': 900}, service_workers='block')
            context.add_init_script(smoke.session_script() + "Object.defineProperty(navigator,'standalone',{value:true});")
            forbidden, errors, calls = [], [], []
            fixture = idle.fixtures(config, 7, 7, forbidden)
            booking = fixture.bookings[3]
            booking.update(fulfillment_address_detail='Під’їзд 2')

            def handle(route):
                data = route.request.post_data_json if route.request.post_data else {}
                action = (data or {}).get('action')
                if '/vacleaner-booking-promo-v1' in route.request.url and action == 'status':
                    route.fulfill(status=200, content_type='application/json', body=json.dumps({'attachedPromo': booking.get('extras', {}).get('promo'), 'availablePromo': None}))
                elif action == 'attach_referral':
                    calls.append(data)
                    if data.get('referralCode') != 'VA-ABC1234':
                        route.fulfill(status=409, content_type='application/json', body='{"error":"invalid_referral"}')
                        return
                    booking['extras'] = {**booking.get('extras', {}),
                        'promo': {'code': 'VA-ABC1234', 'kind': 'referral_friend', 'discount_type': 'fixed', 'discount_value': 100, 'applied': True},
                        'referral_friend': {'code': 'VA-ABC1234', 'referrer_phone': '+380950000001', 'discount_amount': 100},
                        'discount': {'source': 'promo', 'type': 'fixed', 'amount': 100}}
                    booking['base_amount'] -= 100
                    booking['total_amount'] -= 100
                    route.fulfill(status=200, content_type='application/json', body=json.dumps({'booking': booking, 'attached': True}))
                else:
                    fixture(route)

            smoke.install_routes(context, base, handle)
            page = context.new_page()
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(base + '/admin/bronuvannia/', wait_until='domcontentloaded')
            page.wait_for_selector('.booking-card,.upcoming-row')
            idle.navigate(page, 'bookings')

            def open_editor():
                if not page.locator('.detail:visible').count():
                    page.locator(f'.booking-card[data-id="{booking["id"]}"] .booking-row-head').click()
                page.locator('.detail [data-action="edit"]:visible').click()
                form = page.locator('#bookingForm')
                expect(form).to_be_visible()
                if width <= 900:
                    form.locator('.mobile-booking-next').click()
                return form

            form = open_editor()
            field = form.locator('[name=referralCode]')
            button = form.get_by_role('button', name='Застосувати код', exact=True)
            field.scroll_into_view_if_needed()
            checks.check(field.is_editable() and button.is_visible(), f'{width}: existing booking accepts friend code')
            checks.check(button.bounding_box()['height'] >= 44, f'{width}: apply touch target is reachable')
            before = {key: booking.get(key) for key in ['source', 'customer_phone', 'prepayment_paid', 'deposit_amount', 'fulfillment_address_detail', 'delivery_amount', 'extras_amount']}
            field.fill('VA-BADCODE')
            button.click()
            expect(button).to_be_enabled()
            expect(page.get_by_text('Перевірте код «Приведи друга»', exact=True)).to_be_visible()
            checks.check(field.is_editable() and len(calls) == 1, f'{width}: invalid code remains editable for retry')
            page.get_by_text('Перевірте код «Приведи друга»', exact=True).wait_for(state='hidden')
            # Draft access notes must survive the separate, explicitly immediate action.
            draft_name = form.locator('[name=customerName]')
            draft_name.fill('Тестова нова назва')
            field.fill('va-abc1234')
            button.scroll_into_view_if_needed()
            checks.screenshot(page, f'{args.browser}-{width}-before.png')
            button.dblclick()
            expect(button).to_have_count(0)
            expect(field).to_have_value('VA-ABC1234')
            checks.check(not field.is_editable() and len(calls) == 2, f'{width}: double tap attaches once and locks the saved code')
            checks.check(form.locator('[data-detach-booking-promo]').count() == 0, f'{width}: referral is not offered as a removable RETURN promo')
            checks.check(draft_name.input_value() == 'Тестова нова назва', f'{width}: applying referral preserves other draft inputs')
            checks.check(before == {key: booking.get(key) for key in before}, f'{width}: API fixture changes no source, payments, deposit or delivery')
            checks.check(smoke.no_horizontal_overflow(page), f'{width}: editor has no horizontal overflow')
            checks.screenshot(page, f'{args.browser}-{width}-applied.png')
            form.locator('header [data-close]').click()
            expect(page.locator('.detail')).to_be_visible()
            form = open_editor()
            reopened = form.locator('[name=referralCode]')
            checks.check(reopened.input_value() == 'VA-ABC1234' and not reopened.is_editable(), f'{width}: reopening retains the attached referral')
            checks.check(not forbidden and not errors, f'{width}: no unintended API writes or runtime errors {forbidden} {errors}')
            context.close()
        browser.close()
    checks.artifacts.mkdir(parents=True, exist_ok=True)
    result = {'browser': args.browser, 'passed': checks.passed, 'failed': checks.failed, 'liveWrites': False}
    (checks.artifacts / 'result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print(json.dumps(result, ensure_ascii=False))
    return int(bool(checks.failed))


if __name__ == '__main__':
    raise SystemExit(main())
