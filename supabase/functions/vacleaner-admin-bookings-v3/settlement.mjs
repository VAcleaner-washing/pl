const cleanInt = (value, max = 100000) => Math.max(0, Math.min(max, Math.floor(Number(value) || 0)));

export function productUsesPuzzi(productCode, catalog, defaultCatalog = {}) {
  const product = catalog?.products?.[productCode] || defaultCatalog?.products?.[productCode];
  return Number(product?.resources?.puzzi || 0) > 0;
}

export function selectedExtrasAmount(extras) {
  if (Array.isArray(extras?.selected_items)) {
    return extras.selected_items.reduce((sum, item) => sum + Math.max(0, Number(item?.price || 0)), 0);
  }
  if (!Array.isArray(extras?.items)) return 0;
  return extras.items.reduce((sum, item) => {
    if (!item || ["carpet_chemistry_kit", "story_mention_bonus"].includes(String(item.code || ""))) return sum;
    const amount = item.amount != null
      ? Number(item.amount)
      : item.price != null
        ? Number(item.price)
        : Number(item.unitPrice || 0) * Number(item.quantity || 1);
    return sum + Math.max(0, amount || 0);
  }, 0);
}

export function settlementFromBooking(current, catalog, defaultCatalog = {}) {
  const currentExtras = current?.extras && typeof current.extras === "object" ? current.extras : {};
  const selectedAmount = selectedExtrasAmount(currentExtras);
  const chemistry = currentExtras.chemistry && typeof currentExtras.chemistry === "object" ? currentExtras.chemistry : {};
  const packetLimit = productUsesPuzzi(String(current?.product_code || ""), catalog, defaultCatalog) ? 8 : 0;
  const usedPackets = cleanInt(chemistry.used_packets, packetLimit);
  const storyMention = packetLimit > 0 && chemistry.story_mention === true;
  const freePackets = storyMention ? Math.min(2, usedPackets) : 0;
  const paidPackets = Math.max(0, usedPackets - freePackets);
  const packetPrice = Math.max(0, Number(catalog?.puzziPacketPrice || defaultCatalog?.puzziPacketPrice || 50));
  const chemistryAmount = paidPackets * packetPrice;
  const totalExtras = selectedAmount + chemistryAmount;
  const totalAmount = Math.max(0, Number(current?.base_amount || 0)) + Math.max(0, Number(current?.delivery_amount || 0)) + totalExtras;
  const prepaymentAmount = current?.prepayment_paid === true ? Math.max(0, Number(current?.prepayment_amount || 200)) : 0;
  const depositAmount = current?.deposit_paid === true ? Math.max(0, Number(current?.deposit_amount || 0)) : 0;
  const receivedAmount = prepaymentAmount + depositAmount;
  const balance = receivedAmount - totalAmount;
  return {
    usedPackets,
    storyMention,
    freePackets,
    paidPackets,
    packetPrice,
    chemistryAmount,
    selectedExtrasAmount: selectedAmount,
    totalExtras,
    prepaymentAmount,
    securityDeposit: Math.max(0, Number(current?.deposit_amount || 0)),
    depositPaid: current?.deposit_paid === true,
    receivedAmount,
    totalAmount,
    refundAmount: Math.max(0, balance),
    dueAmount: Math.max(0, -balance),
  };
}

export function settlementConfirmation(body, finance) {
  const explicit = body?.settlementConfirmed === true;
  const hasLegacyRefund = Object.prototype.hasOwnProperty.call(body || {}, "refundAmount");
  const hasLegacyDue = Object.prototype.hasOwnProperty.call(body || {}, "dueAmount");
  const legacy = body?.returned === true && !explicit && hasLegacyRefund && hasLegacyDue;
  if (body?.returned !== true || (!explicit && !legacy)) {
    return { ok: false, error: "settlement_not_confirmed", legacy: false, refundPaid: false, duePaid: false };
  }
  if (legacy) {
    const legacyRefund = cleanInt(body.refundAmount, 100000);
    const legacyDue = cleanInt(body.dueAmount, 100000);
    if (legacyRefund !== finance.refundAmount || legacyDue !== finance.dueAmount) {
      return { ok: false, error: "settlement_mismatch", legacy: true, refundPaid: false, duePaid: false };
    }
    return {
      ok: true,
      error: "",
      legacy: true,
      refundPaid: finance.refundAmount > 0,
      duePaid: finance.dueAmount > 0,
    };
  }
  const refundPaid = body?.refundPaid === true;
  const duePaid = body?.duePaid === true;
  if (finance.refundAmount > 0 && !refundPaid) {
    return { ok: false, error: "refund_not_confirmed", legacy: false, refundPaid, duePaid };
  }
  if (finance.dueAmount > 0 && !duePaid) {
    return { ok: false, error: "due_not_confirmed", legacy: false, refundPaid, duePaid };
  }
  return { ok: true, error: "", legacy: false, refundPaid, duePaid };
}
