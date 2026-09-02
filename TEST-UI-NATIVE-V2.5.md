# VAcleaner · Native UI V2.5 Final Polish RC

Route: `/admin/bronuvannia-native-v25/`

V2.5 is the final visual/functional polish pass over V2.4. It does not fork production business logic.

## Final corrections
- restored the fast operational layout of `Найближчі`: arrow → time → issue/return → today/tomorrow/overdue;
- added document-photo add/replace + view controls in Process using the canonical private document service;
- made the `Вадим` profile card informational so it no longer duplicates Settings navigation;
- corrected RETURN SMS modal density/overflow;
- corrected client segment/sort controls;
- corrected Analytics/Finance period selectors so the right side is never clipped at 320/390/430 px;
- flattened Settings fuel inputs to one visible control shell;
- kept all five Settings tabs reachable without clipped rails;
- kept Detail audit, compact Update and More/status actions.

## Preserved
- all six booking statuses and production action handlers;
- delivery, deposits, finance, availability, campaigns/SMS, referral/RETURN and Supabase behavior;
- production route and production assets;
- V2.5 scoped manifest/SW/deep-link/offline behavior.
