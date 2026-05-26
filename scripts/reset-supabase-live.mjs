import { createClient } from "@supabase/supabase-js";
import { getSupabasePublishableKey } from "../lib/supabase/client.js";

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_TEST_EMAIL",
  "SUPABASE_TEST_PASSWORD"
];

const missing = required.filter((key) => !process.env[key]);
if (!getSupabasePublishableKey()) {
  missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
}

if (missing.length > 0) {
  console.error(`Missing required Supabase reset env vars: ${missing.join(", ")}`);
  process.exit(1);
}

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

const userId = signIn.data.user?.id;
if (!userId) {
  console.error("Supabase auth succeeded without a user id.");
  process.exit(1);
}

const dryRun = process.env.SUPABASE_LIVE_RESET !== "1";
const eventTypes = ["signal_imported", "gift_options_generated", "gift_approved", "reminder_checked", "reminder_marked_sent"];

const before = await countResettableRows();
if (dryRun) {
  console.log("Dry run only. Set SUPABASE_LIVE_RESET=1 to delete/reset these rows.");
  printCounts(before);
  process.exit(0);
}

const approvals = await supabase
  .from("approvals")
  .delete()
  .eq("user_id", userId)
  .in("status", ["approved", "deferred"])
  .select("id");

const audits = await supabase
  .from("audit_events")
  .delete()
  .eq("user_id", userId)
  .in("event_type", eventTypes)
  .select("id");

const reminders = await supabase
  .from("reminders")
  .update({ state: "brief_ready", due_at: null, channel: "web" })
  .eq("user_id", userId)
  .select("id");

for (const [label, result] of [
  ["approvals", approvals],
  ["audit_events", audits],
  ["reminders", reminders]
]) {
  if (result.error) {
    console.error(`${label} reset failed: ${result.error.message}`);
    process.exit(1);
  }
}

console.log("Supabase live Kinloop rows reset.");
console.log(`approvals_deleted=${approvals.data.length}`);
console.log(`audit_events_deleted=${audits.data.length}`);
console.log(`reminders_reset=${reminders.data.length}`);

async function countResettableRows() {
  const [approvals, audits, reminders] = await Promise.all([
    supabase.from("approvals").select("id").eq("user_id", userId).in("status", ["approved", "deferred"]),
    supabase.from("audit_events").select("id").eq("user_id", userId).in("event_type", eventTypes),
    supabase.from("reminders").select("id, state").eq("user_id", userId)
  ]);

  for (const [label, result] of [
    ["approvals", approvals],
    ["audit_events", audits],
    ["reminders", reminders]
  ]) {
    if (result.error) {
      console.error(`${label} query failed: ${result.error.message}`);
      process.exit(1);
    }
  }

  return {
    approvals: approvals.data.length,
    audits: audits.data.length,
    reminders: reminders.data.length
  };
}

function printCounts(counts) {
  console.log(`approvals=${counts.approvals}`);
  console.log(`audit_events=${counts.audits}`);
  console.log(`reminders=${counts.reminders}`);
}
