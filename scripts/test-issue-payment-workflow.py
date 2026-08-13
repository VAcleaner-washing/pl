#!/usr/bin/env python3
from __future__ import annotations

import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

from pwa_visual_qa import BOOKINGS, render_page

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "issue-workflow-test-results"


def check(condition: bool, label: str) -> None:
    if not condition:
        raise AssertionError(label)
    print(f"PASS: {label}")


def run_width(browser, width: int) -> int:
    page = render_page(browser, width, 844, standalone=True)
    passed = 0
    prefix = f"{width}px"
    try:
        later = page.locator('.pwa-update-later')
        if later.count():
            later.click()
        page.wait_for_timeout(30)

        # Upcoming is the mobile start screen. Issue money must be the deposit only.
        upcoming = page.locator('.upcoming-row.issue').first
        if upcoming.count():
            money_text = upcoming.locator('.upcoming-money').inner_text()
            check('Залоговий платіж при видачі' in money_text, f"{prefix}: upcoming issue row asks for the security deposit")
            check('доплата' not in money_text.lower(), f"{prefix}: upcoming issue row has no rental-balance payment")
            passed += 2

        page.locator('.mobile-nav button[data-mobile-view="bookings"]:visible').click()
        page.wait_for_timeout(40)

        confirmed = page.locator(f'.booking-card[data-id="{BOOKINGS[2]["id"]}"]')
        confirmed_finance = confirmed.locator('.booking-finance').inner_text()
        check('доплата' not in confirmed_finance.lower(), f"{prefix}: confirmed booking card hides due/refund until return")
        check('фінал' in confirmed_finance.lower() and 'повернен' in confirmed_finance.lower(), f"{prefix}: confirmed booking points final settlement to return")
        passed += 2

        confirmed.locator('[data-action="issue"]').click()
        page.wait_for_selector('#issueForm')
        issue_summary = page.locator('#issueForm .modal-summary').inner_text()
        check('Оренду при видачі не доплачуємо' in issue_summary, f"{prefix}: issue modal explicitly says rental is not paid at handoff")
        check('Клієнт має доплатити' not in issue_summary, f"{prefix}: issue modal contains no final due")
        check('1000' in issue_summary.replace('\u00a0','').replace(' ',''), f"{prefix}: issue modal highlights the expected security deposit")
        passed += 3
        page.locator('#issueForm .close').click()
        page.wait_for_timeout(20)

        issued = page.locator(f'.booking-card[data-id="{BOOKINGS[3]["id"]}"]')
        issued_finance = issued.locator('.booking-finance').inner_text()
        check('доплата' not in issued_finance.lower(), f"{prefix}: issued booking card still hides final due/refund")
        check(issued.locator('[data-action="finance"]').inner_text().strip() == 'Попередній розрахунок', f"{prefix}: issued booking labels finance as preview")
        passed += 2

        issued.locator('[data-action="finance"]').click()
        page.wait_for_selector('#financeForm')
        check(page.locator('#financeForm header h2').inner_text().strip() == 'Попередній розрахунок', f"{prefix}: issued finance modal is explicitly preliminary")
        preview = page.locator('#financeForm .modal-summary').inner_text()
        check('Орієнтовно' in preview or 'Орієнтовний' in preview, f"{prefix}: pre-return finance result is labelled approximate")
        passed += 2
        page.locator('#financeForm .close').click()

        return passed
    finally:
        page.close()


def main() -> int:
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    total = 0
    failed: list[str] = []
    with sync_playwright() as p:
        options = {"headless": True, "args": ["--no-sandbox"]}
        executable = os.environ.get("PLAYWRIGHT_CHROMIUM_EXECUTABLE")
        if executable:
            options["executable_path"] = executable
        elif Path('/usr/bin/chromium').exists():
            options["executable_path"] = '/usr/bin/chromium'
        browser = p.chromium.launch(**options)
        try:
            for width in (320, 390, 430):
                try:
                    total += run_width(browser, width)
                except Exception as exc:
                    failed.append(f"{width}px: {exc}")
                    print(f"FAIL: {width}px: {exc}")
        finally:
            browser.close()
    result = {"passed": total, "failed": failed, "status": "passed" if not failed else "failed"}
    (ARTIFACTS / 'result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False))
    return 0 if not failed else 1


if __name__ == '__main__':
    raise SystemExit(main())
