import { gifts, recipients } from "../lib/product-data.js";
import { sendReminderViaOpenClaw } from "../lib/openclaw/adapter.js";
import { openClawModes, resolveOpenClawMode } from "../lib/openclaw/modes.js";
import { buildReminderPayload } from "../lib/openclaw/payloads.js";

const mode = resolveOpenClawMode();
const target = process.env.OPENCLAW_TEST_TARGET;
const defaultRecipient = recipients[0];
const defaultRecipientName = defaultRecipient?.name || "Recipient";
const defaultBirthday = defaultRecipient?.birthday || "upcoming birthday";

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
  recipientName: defaultRecipientName,
  birthday: defaultBirthday,
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

console.log("OpenClaw live check passed.");
