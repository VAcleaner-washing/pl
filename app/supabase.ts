import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = "https://yweluzclearwrazdkahu.supabase.co";
export const supabasePublishableKey = "sb_publishable_-UdAKDf5jzIP6N9rBp927g_VhyJKeog";

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
