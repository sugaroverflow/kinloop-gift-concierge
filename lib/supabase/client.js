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

export async function signInWithEmailPassword({ client = getBrowserSupabaseClient(), email = "", password = "" } = {}) {
  const cleanEmail = email.trim();
  if (!client) return { ok: false, error: "Sign-in is not configured for this environment." };
  if (!cleanEmail || !password) return { ok: false, error: "Enter an email and password." };

  const { data, error } = await client.auth.signInWithPassword({
    email: cleanEmail,
    password
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, session: data.session, user: data.user };
}

export async function signOutOfSupabase({ client = getBrowserSupabaseClient() } = {}) {
  if (!client) return { ok: true };
  const { error } = await client.auth.signOut();
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
