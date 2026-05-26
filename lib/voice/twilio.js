const TWILIO_API_ROOT = "https://api.twilio.com/2010-04-01";

export function getVoiceConfig(env = process.env) {
  return {
    openAiApiKey: env.OPENAI_API_KEY || "",
    accountSid: env.TWILIO_ACCOUNT_SID || "",
    authToken: env.TWILIO_AUTH_TOKEN || "",
    fromNumber: env.TWILIO_PHONE_NUMBER || "",
    testTarget: env.VOICE_TEST_TARGET || "",
    allowlist: String(env.VOICE_TARGET_ALLOWLIST || "")
      .split(",")
      .map((target) => target.trim())
      .filter(Boolean),
    execute: env.VOICE_CALL_EXECUTE === "1",
    publicAppUrl: normalizeBaseUrl(env.PUBLIC_APP_URL || env.VOICE_REVIEW_BASE_URL || ""),
    streamUrl: env.VOICE_STREAM_URL || "",
    statusCallbackUrl: env.VOICE_STATUS_CALLBACK_URL || "",
    reviewBaseUrl: normalizeBaseUrl(env.VOICE_REVIEW_BASE_URL || env.PUBLIC_APP_URL || "")
  };
}

export function validateVoiceConfig(config = getVoiceConfig(), { requireExecute = false } = {}) {
  const missing = [];
  if (!config.openAiApiKey) missing.push("OPENAI_API_KEY");
  if (!config.accountSid) missing.push("TWILIO_ACCOUNT_SID");
  if (!config.authToken) missing.push("TWILIO_AUTH_TOKEN");
  if (!config.fromNumber) missing.push("TWILIO_PHONE_NUMBER");
  if (!config.testTarget) missing.push("VOICE_TEST_TARGET");
  if (!config.allowlist.length) missing.push("VOICE_TARGET_ALLOWLIST");
  if (!config.publicAppUrl) missing.push("PUBLIC_APP_URL");
  if (requireExecute && !config.execute) missing.push("VOICE_CALL_EXECUTE=1");

  return {
    ok: missing.length === 0,
    missing
  };
}

export function isVoiceTargetAllowed(target, config = getVoiceConfig()) {
  return Boolean(target && config.allowlist.includes(target));
}

export async function createReminderCall({
  target,
  personName = "Sarah",
  birthday = "June 2",
  giftTitle = "the approved gift",
  reminderDays = 3,
  config = getVoiceConfig(),
  fetchImpl = globalThis.fetch
} = {}) {
  const validation = validateVoiceConfig(config, { requireExecute: true });
  if (!validation.ok) {
    return { ok: false, sent: false, error: `Missing voice configuration: ${validation.missing.join(", ")}` };
  }

  if (!isVoiceTargetAllowed(target, config)) {
    return { ok: false, sent: false, error: "Target is not in VOICE_TARGET_ALLOWLIST." };
  }

  const twimlUrl = new URL("/api/voice/twiml", config.publicAppUrl);
  twimlUrl.searchParams.set("person", personName);
  twimlUrl.searchParams.set("birthday", birthday);
  twimlUrl.searchParams.set("gift", giftTitle);
  twimlUrl.searchParams.set("days", String(reminderDays));
  if (config.streamUrl) twimlUrl.searchParams.set("stream", config.streamUrl);
  if (config.reviewBaseUrl) twimlUrl.searchParams.set("review", config.reviewBaseUrl);

  const params = new URLSearchParams({
    To: target,
    From: config.fromNumber,
    Url: twimlUrl.toString(),
    Method: "POST"
  });

  const statusCallback = config.statusCallbackUrl || new URL("/api/voice/status", config.publicAppUrl).toString();
  params.set("StatusCallback", statusCallback);
  params.set("StatusCallbackMethod", "POST");
  params.set("StatusCallbackEvent", "initiated ringing answered completed");

  const response = await fetchImpl(`${TWILIO_API_ROOT}/Accounts/${encodeURIComponent(config.accountSid)}/Calls.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false,
      sent: false,
      error: payload.message || `Twilio call request failed with HTTP ${response.status}.`,
      status: response.status
    };
  }

  return {
    ok: true,
    sent: true,
    sid: payload.sid || "",
    status: payload.status || "",
    to: target,
    from: config.fromNumber,
    twimlUrl: twimlUrl.toString()
  };
}

export function buildReminderTwiML({
  personName = "Sarah",
  birthday = "June 2",
  giftTitle = "the approved gift",
  reminderDays = 3,
  streamUrl = "",
  reviewUrl = ""
} = {}) {
  const intro = [
    `Hi. This is Kinloop calling about ${personName}'s birthday on ${birthday}.`,
    `${giftTitle} is ready for your approval reminder.`,
    reminderDays ? `You asked to be reminded ${reminderDays} days before the deadline.` : ""
  ].filter(Boolean).join(" ");

  if (streamUrl) {
    return xml([
      '<?xml version="1.0" encoding="UTF-8"?>',
      "<Response>",
      `<Say>${escapeXml(intro)}</Say>`,
      "<Connect>",
      `<Stream url="${escapeXml(streamUrl)}">`,
      `<Parameter name="personName" value="${escapeXml(personName)}" />`,
      `<Parameter name="birthday" value="${escapeXml(birthday)}" />`,
      `<Parameter name="giftTitle" value="${escapeXml(giftTitle)}" />`,
      `<Parameter name="reviewUrl" value="${escapeXml(reviewUrl)}" />`,
      "</Stream>",
      "</Connect>",
      "</Response>"
    ]);
  }

  return xml([
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<Response>",
    `<Say>${escapeXml(`${intro} OpenAI realtime voice is configured through the media stream bridge. Please open Kinloop to review the gift decision.`)}</Say>`,
    "<Pause length=\"1\" />",
    "<Hangup />",
    "</Response>"
  ]);
}

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

function escapeXml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function xml(lines) {
  return lines.join("");
}
