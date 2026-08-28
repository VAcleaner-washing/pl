# VAcleaner v4.2.10 — Referral Telegram phone fallback

- Referral modal now offers Telegram using the required customer phone even when no Telegram username is stored.
- When there is no username, the action is labeled “Telegram · за номером”.
- Instagram/Telegram username remains optional; phone remains the guaranteed fallback contact for Telegram deep link.
- No pricing, delivery, referral reward, campaign, or booking logic changed.

### CI compatibility patch
- Updated the legacy v4.2.1 referral regression assertion to accept the new Telegram-by-phone label introduced in v4.2.10.
- No business logic, pricing, delivery, referral mechanics, or UI behavior changed.
