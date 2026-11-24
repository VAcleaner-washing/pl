# Local browser execution note — v3.0.11

The Playwright test source compiles successfully and is wired into GitHub Actions before the Pages artifact upload.

A local execution was attempted in the current managed container. Chromium refused the local static URL before any page code ran:

```text
Page.goto: net::ERR_BLOCKED_BY_ADMINISTRATOR
http://127.0.0.1:<dynamic-port>/bronuvannia/
```

This was a browser policy of that managed environment, not an application assertion failure. The current GitHub Browser aggregate, WebKit and Operations jobs use the same digest-pinned official Playwright 1.65.1 Noble image on `ubuntu-24.04`. The Browser aggregate verifies the matching Python client and launches both Chromium and WebKit before canonical QA. Full GitHub QA on the exact commit remains authoritative before Pages deploys; a local runtime or fixture result alone is insufficient.
