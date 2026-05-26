import test from "node:test";
import assert from "node:assert/strict";
import { gifts } from "../lib/product-data.js";
import { sendReminderViaOpenClaw } from "../lib/openclaw/adapter.js";
import { isOpenClawTargetAllowed, openClawModes, resolveOpenClawMode } from "../lib/openclaw/modes.js";
import { buildReminderPayload } from "../lib/openclaw/payloads.js";
import { parseOpenClawReply } from "../lib/openclaw/parse-reply.js";
import { POST as openClawReminderRoute } from "../app/api/openclaw/reminder/route.js";
import { GET as openClawStatusRoute } from "../app/api/openclaw/status/route.js";

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
  await withOpenClawEnv(async () => {
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

test("cli execution can route through VPS over ssh", async () => {
  const payload = buildReminderPayload({
    recipientName: "Sarah",
    birthday: "June 2",
    giftOptions: gifts,
    approvalUrl: "http://localhost:3000"
  });

  const result = await sendReminderViaOpenClaw({
    target: "+15555550123",
    payload,
    mode: openClawModes.CLI,
    env: {
      OPENCLAW_CLI_EXECUTE: "1",
      OPENCLAW_TARGET_ALLOWLIST: "+15555550123",
      OPENCLAW_SSH_HOST: "ubuntu@vps.example",
      OPENCLAW_SSH_OPTIONS: "-o BatchMode=yes"
    },
    runner: async () => ({ stdout: "queued-via-ssh", stderr: "" })
  });

  assert.equal(result.sent, true);
  assert.equal(result.command[0], "ssh");
  assert.equal(result.command.includes("ubuntu@vps.example"), true);
  assert.equal(result.stdout, "queued-via-ssh");
});

test("OpenClaw reminder route previews message payload", async () => {
  const response = await openClawReminderRoute(new Request("http://localhost/api/openclaw/reminder", {
    method: "POST",
    body: JSON.stringify({ mode: openClawModes.PREVIEW })
  }));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.mode, openClawModes.PREVIEW);
  assert.equal(payload.message.sent, false);
  assert.match(payload.message.payload.message, /Reply 1, 2, 3, or defer/);
});

test("OpenClaw reminder route blocks sends without explicit target", async () => {
  const response = await openClawReminderRoute(new Request("http://localhost/api/openclaw/reminder", {
    method: "POST",
    body: JSON.stringify({ mode: openClawModes.CLI, target: "kinloop-recipient" })
  }));
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.equal(payload.ok, false);
  assert.match(payload.error, /explicit target/i);
});

test("OpenClaw status route reports setup readiness summary", async () => {
  await withOpenClawEnv(async () => {
    process.env.OPENCLAW_MODE = openClawModes.CLI;
    process.env.OPENCLAW_CLI_EXECUTE = "1";
    process.env.OPENCLAW_TEST_TARGET = "+15555550123";
    process.env.OPENCLAW_TARGET_ALLOWLIST = "+15555550123";
    process.env.OPENCLAW_CHANNEL = "whatsapp";

    const response = await openClawStatusRoute();
    const payload = await response.json();

    assert.equal(payload.ok, true);
    assert.equal(payload.ready, true);
    assert.match(payload.summary, /ready/i);
  });
});

async function withOpenClawEnv(callback) {
  const keys = [
    "OPENCLAW_MODE",
    "OPENCLAW_SSH_HOST",
    "OPENCLAW_SSH_OPTIONS",
    "OPENCLAW_CLI_EXECUTE",
    "OPENCLAW_TEST_TARGET",
    "OPENCLAW_TARGET_ALLOWLIST",
    "OPENCLAW_CHANNEL",
    "OPENCLAW_ACCOUNT"
  ];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];

  try {
    return await callback();
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous[key];
      }
    }
  }
}
