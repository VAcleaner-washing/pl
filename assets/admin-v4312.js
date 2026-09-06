/* VAcleaner v4.3.12 — runtime helper for admin flex logistics.
   The booking form owns its canonical hidden fulfillment field and the two
   independent logistics controls. Do not replace that field at runtime: doing
   so drops listeners bound by admin-v250.js and can collapse one-leg choices
   back into the legacy all-or-nothing delivery model. */

window.deliveryTripMultiplierForBooking = function deliveryTripMultiplierForBooking(booking){
  const stored = Number(booking?.extras?.delivery?.trip_multiplier);
  if ([0, 2, 4].includes(stored)) return stored;
  const legs = Number(booking?.extras?.delivery?.legs);
  return legs === 1 ? 2 : legs === 0 ? 0 : 4;
};
