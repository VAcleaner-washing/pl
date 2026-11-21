"""Deterministic eligibility regression for the WebKit booking full-journey retry.

Run: python -m unittest discover -s scripts -p 'test_public_hydration_retry.py'
"""
import unittest
from types import SimpleNamespace

from public_hydration_qa import should_retry_webkit_booking, retry_journey_passed


class WebkitRetryContract(unittest.TestCase):
    def eligible(self, **changes):
        case = dict(browser='webkit', route='/bronuvannia/', result={'passed': False},
                    response=SimpleNamespace(status=200), pending=0,
                    python_error=None, errors=['fixture due to access control checks.'],
                    create_calls=[])
        case.update(changes)
        return should_retry_webkit_booking(**case)

    def test_only_qualifying_transient_error_can_retry(self):
        self.assertTrue(self.eligible())

    def test_other_browser_or_route_never_retries(self):
        self.assertFalse(self.eligible(browser='chromium'))
        self.assertFalse(self.eligible(route='/'))

    def test_successful_first_attempt_never_retries(self):
        self.assertFalse(self.eligible(result={'passed': True}))

    def test_unrelated_or_mixed_errors_never_retry(self):
        self.assertFalse(self.eligible(errors=['TypeError: broken']))
        self.assertFalse(self.eligible(errors=['fixture due to access control checks.', 'TypeError: broken']))
        self.assertFalse(self.eligible(errors=[]))

    def test_non_success_response_never_retries(self):
        self.assertFalse(self.eligible(response=None))
        self.assertFalse(self.eligible(response=SimpleNamespace(status=500)))

    def test_assertion_pending_or_create_never_retries(self):
        self.assertFalse(self.eligible(python_error='AssertionError'))
        self.assertFalse(self.eligible(pending=1))
        self.assertFalse(self.eligible(create_calls=[{'action': 'create'}]))


class WebkitRetryOutcomeContract(unittest.TestCase):
    def retry(self, **changes):
        case = dict(response=SimpleNamespace(status=200), pending=0,
                    errors=[], python_failure=None, create_calls=[])
        case.update(changes)
        return retry_journey_passed(**case)

    def test_full_second_journey_success_is_accepted(self):
        self.assertTrue(self.retry())

    def test_second_journey_pageerror_remains_failure(self):
        self.assertFalse(self.retry(errors=['TypeError: second attempt failed']))
        self.assertFalse(self.retry(errors=['fixture due to access control checks.']))

    def test_second_journey_assertion_or_http_failure_remains_failure(self):
        self.assertFalse(self.retry(python_failure='AssertionError'))
        self.assertFalse(self.retry(response=None))
        self.assertFalse(self.retry(response=SimpleNamespace(status=500)))

    def test_second_journey_pending_or_create_remains_failure(self):
        self.assertFalse(self.retry(pending=1))
        self.assertFalse(self.retry(create_calls=[{'action': 'create'}]))


if __name__ == '__main__':
    unittest.main()
