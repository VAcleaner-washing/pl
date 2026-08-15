# VAcleaner v4.0.57 — PUBLIC CLIENT COPY FINALIZATION

## Scope
Final client-facing naming pass for public booking, `/komplekty/` and public quiz. Admin operational labels are intentionally unchanged.

## Public booking
- `Kärcher Puzzi 8/1` — `Миючий пилосос · дивани, матраци, килими`
- `Kärcher SC 2` — `Очищення парою · кухня, ванна, плитка, шви`
- `Робот для вікон` — `Вікна, дзеркала, скляні поверхні`
- `Глибоке очищення диванів і матраців`
- `Дивани + вікна`
- `Дивани + кухня та ванна`
- `Генеральне прибирання`
- `Ідеальні вікна`
- `HOME RESET`

Booking catalogue contains exactly 3 standalone items + 6 packages. No duplicate `Дивани + вікна` card remains.

## Public package page
The same six package names are used on `/komplekty/`. Card copy was adjusted away from abstract `текстиль` wording where the customer task is clearer as sofas, mattresses and upholstered furniture.

Structured data uses the same final public package names.

## Runtime / hydration hardening
- Public labels are pinned independently from the shared backend catalog labels.
- Async `vacleaner-settings` refresh cannot restore older public short labels.
- Legacy names stay accepted as aliases for old links/data.
- `stamp` remains idempotent and no longer creates a duplicate `Дивани + вікна` booking card.
- Hydrated HTML/RSC/chunks use the final public names.

## Admin isolation
Admin display labels were not changed. The operational map remains:
- `Puzzi + Jimmy`
- `Puzzi + робот`
- `Puzzi + SC 2`
- `Puzzi + SC 2 + Jimmy`
- `SC 2 + робот`
- `HOME RESET`

The shared backend catalog labels were also left unchanged; the new wording is a public presentation layer.

## Package price alignment
Longer final titles were checked against the existing aligned-price design. Additional responsive reservation zones keep price baselines aligned at 1648 / 1440 / 1280 / 1200 / 1199 / 1051 px. Local Chromium geometry showed max row delta <= 0.03 px.

## QA
- `npm run check`: 318 PASS
- package language: PASS
- static copy integrity: PASS
- public visual contract: 191/191 PASS
- public SEO: 295/295 PASS
- PWA visual QA: 651/651 PASS
- deposit / slots: 46 PASS
- stabilization: 171 PASS
- Smart Guide logic: 13/13 PASS
- booking CTA stability: 14 PASS
- Pages artifact: 204 files

Full local `test:e2e` cannot navigate to the temporary 127.0.0.1 server in this environment (`ERR_BLOCKED_BY_ADMINISTRATOR`). GitHub Actions remains the final full browser-run confirmation after upload.
