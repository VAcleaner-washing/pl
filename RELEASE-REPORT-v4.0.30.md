# VAcleaner v4.0.30

- Adds a visible **«Вийти з акаунта»** action to the mobile PWA **«Ще»** menu.
- Logs out only the current device session and leaves the other administrator signed in.
- Always clears the remembered local alias/session and returns to the login screen, including when the phone is offline.
- Keeps the push subscription itself active; the next login re-synchronizes it with `vacleaner` or `annanevidoma`.
- Preserves the v4.0.29 mobile Bookings layout, desktop layout, and production booking logic.
