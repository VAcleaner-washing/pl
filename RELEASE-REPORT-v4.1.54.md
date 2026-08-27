# VAcleaner v4.1.54 — Address search & local zone correction

Released: 2026-08-27

## Final delivery rules

- Poltava, Rozsoshentsi, Shcherbani and Horbanivka: 250 UAH.
- Other suburbs: from 350 UAH under the existing distance rule.
- Unresolved addresses: manager confirms the tariff before prepayment.

## Address search

- The Photon `lang=uk` HTTP 400 repair from v4.1.53 remains active.
- Native Ukrainian OpenStreetMap names remain enabled.
- `Перспективна 2` resolves to Rozsoshentsi and receives the 250 UAH local-zone tariff.

## Consistency

- Public booking, server estimate, admin backend, settings defaults, delivery copy and SEO copy use the same four-settlement local zone.

## QA

- 59/59 Node regression suites passed.
- 423 build checks passed.
- 402/402 public SEO checks passed.
