import test from "node:test";
import assert from "node:assert/strict";
import { gifts } from "../lib/product-data.js";
import { initialKinloopState } from "../lib/persistence.js";
import {
  loadAccountState,
  loadBirthdayData,
  recordKinloopApproval,
  recordKinloopAuditEvent
} from "../lib/supabase/repository.js";

test("birthday repository falls back to JSON data without Supabase client", async () => {
  const result = await loadBirthdayData();

  assert.equal(result.mode, "local");
  assert.equal(result.people.length > 0, true);
  assert.equal(result.gifts.length, 3);
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
        maybeSingle: async () => ({ data: { id: "gift-option-1", brief_id: "brief-1" }, error: null }),
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
    }
  });

  assert.equal(result.mode, "supabase");
  assert.deepEqual(writes.map((write) => write.table), ["approvals", "audit_events"]);
  assert.equal(writes[0].payload.status, "approved");
  assert.equal(writes[1].payload.event_type, "gift_approved");
});
