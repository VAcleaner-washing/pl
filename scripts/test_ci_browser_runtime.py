import unittest
from contextlib import nullcontext
from types import SimpleNamespace
from unittest.mock import Mock

from verify_ci_browser_runtime import expected_version, verify_runtime


class BrowserRuntimeTests(unittest.TestCase):
    def runtime(self):
        browsers = {}
        engines = {}
        for name in ("chromium", "webkit"):
            browser = Mock()
            browser.version = f"{name}-fixture"
            browsers[name] = browser
            engines[name] = SimpleNamespace(launch=Mock(return_value=browser))
        runtime = SimpleNamespace(**engines)
        factory = Mock(return_value=nullcontext(runtime))
        return runtime, browsers, factory

    def test_exact_requirement_pin(self):
        self.assertEqual(expected_version("playwright==1.65.1\n"), "1.65.1")
        for invalid in ("playwright>=1.65.1", "playwright==1.65.1\nother==1.0", "", "playwright==latest"):
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                expected_version(invalid)

    def test_both_engines_really_open_and_close_a_page(self):
        runtime, browsers, factory = self.runtime()
        result = verify_runtime("1.65.1", "1.65.1", factory, output=Mock())
        self.assertEqual(set(result), {"chromium", "webkit"})
        for name, browser in browsers.items():
            getattr(runtime, name).launch.assert_called_once_with(headless=True)
            browser.new_page.return_value.goto.assert_called_once_with("about:blank")
            browser.close.assert_called_once_with()

    def test_mismatched_client_fails_before_launch(self):
        _, _, factory = self.runtime()
        with self.assertRaisesRegex(RuntimeError, "client mismatch"):
            verify_runtime("1.65.1", "1.61.0", factory)
        factory.assert_not_called()

    def test_missing_webkit_is_a_hard_failure(self):
        runtime, _, factory = self.runtime()
        del runtime.webkit
        with self.assertRaises(AttributeError):
            verify_runtime("1.65.1", "1.65.1", factory, output=Mock())

    def test_each_engine_launch_failure_remains_a_failure(self):
        for name in ("chromium", "webkit"):
            with self.subTest(name=name):
                runtime, _, factory = self.runtime()
                getattr(runtime, name).launch.side_effect = RuntimeError("missing library")
                with self.assertRaisesRegex(RuntimeError, "missing library"):
                    verify_runtime("1.65.1", "1.65.1", factory, output=Mock())

    def test_page_failure_closes_browser_and_propagates(self):
        for name in ("chromium", "webkit"):
            with self.subTest(name=name):
                _, browsers, factory = self.runtime()
                browsers[name].new_page.return_value.goto.side_effect = RuntimeError("page failed")
                with self.assertRaisesRegex(RuntimeError, "page failed"):
                    verify_runtime("1.65.1", "1.65.1", factory, output=Mock())
                browsers[name].close.assert_called_once_with()


if __name__ == "__main__":
    unittest.main()
