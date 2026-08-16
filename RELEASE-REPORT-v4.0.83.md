# VAcleaner v4.0.83 — SMS WORKFLOW UX REBUILD

## Scope
- Frontend UX rebuild of the SMS campaign modal.
- No change to SendPulse transport, promo-code rules, consent rules, cooldown, or booking logic.

## New workflow
1. Recipients — audience, sorting, bulk select, primary scrolling client list.
2. Message — SMS copy and explicit route choice.
3. Review — recipient/SMS summary, legacy attestation when required, SendPulse preflight, then real send.

## UX changes
- SMS journal moved out of the main flow into a dedicated header action.
- International route is never auto-selected while the national Sender ID is unavailable.
- Legacy attestation appears only when selected recipients require it and only at final review.
- Recipient list owns the working viewport instead of sharing height with message/history blocks.
- Correct Ukrainian recipient grammar in CTA (1 одержувачу / N одержувачам).
- Desktop uses a wide three-step workspace; mobile uses the same flow with compact controls and safe-area footer.

## QA
- SMS regression suite extended for the three-step workflow.
- PWA browser QA extended to verify recipient-first flow, explicit route choice, final review, legacy attestation and separate history mode.

## Final verification
- Build check: 348/348 file checks.
- SMS regression: 65/65.
- PWA static: 82 assertions.
- CSS architecture: PASS.
- Full browser PWA/desktop UX QA: 753/753 PASS.
- Pages build: PASS.
