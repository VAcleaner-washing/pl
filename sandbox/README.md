# VAcleaner Admin LAB

Separate, synthetic, browser-local test environment. Built only by `npm run build:lab`.
Never upload this directory or its generated artifact to the VAcleaner Pages project.

The adapter loads before the canonical admin application. The LAB build removes production
endpoints and keys, restricts network connections to its own origin and accepts only a
closed list of simulated API operations. Unsupported operations return an explicit error.
There is no live authentication, Supabase connection, SMS, push subscription or remote upload.

Pricing and settlement pure functions are copied unchanged from the application. Local
simulation does not certify database transactions, remote availability, referrals, campaign
dispatch or delivery geocoding. Those require a later staging integration gate.

Test records persist only in this browser's localStorage. Reset affects this LAB only.
Do not enter real names, telephone numbers, identity documents or financial records here.
