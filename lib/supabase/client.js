import { createClient } from "@supabase/supabase-js";

const browserSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const browserSupabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let browserClient = null;

export function getBrowserSupabaseClient() {
  if (!browserSupabaseUrl || !browserSupabasePublishableKey) return null;

  if (!browserClient) {
    browserClient = createClient(browserSupabaseUrl, browserSupabasePublishableKey);
  }

  return browserClient;
}

export function getSupabasePublishableKey(env = process.env) {
  return env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}
