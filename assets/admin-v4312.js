/* VAcleaner v4.3.12 — runtime compatibility guard for admin flex logistics.
   Keeps the new two-leg UI while preserving legacy QA/integration selectors,
   and exposes the delivery mileage helper at global scope for finance/renderers. */

window.deliveryTripMultiplierForBooking = function deliveryTripMultiplierForBooking(booking){
  const stored = Number(booking?.extras?.delivery?.trip_multiplier);
  if ([0, 2, 4].includes(stored)) return stored;
  const legs = Number(booking?.extras?.delivery?.legs);
  return legs === 1 ? 2 : legs === 0 ? 0 : 4;
};

(function installAdminFulfillmentCompatibility(){
  const upgrade = (form) => {
    if (!form || form.dataset.v4312FulfillmentCompat === '1') return;
    const legacyInput = form.querySelector('input[type="hidden"][name="fulfillment"]');
    if (!legacyInput) return;

    const select = document.createElement('select');
    select.name = 'fulfillment';
    select.hidden = true;
    select.setAttribute('aria-hidden', 'true');
    select.tabIndex = -1;
    select.innerHTML = '<option value="pickup">Самовивіз</option><option value="delivery">Доставка</option>';
    select.value = legacyInput.value === 'delivery' ? 'delivery' : 'pickup';
    select.style.appearance = 'none';
    select.style.colorScheme = 'dark';
    legacyInput.replaceWith(select);

    const setLogisticsFromLegacy = () => {
      const outbound = form.querySelector(`[data-logistics-kind="outbound"][data-logistics-value="${select.value === 'delivery' ? 'delivery' : 'pickup'}"]`);
      const returned = form.querySelector(`[data-logistics-kind="return"][data-logistics-value="${select.value === 'delivery' ? 'pickup' : 'return_to_location'}"]`);
      outbound?.click();
      returned?.click();
    };

    select.addEventListener('change', setLogisticsFromLegacy);
    form.dataset.v4312FulfillmentCompat = '1';
  };

  const scan = () => upgrade(document.querySelector('#bookingForm'));
  new MutationObserver(scan).observe(document.documentElement, {subtree:true, childList:true});
  scan();
})();
