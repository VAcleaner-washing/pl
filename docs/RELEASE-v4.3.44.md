# v4.3.44 / build 4344 — PWA idle rendering

The mobile admin's presentation observers rewrote identical text and alert markup while idle. Two Upcoming helpers also moved status nodes in opposite directions, triggering repeated full enhancement scans. Detail finance action normalization recreated text even when the label was already correct.

Make those updates conditional and retain the approved final status placement. Keep observers and canonical data/action handlers intact so newly mounted UI, live refresh and viewport changes still update normally.

Add a whole-admin idle regression against shipped assets, with representative synthetic data (414 bookings, 322 customers, 9 expenses and 3 campaigns), all ten views and core modals in Chromium/WebKit. Existing cold/warm startup, actual worker lifecycle, offline, finance, booking and session gates remain required.

No backend deployment, schema/pricing change, live business-data writes or VA HOME changes. UI timing and idle-work measurements are laboratory observations; physical iPhone battery savings are not claimed. Baseline: e8506c576be090e4d496e0757cf592029c4430bb / build 4343.
