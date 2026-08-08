# VAcleaner v3.0.50 — MOBILE UX + HOME RESET + STATUS CORRECTION

Release date: 2026-08-08  
Build: 3050

## Scope

This release consolidates the mobile/PWA UI repairs requested after v3.0.49, fixes public-site click interception and mobile menu layering, adds the HOME RESET VA HOME gift communication, and adds a protected admin status-correction workflow.

VA HOME was used only as a UI/PWA reference. No VA HOME tables, policies, functions, business logic, or content were modified.

## PWA mobile navigation

### Icons

The root mobile navigation introduced in v3.0.49 moved the SVG icons outside the desktop `.nav` styling scope. As a result, Safari could render SVG paths with the default black fill.

v3.0.50 explicitly applies `fill:none`, `stroke:currentColor`, stroke width, caps and joins to `.mobile-nav svg`, so the icons inherit the navigation text color correctly.

### Geometry

The mobile bottom-nav geometry now follows the VA HOME contract more closely:

- root-level `position: fixed` navigation;
- `bottom: 0`;
- 66px base navigation height plus safe-area inset;
- VA HOME-style compact spacing;
- raised circular central `+ Нове` action;
- desktop sidebar remains a separate element.

Local PWA QA verifies the nav bottom equals the emulated viewport bottom at 320 / 390 / 430 and across the keyboard regression. A real iPhone/PWA confirmation is still required before treating physical-device behavior as proven.

## Admin `Ще`

The previous large sheet/backdrop was replaced with a VA HOME-style compact popover above the bottom navigation:

- two-column compact grid;
- no full-screen backdrop;
- no oversized header/close block;
- closes when tapping outside or selecting an item;
- contains Техніка / Клієнти / Кампанії / Аналітика / Хімія / Налаштування;
- `Ще` active-state remains isolated from the primary mobile tabs.

## Public mobile navigation

The public hamburger menu was sitting below the sticky booking CTA and used a translucent layer, causing the underlying page and bottom CTA to remain visible through/over the menu.

v3.0.50:

- makes the mobile menu opaque;
- raises its stacking order above page content;
- hides the sticky booking CTA while the menu is open;
- locks page scrolling while open;
- uses a cleaner mobile list layout inspired by the stable VA HOME behavior.

## Public CTA clickability

The decorative `.final-cta-orbit` circles in the repeated “Почнімо з вашої задачі” CTA were absolute layers without disabled pointer events. They could intercept taps/clicks before they reached the real buttons.

v3.0.50 sets the decorative orbit to `pointer-events:none` and keeps the real CTA content above it, restoring interaction for the repeated final CTA blocks.

## HOME RESET + VA HOME gift

HOME RESET now communicates the included gift:

**У подарунок — будь-який аромадифузор VA HOME з колекції Entry.**

Entry collection link:
`https://vahome.com.ua/catalog?collection=entry`

The message is added to:

- HOME RESET package presentation on the main site;
- `/komplekty/`;
- public booking product selection;
- hydrated package/booking UI via the public enhancement script;
- shared VAcleaner configuration description.

## Manual booking status correction

Admins can now correct an accidentally selected booking status without creating a new booking.

Example:

- `Видана → Підтверджена` when issue was pressed by mistake but the equipment was not actually handed over.

The admin UI exposes a dedicated `Виправити статус` action with only controlled valid targets. It does not expose unrestricted arbitrary status mutation.

### Server-side protection

A dedicated Edge Function was deployed to production:

- `vacleaner-status-correction-v1`
- version: 1
- status: ACTIVE
- JWT verification: enabled

The function:

- validates the Supabase JWT;
- verifies the `admin_users` whitelist;
- checks the current booking and resource inventory;
- uses the existing reservation RPC to prevent equipment conflicts;
- blocks unsafe transitions;
- preserves booking amounts/history rather than recreating the booking;
- resets issue/deposit flags when `Видана → Підтверджена`, because the physical issue did not occur;
- records the admin correction in the booking audit trail/source;
- allows an optional reason to be saved with the booking note.

Completion remains a settlement workflow; manual correction cannot freely jump a booking into `Повернена/Completed`.

## Verification

Latest local checks after the final source edits:

- Build/static checks: **358 passed**
- PWA visual suite: **487 / 487 passed**
- Stabilization: **139 passed**
- Rental / deposit policy: **46 passed**
- Finance: **19 passed**
- Retention / campaigns: **15 passed**
- Desktop density: **60 / 60 passed**
- Final desktop visual: **232 / 232 passed**
- Backend inventory: **PASS**
- CSS architecture: **PASS**

These are local/emulated checks. The new status-correction backend is verified deployed and ACTIVE. The v3.0.50 frontend is packaged in this release; production frontend deployment must still be verified separately after upload/GitHub Actions.
