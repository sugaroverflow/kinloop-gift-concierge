import { gifts } from "../lib/product-data.js";
import { sendReminderViaOpenClaw, startVoiceEscalation } from "../lib/openclaw/adapter.js";
import { openClawModes, resolveOpenClawMode } from "../lib/openclaw/modes.js";
import { buildReminderPayload } from "../lib/openclaw/payloads.js";

const mode = resolveOpenClawMode();
const target = process.env.OPENCLAW_TEST_TARGET;

if (mode !== openClawModes.CLI) {
  console.error("OpenClaw live check currently requires OPENCLAW_MODE=cli.");
  process.exit(1);
}

if (!target) {
  console.error("Missing OPENCLAW_TEST_TARGET.");
  process.exit(1);
}

if (process.env.OPENCLAW_CLI_EXECUTE !== "1") {
  console.error("OpenClaw live check requires OPENCLAW_CLI_EXECUTE=1.");
  process.exit(1);
}

const payload = buildReminderPayload({
  recipientName: "Sarah",
  birthday: "June 2",
  giftOptions: gifts,
  approvalUrl: process.env.OPENCLAW_REVIEW_BASE_URL || "http://localhost:3000"
});

const messageResult = await sendReminderViaOpenClaw({
  target,
  payload,
  mode
});

if (!messageResult.sent) {
  console.error(`OpenClaw message check failed: ${messageResult.error || "not sent"}`);
  process.exit(1);
}

if (process.env.OPENCLAW_CHECK_VOICE === "1") {
  const voiceResult = await startVoiceEscalation({
    to: target,
    message: "Sarah's birthday needs a gift decision.",
    mode
  });

  if (!voiceResult.sent) {
    console.error(`OpenClaw voice check failed: ${voiceResult.error || "not sent"}`);
    process.exit(1);
  }
}

console.log("OpenClaw live check passed.");
