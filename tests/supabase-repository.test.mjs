import test from "node:test";
import assert from "node:assert/strict";
import { gifts } from "../lib/product-data.js";
import { initialKinloopState } from "../lib/persistence.js";
import { signInWithEmailPassword, signOutOfSupabase } from "../lib/supabase/client.js";
import {
  loadAccountState,
  loadBirthdayData,
  recordKinloopImport,
  recordKinloopApproval,
  recordKinloopAuditEvent
} from "../lib/supabase/repository.js";

test("birthday repository falls back to JSON data without Supabase client", async () => {
  const result = await loadBirthdayData();

  assert.equal(result.mode, "local");
  assert.equal(result.people.length > 0, true);
  assert.equal(result.gifts.length >= 10, true);
});

test("birthday repository maps Supabase rows into UI-shaped data", async () => {
  const client = {
    from(table) {
      return {
        select() {
          return this;
        },
        order: async () => {
          if (table === "people") {
            return {
              data: [{
                id: "person-row-1",
                slug: "sarah",
                name: "Sarah Chen",
                relation: "Close friend",
                birthday: "2026-06-02",
                budget_min: 40,
                budget_max: 75,
                address_status: "ready",
                notes: "Thoughtful and useful, but not extravagant.",
                likes: ["Pottery classes"],
                avoid: ["Generic mugs"]
              }],
              error: null
            };
          }

          return {
            data: [{
              id: "gift-option-1",
              brief_id: "brief-1",
              catalog_id: "pottery-voucher",
              name: "Pottery Studio Voucher",
              seller: "Clay North Studio",
              price_cents: 5800,
              currency: "GBP",
              delivery_label: "Digital delivery today",
              fit_score: 89,
              risk_note: "Less tactile than a wrapped item."
            }],
            error: null
          };
        }
      };
    }
  };

  const result = await loadBirthdayData({ client });

  assert.equal(result.mode, "supabase");
  assert.equal(result.people[0].id, "sarah");
  assert.equal(result.gifts[0].id, "pottery-voucher");
  assert.equal(result.gifts[0].displayPrice, "GBP 58.00");
});

test("account state maps approval audit events and approved reminder status", async () => {
  const client = {
    from(table) {
      return {
        select() {
          return this;
        },
        order() {
          return this;
        },
        limit: async () => {
          if (table === "audit_events") {
            return {
              data: [{
                id: "audit-1",
                event_type: "gift_approved",
                summary: "Pottery Studio Voucher approved for Sarah.",
                metadata: { gift_id: "pottery-voucher", title: "Pottery Studio Voucher" },
                created_at: "2026-05-25T12:00:00.000Z"
              }],
              error: null
            };
          }

          return {
            data: [{ id: "reminder-1", state: "brief_ready" }],
            error: null
          };
        }
      };
    }
  };

  const result = await loadAccountState({ client });

  assert.equal(result.mode, "supabase");
  assert.equal(result.auditEvents[0].title, "Gift Approved");
  assert.equal(result.reminderState, "approved");
  assert.equal(result.approval.gift_id, "pottery-voucher");
});

test("account state falls back locally without Supabase client", async () => {
  const result = await loadAccountState();

  assert.equal(result.mode, "local");
  assert.equal(result.auditEvents.length, initialKinloopState.auditEvents.length);
  assert.equal(result.reminderState, initialKinloopState.reminderState);
});

test("recording Kinloop audit writes durable event when authenticated", async () => {
  const writes = [];
  const client = {
    auth: {
      getUser: async () => ({ data: { user: { id: "user-1" } }, error: null })
    },
    from(table) {
      return {
        insert(payload) {
          writes.push({ table, payload });
          return Promise.resolve({ error: null });
        }
      };
    }
  };

  const result = await recordKinloopAuditEvent({
    client,
    eventType: "signal_imported",
    summary: "Sarah birthday idea imported",
    metadata: { source: "agentmail" }
  });

  assert.equal(result.mode, "supabase");
  assert.deepEqual(writes.map((write) => write.table), ["audit_events"]);
  assert.equal(writes[0].payload.event_type, "signal_imported");
  assert.equal(writes[0].payload.entity_type, "kinloop_workflow");
});

