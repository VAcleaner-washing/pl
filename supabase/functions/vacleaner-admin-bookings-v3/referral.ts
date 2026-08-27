const REFERRAL_FRIEND_DISCOUNT = 100;
const REFERRAL_REWARD_AMOUNT = 150;
const REFERRAL_REWARD_DAYS = 150;

const normalizePhone = (value: unknown) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) return `+38${digits}`;
  if (digits.length === 12 && digits.startsWith("380")) return `+${digits}`;
  return "";
};
export const normalizeReferralCode = (value: unknown) => String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 32);

async function codeCandidates(phone: string) {
  const bytes = new TextEncoder().encode(`${phone}:vacleaner-referral-v1`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  const hex = [...new Uint8Array(hash)].map(x => x.toString(16).padStart(2, "0")).join("").toUpperCase();
  return [0, 7, 14, 21].map(offset => `VA-${hex.slice(offset, offset + 7)}`);
}

export async function ensureReferralCode(db: any, phoneValue: unknown) {
  const phone = normalizePhone(phoneValue); if (!phone) return null;
  const { data: existing, error: readError } = await db.from("vacleaner_referral_codes").select("owner_phone,code,active,created_at").eq("owner_phone", phone).maybeSingle();
  if (readError) throw readError;
  if (existing) {
    if (existing.active !== true) {
      const { data, error } = await db.from("vacleaner_referral_codes").update({ active: true, updated_at: new Date().toISOString() }).eq("owner_phone", phone).select("owner_phone,code,active,created_at").single();
      if (error) throw error; return data;
    }
    return existing;
  }
  for (const code of await codeCandidates(phone)) {
    const { data, error } = await db.from("vacleaner_referral_codes").insert({ owner_phone: phone, code, active: true }).select("owner_phone,code,active,created_at").single();
    if (!error && data) return data;
    if (String(error?.code || "") !== "23505") throw error;
    const { data: winner } = await db.from("vacleaner_referral_codes").select("owner_phone,code,active,created_at").eq("owner_phone", phone).maybeSingle();
    if (winner) return winner;
  }
  throw new Error("referral_code_collision");
}

export async function validateFriendReferral(db: any, codeValue: unknown, referredPhoneValue: unknown, completedOrders = 0) {
  const code = normalizeReferralCode(codeValue); if (!code) return null;
  const { data: row, error } = await db.from("vacleaner_referral_codes").select("owner_phone,code,active").ilike("code", code).maybeSingle();
  if (error) throw error;
  if (!row) return null; // not a referral code: caller may continue with normal promo validation
  const referredPhone = normalizePhone(referredPhoneValue), referrerPhone = normalizePhone(row.owner_phone);
  const base = { kind: "referral_friend", code: row.code || code, campaignName: "Приведи друга", campaignType: "referral", discountType: "fixed", discountValue: REFERRAL_FRIEND_DISCOUNT, referrerPhone };
  if (row.active !== true) return { ...base, valid: false, reason: "referral_inactive" };
  if (!referredPhone) return { ...base, valid: false, reason: "phone_required" };
  if (!referrerPhone || referrerPhone === referredPhone) return { ...base, valid: false, reason: "self_referral" };
  if (Number(completedOrders || 0) > 0) return { ...base, valid: false, reason: "referral_first_rental_only" };
  const { count, error: useError } = await db.from("vacleaner_referral_uses").select("id", { count: "exact", head: true }).eq("referred_phone", referredPhone).in("status", ["pending", "completed"]);
  if (useError) throw useError;
  if ((count || 0) > 0) return { ...base, valid: false, reason: "referral_already_used" };
  return { ...base, valid: true };
}

export async function expireReferralRewards(db: any) {
  const now = new Date().toISOString();
  const { error } = await db.from("vacleaner_referral_rewards").update({ status: "expired", updated_at: now }).eq("status", "active").lte("expires_at", now);
  if (error) throw error;
}

export async function availableReferralReward(db: any, phoneValue: unknown) {
  const phone = normalizePhone(phoneValue); if (!phone) return null;
  await expireReferralRewards(db);
  const { data, error } = await db.from("vacleaner_referral_rewards").select("id,referrer_phone,amount,activated_at,expires_at,status").eq("referrer_phone", phone).eq("status", "active").gt("expires_at", new Date().toISOString()).is("used_booking_id", null).order("expires_at", { ascending: true }).limit(1).maybeSingle();
  if (error) throw error; return data || null;
}

export async function claimReferralReward(db: any, rewardId: unknown, bookingId: unknown) {
  if (!rewardId || !bookingId) return null;
  const now = new Date().toISOString();
  const { data, error } = await db.from("vacleaner_referral_rewards").update({ status: "used", used_booking_id: String(bookingId), used_at: now, updated_at: now }).eq("id", String(rewardId)).eq("status", "active").is("used_booking_id", null).gt("expires_at", now).select("id,amount,expires_at").maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("referral_reward_unavailable");
  return data;
}

export async function registerReferralUse(db: any, args: { code: string; referrerPhone: string; referredPhone: string; bookingId: string; }) {
  const referrerPhone = normalizePhone(args.referrerPhone), referredPhone = normalizePhone(args.referredPhone);
  if (!referrerPhone || !referredPhone || referrerPhone === referredPhone) throw new Error("invalid_referral");
  const { data, error } = await db.from("vacleaner_referral_uses").insert({ referral_code: normalizeReferralCode(args.code), referrer_phone: referrerPhone, referred_phone: referredPhone, booking_id: args.bookingId, friend_discount_amount: REFERRAL_FRIEND_DISCOUNT, status: "pending" }).select("*").single();
  if (error) {
    if (String(error.code || "") === "23505") throw new Error("referral_already_used");
    throw error;
  }
  return data;
}

export async function completeReferralForBooking(db: any, booking: any) {
  const customerPhone = normalizePhone(booking?.customer_phone); if (!customerPhone) return { code: null, reward: null };
  const code = await ensureReferralCode(db, customerPhone);
  const { data: use, error: useError } = await db.from("vacleaner_referral_uses").select("*").eq("booking_id", String(booking.id || "")).eq("status", "pending").maybeSingle();
  if (useError) throw useError;
  if (!use) return { code, reward: null };
  const completedAt = String(booking.completed_at || new Date().toISOString());
  const { error: completeError } = await db.from("vacleaner_referral_uses").update({ status: "completed", completed_at: completedAt, cancelled_at: null }).eq("id", use.id).eq("status", "pending");
  if (completeError) throw completeError;
  const expiresAt = new Date(new Date(completedAt).getTime() + REFERRAL_REWARD_DAYS * 86400000).toISOString();
  const rewardRow = { referrer_phone: use.referrer_phone, referred_phone: use.referred_phone, source_booking_id: booking.id, amount: REFERRAL_REWARD_AMOUNT, status: "active", activated_at: completedAt, expires_at: expiresAt, updated_at: completedAt };
  const { data: reward, error: rewardError } = await db.from("vacleaner_referral_rewards").upsert(rewardRow, { onConflict: "source_booking_id", ignoreDuplicates: false }).select("id,amount,status,activated_at,expires_at,referrer_phone,referred_phone").single();
  if (rewardError) throw rewardError;
  return { code, reward };
}

export async function releaseClaimedReferralReward(db: any, bookingIdValue: unknown) {
  const bookingId = String(bookingIdValue || ""); if (!bookingId) return;
  const now = new Date().toISOString();
  const { data: reward, error: rewardReadError } = await db.from("vacleaner_referral_rewards").select("id,expires_at").eq("used_booking_id", bookingId).eq("status", "used").maybeSingle();
  if (rewardReadError) throw rewardReadError;
  if (!reward) return;
  const nextStatus = new Date(String(reward.expires_at)).getTime() > Date.now() ? "active" : "expired";
  const { error } = await db.from("vacleaner_referral_rewards").update({ status: nextStatus, used_booking_id: null, used_at: null, updated_at: now }).eq("id", reward.id).eq("used_booking_id", bookingId);
  if (error) throw error;
}

export async function releaseReferralForCancelledBooking(db: any, bookingIdValue: unknown) {
  const bookingId = String(bookingIdValue || ""); if (!bookingId) return;
  const now = new Date().toISOString();
  const { error: useError } = await db.from("vacleaner_referral_uses").update({ status: "cancelled", cancelled_at: now }).eq("booking_id", bookingId).eq("status", "pending");
  if (useError) throw useError;
  await releaseClaimedReferralReward(db, bookingId);
}

export const referralConstants = { friendDiscount: REFERRAL_FRIEND_DISCOUNT, rewardAmount: REFERRAL_REWARD_AMOUNT, rewardDays: REFERRAL_REWARD_DAYS, expiryReminderDays: 30 };
