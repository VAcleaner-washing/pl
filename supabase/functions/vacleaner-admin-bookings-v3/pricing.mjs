export function discountInfo(body = {}, rawBase = 0, existingExtras = {}) {
  const base = Math.max(0, Number(rawBase) || 0);
  const hasManualFlag = Object.prototype.hasOwnProperty.call(body || {}, 'discount10');
  const existingManual = existingExtras?.discount?.source === 'manual' && Number(existingExtras?.discount?.percent || 0) === 10;
  const manual = hasManualFlag ? body.discount10 === true : existingManual;
  const existingLoyalty = Number(existingExtras?.loyalty?.percent || 0);
  const requestedLoyalty = Number(body?.loyaltyPercent);
  const loyaltyPercent = [0, 5, 10].includes(requestedLoyalty) ? requestedLoyalty : ([0, 5, 10].includes(existingLoyalty) ? existingLoyalty : 0);
  const percent = manual ? 10 : loyaltyPercent;
  const amount = Math.round(base * percent / 100);
  return {
    percent,
    amount,
    baseAmount: Math.max(0, base - amount),
    source: manual ? 'manual' : percent ? 'loyalty' : 'none',
    loyaltyPercent,
  };
}
