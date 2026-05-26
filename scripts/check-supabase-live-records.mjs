import { createClient } from "@supabase/supabase-js";
import { getSupabasePublishableKey } from "../lib/supabase/client.js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  getSupabasePublishableKey()
);

const signIn = await supabase.auth.signInWithPassword({
  email: process.env.SUPABASE_TEST_EMAIL,
  password: process.env.SUPABASE_TEST_PASSWORD
});

if (signIn.error) {
  console.error(`Supabase auth failed: ${signIn.error.message}`);
  process.exit(1);
}

const [approvals, audits] = await Promise.all([
  supabase.from("approvals").select("id, status").eq("status", "approved"),
  supabase.from("audit_events").select("id, event_type").eq("event_type", "gift_approved")
]);

for (const [label, result] of [
  ["approvals", approvals],
  ["audit_events", audits]
]) {
  if (result.error) {
    console.error(`${label} query failed: ${result.error.message}`);
    process.exit(1);
  }
}

console.log(`approvals=${approvals.data.length}`);
console.log(`audit_events=${audits.data.length}`);
