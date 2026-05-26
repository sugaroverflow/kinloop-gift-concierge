import test from "node:test";
import assert from "node:assert/strict";
import { createHeartbeatFixture, evaluateReminder, evaluateReminders } from "../lib/heartbeat/evaluate-reminders.js";

test("heartbeat evaluation transitions reminder to t_3_due", () => {
  const reminder = createHeartbeatFixture();
  const result = evaluateReminder(reminder, new Date("2026-05-30T10:00:00Z"));

  assert.equal(result.changed, true);
  assert.equal(result.reminder.state, "t_3_due");
  assert.equal(result.auditEvent.type, "reminder_due");
  assert.equal(result.auditEvent.metadata.daysUntilBirthday, 3);
});

test("heartbeat evaluation keeps approved reminders unchanged", () => {
  const result = evaluateReminder({
    ...createHeartbeatFixture(),
    approved: true,
    state: "brief_ready"
  }, new Date("2026-05-30T10:00:00Z"));

  assert.equal(result.changed, false);
  assert.equal(result.reminder.state, "approved");
  assert.equal(result.auditEvent, null);
});

test("heartbeat evaluation batches changed and unchanged reminders", () => {
  const result = evaluateReminders([
    createHeartbeatFixture(),
    {
      ...createHeartbeatFixture(),
      id: "already-approved",
      approved: true,
      state: "approved"
    }
  ], "2026-05-30T10:00:00Z");

  assert.equal(result.changed.length, 1);
  assert.equal(result.unchanged.length, 1);
  assert.equal(result.auditEvents.length, 1);
});
