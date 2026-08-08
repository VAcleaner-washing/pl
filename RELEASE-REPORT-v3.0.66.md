# VAcleaner v3.0.66 — GA4 CONVERSIONS & LOCAL SEO

## База
- VAcleaner v3.0.65 — PUBLIC CARE & RETURN RULES.

## Зміни
- Успішна заявка після позитивної відповіді `vacleaner-booking-v5` пушить `generate_lead` у `dataLayer` з `currency=UAH`, реальною орієнтовною сумою, кодом бронювання та кодом комплекту.
- Instagram, Telegram і `tel:` приведені до єдиної події `contact_click` з `contact_method` та UTM attribution.
- Додано `booking_started` при першій реальній взаємодії з формою.
- LocalBusiness JSON-LD доповнено address, geo, openingHoursSpecification, logo та image на індексованих public-сторінках.
- `/faq/` отримав `FAQPage` JSON-LD для 15 видимих FAQ.
- 4 сторінки рішень отримали `Service + Offer`; `/komplekty/` — `Service + OfferCatalog` із 5 пропозиціями.
- Booking anchors отримали `scroll-margin-top`; mobile step changes прокручують форму під fixed header/progress.
- 404/noindex сторінки очищено від LocalBusiness schema.

## Не змінювалося
- Supabase schema/RLS/Edge Functions.
- Адмінська бізнес-логіка та PWA shell.
- Тарифи, залоги, знижки, settlement.
- VA HOME.
