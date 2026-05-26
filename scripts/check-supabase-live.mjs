import { createClient } from "@supabase/supabase-js";
import { gifts, recipients } from "../lib/product-data.js";
import { getSupabasePublishableKey } from "../lib/supabase/client.js";
import { recordKinloopApproval } from "../lib/supabase/repository.js";

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
  console.error(`Missing required Supabase live env vars: ${missing.join(", ")}`);
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

const people = await supabase.from("people").select("id, slug, name").eq("slug", "sarah");
if (people.error) {
  console.error(`Supabase people query failed: ${people.error.message}`);
  process.exit(1);
}

if ((people.data || []).length === 0) {
  console.error("Supabase live check found no Sarah row for the test user.");
  process.exit(1);
}

if (process.env.SUPABASE_LIVE_WRITE === "1") {
  const result = await recordKinloopApproval({
    client: supabase,
    option: {
      id: gifts[0].id,
      title: gifts[0].name,
      fitScore: gifts[0].score
    }
  });

  if (result.mode !== "supabase") {
    console.error(`Supabase write check fell back: ${result.fallbackReason || "unknown reason"}`);
    process.exit(1);
  }
}

if (process.env.SUPABASE_OTHER_EMAIL && process.env.SUPABASE_OTHER_PASSWORD) {
  const other = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    getSupabasePublishableKey()
  );
  const otherSignIn = await other.auth.signInWithPassword({
    email: process.env.SUPABASE_OTHER_EMAIL,
    password: process.env.SUPABASE_OTHER_PASSWORD
  });

  if (otherSignIn.error) {
    console.error(`Other-user Supabase auth failed: ${otherSignIn.error.message}`);
    process.exit(1);
  }

  const otherPeople = await other.from("people").select("id, slug, name").eq("slug", "sarah");
  const leaked = (otherPeople.data || []).some((person) => person.name === recipients[0].name);
  if (otherPeople.error || leaked) {
    console.error("RLS check failed or another user's Sarah row was visible.");
    process.exit(1);
  }
}

console.log("Supabase live check passed.");
