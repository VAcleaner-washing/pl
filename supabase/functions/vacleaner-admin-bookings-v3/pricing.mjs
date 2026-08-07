export function discountInfo(body = {}, rawBase = 0, existingExtras = {}) {
  const base = Math.max(0, Number(rawBase) || 0);
  const hasManualFlag = Object.prototype.hasOwnProperty.call(body || {}, 'discount10');
  const existingManual = existingExtras?.discount?.source === 'manual' && Number(existingExtras?.discount?.percent || 0) === 10;
  const manual = hasManualFlag ? body.discount10 === true : existingManual;

  const existingLoyalty = Number(existingExtras?.loyalty?.percent || 0);
  const requestedLoyalty = Number(body?.loyaltyPercent);
  const loyaltyPercent = [0, 5, 10].includes(requestedLoyalty) ? requestedLoyalty : ([0, 5, 10].includes(existingLoyalty) ? existingLoyalty : 0);
  const loyaltyAmount = Math.round(base * loyaltyPercent / 100);

  const promo = existingExtras?.promo && existingExtras?.discount?.source === 'promo' ? existingExtras.promo : null;
  const promoType = promo?.discount_type === 'fixed' ? 'fixed' : 'percent';
  const promoValue = Math.max(0, Number(promo?.discount_value || 0));
  const promoAmount = promo
    ? Math.min(base, promoType === 'fixed' ? Math.round(promoValue) : Math.round(base * Math.min(100, promoValue) / 100))
    : 0;

  if (manual) {
    const amount = Math.round(base * 10 / 100);
    return { percent: 10, amount, baseAmount: Math.max(0, base - amount), source: 'manual', loyaltyPercent };
  }
  if (promoAmount > loyaltyAmount) {
    return { percent: promoType === 'percent' ? promoValue : 0, amount: promoAmount, baseAmount: Math.max(0, base - promoAmount), source: 'promo', loyaltyPercent };
  }
  return {
    percent: loyaltyPercent,
    amount: loyaltyAmount,
    baseAmount: Math.max(0, base - loyaltyAmount),
    source: loyaltyPercent ? 'loyalty' : 'none',
    loyaltyPercent,
  };
}
