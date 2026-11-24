"""Fail before the long QA suite if the pinned browser image is unusable."""
from importlib.metadata import version
from pathlib import Path
import platform
import re


def expected_version(requirements):
    match = re.fullmatch(r"playwright==(\d+\.\d+\.\d+)", requirements.strip())
    if not match:
        raise ValueError("CI requires one exact Playwright version pin")
    return match.group(1)


def verify_runtime(expected, installed, factory, output=print):
    if installed != expected:
        raise RuntimeError(f"Playwright client mismatch: expected {expected}, installed {installed}")
    results = {}
    with factory() as runtime:
        for name in ("chromium", "webkit"):
            browser = getattr(runtime, name).launch(headless=True)
            try:
                page = browser.new_page()
                page.goto("about:blank")
                results[name] = browser.version
                output(f"{name} startup: OK; browser version: {browser.version}")
            finally:
                browser.close()
    return results


def main():
    from playwright.sync_api import sync_playwright
    requirements = Path(__file__).resolve().parents[1] / "requirements-ci.txt"
    expected = expected_version(requirements.read_text())
    installed = version("playwright")
    print(f"Pinned runtime Python: {platform.python_version()}; Playwright: {installed}", flush=True)
    verify_runtime(expected, installed, sync_playwright)


if __name__ == "__main__":
    main()
