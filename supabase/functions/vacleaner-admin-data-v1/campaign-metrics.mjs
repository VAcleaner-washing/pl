// Read-only reporting: money, redemption and promo activation rules live elsewhere.
const SMS_ELIGIBLE = new Set(['submitted', 'sent', 'delivered']);
const phoneOf = value => {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('0')) return '+38' + digits;
  return digits.length === 12 && digits.startsWith('380') ? '+' + digits : '';
};
const timestamp = value => {
  // Database timestamps have an explicit zone. Never use the server's local
  // zone, a date-only guess, recipient.updated_at or queue creation as sent time.
  if (typeof value !== 'string' || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const optionalTimestamp = value => value === null || value === undefined || value === ''
  ? {value: null, unknown: false} : {value: timestamp(value), unknown: timestamp(value) === null};

export function campaignConversionMetrics(campaign, {
  codes = [], redemptions = [], dispatches = [], recipients = [], coverageComplete = true,
} = {}) {
  const id = String(campaign.id || '');
  const assigned = codes.filter(row => String(row.campaign_id || '') === id);
  const used = redemptions.filter(row => String(row.campaign_id || '') === id);
  const messages = dispatches.filter(row => String(row.campaign_id || '') === id);
  // A failed/draft SMS attempt is still evidence that this is an SMS campaign;
  // do not silently substitute an assigned-code conversion for its empty cohort.
  const hasSmsDispatch = messages.length > 0;
  const basis = hasSmsDispatch ? 'sms' : 'codes';
  const byDispatch = new Map(messages.map(row => [String(row.id), row]));
  const byCode = new Map(assigned.map(row => [String(row.id), row]));
  const cohort = new Map();
  let invalidRecipients = 0;
  const add = (phone, at) => {
    let contact = cohort.get(phone);
    if (!contact) {contact = {known: [], unknown: false}; cohort.set(phone, contact);}
    if (at === null) contact.unknown = true;
    else contact.known.push(at);
  };
  if (hasSmsDispatch) {
    for (const recipient of recipients) {
      const message = byDispatch.get(String(recipient.dispatch_id || ''));
      if (!message || !SMS_ELIGIBLE.has(String(recipient.status || ''))) continue;
      const phone = phoneOf(recipient.customer_phone);
      if (!phone) {invalidRecipients++; continue;}
      add(phone, timestamp(message.sent_at));
    }
  } else {
    // Lifetime assigned-client cohort must survive redemption, expiry and an
    // administrator disabling a code. This is assignment, not activation proof.
    for (const code of assigned) {
      const phone = phoneOf(code.customer_phone);
      if (phone) add(phone, timestamp(code.created_at));
    }
  }
  const converted = new Set();
  let attributedUses = 0, unknownUses = 0;
  const startsAt = timestamp(campaign.starts_at);
  // issuance_ends_at closes issuing new personal bonuses. Activation extends
  // the actual campaign ends_at when required; redemption honors ends_at and
  // the code's stored expiry. Do not substitute an invented N-day window.
  const campaignEnd = optionalTimestamp(campaign.ends_at);
  for (const use of used) {
    const phone = phoneOf(use.customer_phone), contact = cohort.get(phone);
    if (!contact) continue; // Actual uses outside this cohort remain usedCount.
    const at = timestamp(use.created_at), code = byCode.get(String(use.promo_code_id || ''));
    if (at === null || startsAt === null || !code) {unknownUses++; continue;}
    if (at < startsAt) continue;
    const assignedPhone = phoneOf(code.customer_phone);
    if (assignedPhone && assignedPhone !== phone) continue;
    const created = timestamp(code.created_at), expires = optionalTimestamp(code.expires_at);
    if (created === null || expires.unknown || campaignEnd.unknown) {unknownUses++; continue;}
    if (at < created || expires.value !== null && at >= expires.value ||
        campaignEnd.value !== null && at >= campaignEnd.value) continue;
    if (basis === 'sms' && !contact.known.some(sent => sent <= at)) {
      if (contact.unknown) unknownUses++;
      continue;
    }
    converted.add(phone);
    attributedUses++;
  }
  const unknownRecipients = invalidRecipients + [...cohort.values()]
    .filter(contact => contact.unknown && !contact.known.length).length;
  const complete = coverageComplete === true && !unknownRecipients && !unknownUses;
  const base = cohort.size;
  const reason = coverageComplete !== true ? 'incomplete_rows'
    : !complete ? 'missing_timestamps'
    : !base ? (hasSmsDispatch ? 'no_eligible_recipients' : 'no_assigned_customers') : null;
  return {
    audienceSize: base,
    smsRecipientCount: hasSmsDispatch ? base : 0,
    smsUsedCount: hasSmsDispatch ? attributedUses : 0,
    conversionBasis: basis,
    conversionBase: base,
    conversionUses: converted.size,
    conversion: complete && base ? Math.round(converted.size / base * 100) : null,
    conversionDefinition: 'distinct_customers',
    conversionTimeBasis: hasSmsDispatch ? 'dispatch_sent_at' : 'code_created_at',
    conversionComplete: complete,
    conversionReason: reason,
    conversionUnknownRecipients: unknownRecipients,
    conversionUnknownUses: unknownUses,
  };
}

export function campaignQueryCoverage(rows, total) {
  const loaded = Array.isArray(rows) ? rows.length : 0;
  return {loaded, total: Number.isInteger(total) && total >= 0 ? total : null,
    complete: Number.isInteger(total) && total === loaded};
}
