# VAcleaner v4.0.26

Release date: 2026-08-11  
Build: 4026

## Changes

- Added peer-only Web Push notifications when an administrator creates a booking.
- Added peer-only Web Push notifications when a booking becomes `issued` or `completed` (returned).
- The initiating administrator is excluded by login alias, with stable device ID as a fallback for existing subscriptions.
- Push events are validated against the authoritative booking record and deep-link to the changed booking.
- Fixed the Analytics visual overlap in the `Сплячі клієнти` block: the total now occupies a full row and the 180–365 / 365+ day segments use two safe columns below it.
- Added a regression contract and CI geometry assertion for the sleeping-client layout.

## Production backend

- Applied migration `vacleaner_push_admin_alias`.
- Deployed `vacleaner-push` v3 with JWT verification enabled.
- Deployed `vacleaner-admin-bookings-v3` v16 with JWT verification enabled.
- Verified the new column/index and both existing active push subscriptions.

## Verification

- JavaScript syntax checks passed.
- Build validation passed: 307 file checks.
- Peer-admin push / analytics layout contract passed: 26 checks.
- Process metadata / push copy passed: 29 checks.
- Issue workflow passed: 12 checks.
- Stabilization contract passed: 159 assertions.
- Public visual contract passed: 160 checks.
- GitHub Pages artifact build completed successfully.

The local Playwright browser executable could not be downloaded in the restricted workspace. The new geometry assertion is included in the existing PWA browser suite and will run in GitHub Actions.
