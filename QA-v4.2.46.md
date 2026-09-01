# VAcleaner v4.2.46 — QA

Scope: financial summary clarification only.

Acceptance: non-zero `Додатково` shows a muted breakdown under the label using the same hierarchy as `Отримано разом`. Example fixture: `Насадки 200 грн + Засоби 250 грн` for a 450 грн additional total. Zero extras render no breakdown. Pricing and backend contracts are unchanged.

Release gates: canonical `qa:static` and `qa:browser` must both be GREEN.
