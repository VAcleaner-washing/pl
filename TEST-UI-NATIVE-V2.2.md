# VAcleaner · Native UI V2.2 Stabilization Test

Routes:
- Production: `/admin/bronuvannia/`
- Native V2.1: `/admin/bronuvannia-native-v21/`
- Native V2.2: `/admin/bronuvannia-native-v22/`

V2.2 is a stabilization pass over the approved Native direction. It does not fork business logic or Supabase contracts.

## V2.2 design contract
- Settings are mobile settings, not desktop forms squeezed into a phone: one workspace surface, separator-based sections, one control shell.
- Slot editing is compact `Початок — Кінець`; deposit/delivery/equipment rows use flat separators.
- Active booking cards keep one clear primary action; completed/cancelled cards become compact without hiding financial truth.
- Booking `Ще` remains the V2 action sheet.
- Detail does not repeat the date/time block already shown in its hero.
- Process/issue/finance flows use section separators instead of card-inside-card stacks.
- Story bonus keeps one card per actual selectable choice; outer decoration stays flat.
- Bottom navigation and fixed modal footers must never cover actionable controls.
- Production route, production CSS/JS, Supabase, pricing, deposits, delivery, referral and availability rules remain unchanged.
