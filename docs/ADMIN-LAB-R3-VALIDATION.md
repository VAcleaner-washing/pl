# R3 candidate — 4.3.49 / 4349

Scope: shared form safety/accessibility in the isolated LAB. Production main remains
4.3.46/4346; the stable branch, checksum manifest and exact Pages archive are retained.

Implemented and tested on the real synthetic adapter:

- Dirty close/keep/discard for booking, selected file, unnamed confirmation message,
  status correction, campaign, issue, finance, extension, client, catalog, expense and settings.
- Unchanged initial forms close without warnings. Native automatic time-window setup
  is distinguished from actual field edits. No automatic draft saving is introduced.
- Pending save blocks closing; editable controls are temporarily inert, preserving
  successful FormData inclusion. Rejected saves retain data and remain dirty.
- Settings emit a UI-only successful-form event after acknowledgement. It clears the
  LAB dirty baseline only after a successful response, never when a save is rejected.
- Expense save/archive refresh renders Finances only while that section remains active.
  The 700ms latency regression reproduced a Settings form being replaced before the fix.
- More closes after action, outside click and Escape, returning focus to its visible
  summary. This fixes the R2 Chromium CI job 129936212132, which failed because a
  dismissed cancellation left the dropdown covering Details. No forced clicks were used.
- Native confirmation dialog, descriptive errors, modal background inertness, keyboard
  summary access, user zoom, 16px mobile fields and 44px touch targets.
- Existing visualViewport keyboard variables constrain the LAB modal; pinch zoom is
  not treated as keyboard layout. Physical iOS behavior remains a separate gate.

Focused tests: 77/77 Chromium and 77/77 WebKit at 390/440/1440px. These include the
standalone iPhone 17 Pro Max descriptor, repeated open/close cleanup, unload warning,
failed/successful settings navigation and simulated keyboard viewport bounds.

Canonical static/full browser and independent WebKit gates validate this candidate
separately. Do not infer a green workflow from a commit, merge, local build or this file;
consult the actual candidate Actions runs and retained QA evidence.

The LAB contains only synthetic browser-local records. Pricing.mjs, settlement.mjs and
the canonical catalog remain byte-identical to stable46. Normal Pages does not load LAB
controllers/styles/adapter. There are no real messages, uploads or production data writes.

Limits: real keyboard/safe areas, OS-level dismissal, VoiceOver and private PWA hosting
sign-in still require physical iPhone acceptance. beforeunload is best effort. There is
no automatic draft recovery promise. Live database/RLS/RPC/availability and transactional
partial/unknown outcomes require the separate staging integration stage.
