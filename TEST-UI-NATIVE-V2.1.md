# VAcleaner · Native UI V2.1 Test

Routes:
- Production: `/admin/bronuvannia/`
- Native V1: `/admin/bronuvannia-native-test/`
- Native V2: `/admin/bronuvannia-native-v2/`
- Native V2.1: `/admin/bronuvannia-native-v21/`

V2.1 is a component-cleanup pass over V2. It does not fork business logic. The new route loads the V2 presentation plus a V2.1 override layer.

## V2.1 design contract
- One interactive component = one visible shell.
- Search has one capsule; the input inside it has no second border/background.
- Composite amount/packet controls own the border; their inner input stays transparent and borderless.
- Checkbox/radio controls stay 20×20 and never inherit text-input card geometry.
- Settings slot/deposit rows are flatter and no longer read as card-inside-card.
- Booking actions preserve one primary CTA and compact secondary actions; `Ще` opens a real action sheet.
- Preliminary/final settlement removes the outer decorative Story card around inner choices and keeps one card per actual choice.
- Settings save actions can scroll fully above bottom navigation.
- Production route, production CSS/JS, Supabase and financial/business contracts are unchanged.
