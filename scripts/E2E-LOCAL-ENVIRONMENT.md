# Local browser execution note — v3.0.11

The Playwright test source compiles successfully and is wired into GitHub Actions before the Pages artifact upload.

A local execution was attempted in the current managed container. Chromium refused the local static URL before any page code ran:

```text
Page.goto: net::ERR_BLOCKED_BY_ADMINISTRATOR
http://127.0.0.1:<dynamic-port>/bronuvannia/
```

This is a browser policy of the current execution environment, not an application assertion failure. The GitHub workflow installs a clean Playwright Chromium build on `ubuntu-latest` and must produce the authoritative browser result before Pages deploys.
