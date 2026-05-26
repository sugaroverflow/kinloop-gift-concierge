import test from "node:test";
import assert from "node:assert/strict";
import { gifts } from "../lib/product-data.js";
import { sendReminderViaOpenClaw, startVoiceEscalation } from "../lib/openclaw/adapter.js";
import { isOpenClawTargetAllowed, openClawModes, resolveOpenClawMode } from "../lib/openclaw/modes.js";
import { buildReminderPayload } from "../lib/openclaw/payloads.js";
import { parseOpenClawReply } from "../lib/openclaw/parse-reply.js";
import { POST as openClawReminderRoute } from "../app/api/openclaw/reminder/route.js";

test("reply parser maps 1, 2, 3 to gift approvals", () => {
  assert.deepEqual(parseOpenClawReply("1"), { type: "approve", giftId: "pottery-voucher", raw: "1" });
  assert.deepEqual(parseOpenClawReply("2"), { type: "approve", giftId: "espresso-kit", raw: "2" });
  assert.deepEqual(parseOpenClawReply("3"), { type: "approve", giftId: "hosting-care", raw: "3" });
});

test("reply parser handles defer and dashboard intents", () => {
  assert.equal(parseOpenClawReply("defer").type, "defer");
  assert.equal(parseOpenClawReply("D").type, "defer");
  assert.equal(parseOpenClawReply("review").type, "open_dashboard");
  assert.equal(parseOpenClawReply("what?").type, "unknown");
});

test("reminder payload includes numbered options and safe reply instructions", () => {
  const payload = buildReminderPayload({
    recipientName: "Sarah",
    birthday: "June 2",
    giftOptions: gifts,
    approvalUrl: "http://localhost:3000"
  });

  assert.equal(payload.kind, "birthday_reminder");
  assert.match(payload.message, /Reply 1, 2, 3, or defer/);
  assert.match(payload.message, /1\. Pottery Studio Voucher/);
});

test("adapter defaults to preview and does not send", async () => {
  const payload = buildReminderPayload({
    recipientName: "Sarah",
    birthday: "June 2",
    giftOptions: gifts,
    approvalUrl: "http://localhost:3000"
  });
  const result = await sendReminderViaOpenClaw({ target: "+15555550123", payload });

  assert.equal(resolveOpenClawMode({}), openClawModes.PREVIEW);
  assert.equal(result.sent, false);
  assert.equal(result.command[0], "openclaw");
});

test("cli execution requires explicit execute flag and allowlisted target", async () => {
  const payload = buildReminderPayload({
    recipientName: "Sarah",
    birthday: "June 2",
    giftOptions: gifts,
    approvalUrl: "http://localhost:3000"
  });
  const env = {
    OPENCLAW_CLI_EXECUTE: "1",
    OPENCLAW_TARGET_ALLOWLIST: "+15555550123"
  };

  assert.equal(isOpenClawTargetAllowed("+15555550123", env), true);

  const result = await sendReminderViaOpenClaw({
    target: "+15555550123",
    payload,
    mode: openClawModes.CLI,
    env,
    runner: async () => ({ stdout: "queued", stderr: "" })
  });

  assert.equal(result.sent, true);
  assert.equal(result.stdout, "queued");
});

test("cli execution blocks non-allowlisted targets", async () => {
  const payload = buildReminderPayload({
    recipientName: "Sarah",
    birthday: "June 2",
    giftOptions: gifts,
    approvalUrl: "http://localhost:3000"
  });
  const result = await sendReminderViaOpenClaw({
    target: "+15555550999",
    payload,
    mode: openClawModes.CLI,
    env: {
      OPENCLAW_CLI_EXECUTE: "1",
      OPENCLAW_TARGET_ALLOWLIST: "+15555550123"
    },
    runner: async () => {
      throw new Error("runner should not execute");
    }
  });

  assert.equal(result.sent, false);
  assert.match(result.error, /allowlist/i);
});

test("voice escalation exposes browser or transcript recovery", async () => {
  const result = await startVoiceEscalation({
    to: "+15555550123",
    message: "Sarah's birthday needs a gift decision.",
    mode: openClawModes.PREVIEW
  });

  assert.equal(result.sent, false);
  assert.equal(result.recovery, "browser_or_transcript");
  assert.deepEqual(result.command.slice(0, 3), ["openclaw", "voicecall", "call"]);
});

test("OpenClaw reminder route previews message and voice", async () => {
  const response = await openClawReminderRoute(new Request("http://localhost/api/openclaw/reminder", {
    method: "POST",
    body: JSON.stringify({ mode: openClawModes.PREVIEW, includeVoice: true })
  }));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.mode, openClawModes.PREVIEW);
  assert.equal(payload.message.sent, false);
  assert.equal(payload.voice.sent, false);
  assert.match(payload.message.payload.message, /Reply 1, 2, 3, or defer/);
});

test("OpenClaw reminder route blocks sends without explicit target", async () => {
  const response = await openClawReminderRoute(new Request("http://localhost/api/openclaw/reminder", {
    method: "POST",
    body: JSON.stringify({ mode: openClawModes.CLI })
  }));
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.equal(payload.ok, false);
  assert.match(payload.error, /explicit target/i);
});