test("Supabase email/password auth helper calls real auth method", async () => {
  const calls = [];
  const client = {
    auth: {
      signInWithPassword: async (payload) => {
        calls.push(payload);
        return { data: { session: { access_token: "token" }, user: { id: "user-1" } }, error: null };
      }
    }
  };

  const result = await signInWithEmailPassword({
    client,
    email: " demo@example.com ",
    password: "password-1"
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calls, [{ email: "demo@example.com", password: "password-1" }]);
});

test("Supabase sign-out helper calls auth signOut", async () => {
  let called = false;
  const client = {
    auth: {
      signOut: async () => {
        called = true;
        return { error: null };
      }
    }
  };

  const result = await signOutOfSupabase({ client });

  assert.equal(result.ok, true);
  assert.equal(called, true);
});

test("recording Kinloop import persists synthetic people and audit metadata", async () => {
  const writes = [];
  const client = {
    auth: {
      getUser: async () => ({ data: { user: { id: "user-1" } }, error: null })
    },
    from(table) {
      return {
        upsert(payload, options) {
          writes.push({ table, payload, options });
          return {
            select: async () => ({
              data: payload.map((person, index) => ({ id: `person-${index + 1}`, slug: person.slug })),
              error: null
            })
          };
        },
        insert(payload) {
          writes.push({ table, payload });
          return Promise.resolve({ error: null });
        }
      };
    }
  };

  const result = await recordKinloopImport({
    client,
    people: [{
      id: "sarah",
      name: "Elara Moonwell",
      relation: "Close friend",
      birthday: "June 2",
      budget: "GBP 40-75",
      addressStatus: "Ready",
      note: "Thoughtful and useful. Elara has been talking about pottery.",
      clues: ["pottery", "espresso"],
      avoid: ["generic mugs"],
      sourceCount: 7
    }],
    sourceImport: { mode: "local_source" }
  });

  assert.equal(result.mode, "supabase");
  assert.deepEqual(writes.map((write) => write.table), ["people", "audit_events"]);
  assert.equal(writes[0].options.onConflict, "user_id,slug");
  assert.equal(writes[0].payload[0].slug, "sarah");
  assert.equal(writes[1].payload.event_type, "synthetic_source_imported");
  assert.equal(writes[1].payload.metadata.people[0].name, "Elara Moonwell");
});

test("recording Kinloop approval writes approval and audit rows", async () => {
  const writes = [];
  const client = {
    auth: {
      getUser: async () => ({ data: { user: { id: "user-1" } }, error: null })
    },
    from(table) {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        limit() {
          return this;
        },
        maybeSingle: async () => table === "people"
          ? ({ data: { id: "person-row-1" }, error: null })
          : ({ data: { id: "gift-option-1", brief_id: "brief-1" }, error: null }),
        insert(payload) {
          writes.push({ table, payload });
          return Promise.resolve({ error: null });
        }
      };
    }
  };

  const result = await recordKinloopApproval({
    client,
    option: {
      id: gifts[0].id,
      title: gifts[0].name,
      fitScore: gifts[0].score
    },
    person: { id: "sarah", name: "Elara Moonwell", birthday: "June 2" },
    reminderDays: 3
  });

  assert.equal(result.mode, "supabase");
  assert.deepEqual(writes.map((write) => write.table), ["approvals", "reminders", "audit_events"]);
  assert.equal(writes[0].payload.status, "approved");
  assert.equal(writes[1].payload.state, "approved");
  assert.equal(writes[2].payload.event_type, "gift_approved");
  assert.equal(writes[2].payload.metadata.person_name, "Elara Moonwell");
});
