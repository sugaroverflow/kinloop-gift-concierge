import { createReminderCall, getVoiceConfig, validateVoiceConfig } from "../lib/voice/twilio.js";

const config = getVoiceConfig();
const validation = validateVoiceConfig(config, { requireExecute: true });

if (!validation.ok) {
  console.error(`Voice live check requires: ${validation.missing.join(", ")}`);
  process.exit(1);
}

const result = await createReminderCall({
  target: config.testTarget,
  personName: "Sarah",
  birthday: "June 2",
  giftTitle: "Pottery Studio Voucher",
  reminderDays: 3,
  config
});

if (!result.ok || !result.sent) {
  console.error(`Voice live check failed: ${result.error || "call was not sent"}`);
  process.exit(1);
}

console.log("Voice live check passed.");
console.log(`callSid=${result.sid}`);
console.log(`status=${result.status || "(unknown)"}`);
console.log(`to=${result.to}`);
