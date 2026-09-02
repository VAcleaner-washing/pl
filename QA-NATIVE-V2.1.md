# VAcleaner · Native UI V2.1 QA

## Targeted component audit
`python scripts/native_v21_qa.py`

Result: **180 PASS / 0 FAIL**.

Coverage:
- 320 / 390 / 430 px: Upcoming, Bookings, Calendar, Equipment, Clients, Campaigns, Finances, Analytics, Chemistry, Settings.
- All Settings tabs: Rental, Delivery, Equipment, Notifications, System.
- New booking form.
- Processing, issue, preliminary/final finance, extension flows.
- Booking `Ще` action sheet.
- Client card and SMS modal.
- No horizontal overflow.
- Bottom navigation 44+ px touch targets.
- Search inner input has no second shell.
- Composite control inner fields have no second border.
- Checkbox/radio controls stay compact.
- Settings save actions clear the bottom navigation.

## Visual evidence
Screenshots are generated from the V2.1 route at 390×844 for Bookings, Settings, Process, Issue, Finance, Booking More, Client, Calendar, More, SMS and every Settings tab.

## Production isolation
V2.1 adds a parallel route, manifest, CSS override, targeted QA script and documentation only. Production `/admin/bronuvannia/` is not intentionally changed.

## Canonical regression/build
- `npm run qa:static`: **38 PASS / 0 FAIL · FULL QA GREEN**.
- `npm run verify:artifact`: deploy artifact verified, release **4.2.47 / 4247**.
- Production PWA comparison against clean v4.2.47 baseline: **7 / 7 SHA-256 identical** (`admin/bronuvannia`, production CSS/JS, manifest, service worker, address runtime).
- Full canonical `qa:browser` was started; the local execution window ended before the complete suite finished. All completed suites in that run were PASS and the log contained no FAIL before timeout. V2.1-specific browser coverage is the completed **180/180** targeted suite above.
