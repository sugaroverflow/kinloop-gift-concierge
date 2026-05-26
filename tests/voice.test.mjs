import test from "node:test";
import assert from "node:assert/strict";
import { POST as reminderCallRoute } from "../app/api/voice/reminder-call/route.js";
import { POST as statusRoute } from "../app/api/voice/status/route.js";
import { GET as twimlRoute } from "../app/api/voice/twiml/route.js";
import {
  buildReminderTwiML,
  createReminderCall,
  getVoiceConfig,
  isVoiceTargetAllowed,
  validateVoiceConfig
} from "../lib/voice/twilio.js";

test("voice config reports missing live credentials", () => {
  const config = getVoiceConfig({});
  const validation = validateVoiceConfig(config, { requireExecute: true });

  assert.equal(validation.ok, false);
  assert.ok(validation.missing.includes("TWILIO_ACCOUNT_SID"));
  assert.ok(validation.missing.includes("VOICE_CALL_EXECUTE=1"));
});

test("voice target allowlist is exact", () => {
  const config = getVoiceConfig({
    VOICE_TARGET_ALLOWLIST: "+15555550123,+15555550124"
  });

  assert.equal(isVoiceTargetAllowed("+15555550123", config), true);
  assert.equal(isVoiceTargetAllowed("+15555550999", config), false);
});

test("Twilio call creation uses safe form payload and authorization", async () => {
  let requestUrl = "";
  let requestBody = "";
  let authHeader = "";
  const config = getVoiceConfig({
    OPENAI_API_KEY: "sk-test",
    TWILIO_ACCOUNT_SID: "AC123",
    TWILIO_AUTH_TOKEN: "secret",
    TWILIO_PHONE_NUMBER: "+15555550000",
    VOICE_TEST_TARGET: "+15555550123",
    VOICE_TARGET_ALLOWLIST: "+15555550123",
    VOICE_CALL_EXECUTE: "1",
    PUBLIC_APP_URL: "https://kinloop.example",
    VOICE_STREAM_URL: "wss://voice.example/stream"
  });

  const result = await createReminderCall({
    target: "+15555550123",
    config,
    fetchImpl: async (url, init) => {
      requestUrl = url;
      requestBody = init.body.toString();
      authHeader = init.headers.Authorization;
      return Response.json({ sid: "CA123", status: "queued" });
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.sent, true);
  assert.match(requestUrl, /Accounts\/AC123\/Calls\.json$/);
  assert.match(authHeader, /^Basic /);
  assert.match(requestBody, /To=%2B15555550123/);
  assert.match(requestBody, /From=%2B15555550000/);
  assert.match(requestBody, /Url=https%3A%2F%2Fkinloop\.example%2Fapi%2Fvoice%2Ftwiml/);
  assert.match(requestBody, /stream%3Dwss%253A%252F%252Fvoice\.example%252Fstream/);
});

test("Twilio call creation blocks non-allowlisted targets", async () => {
  const config = getVoiceConfig({
    OPENAI_API_KEY: "sk-test",
    TWILIO_ACCOUNT_SID: "AC123",
    TWILIO_AUTH_TOKEN: "secret",
    TWILIO_PHONE_NUMBER: "+15555550000",
    VOICE_TEST_TARGET: "+15555550123",
    VOICE_TARGET_ALLOWLIST: "+15555550123",
    VOICE_CALL_EXECUTE: "1",
    PUBLIC_APP_URL: "https://kinloop.example"
  });

  const result = await createReminderCall({
    target: "+15555550999",
    config,
    fetchImpl: async () => {
      throw new Error("fetch should not execute");
    }
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /allowlist/i);
});

test("TwiML connects to realtime media stream when stream URL is configured", () => {
  const body = buildReminderTwiML({
    personName: "Sarah",
    birthday: "June 2",
    giftTitle: "Pottery Studio Voucher",
    streamUrl: "wss://voice.example/stream",
    reviewUrl: "https://kinloop.example"
  });

  assert.match(body, /<Connect>/);
  assert.match(body, /<Stream url="wss:\/\/voice\.example\/stream">/);
  assert.match(body, /name="giftTitle" value="Pottery Studio Voucher"/);
});

test("TwiML route returns XML fallback without stream URL", async () => {
  const response = await twimlRoute(new Request("http://localhost/api/voice/twiml?person=Sarah&gift=Pottery%20Studio%20Voucher"));
  const body = await response.text();

  assert.equal(response.headers.get("Content-Type"), "text/xml; charset=utf-8");
  assert.match(body, /^<\?xml/);
  assert.match(body, /<Say>/);
});

test("reminder call route previews unless execute is enabled", async () => {
  const { response, payload } = await withVoiceEnv(async () => {
    const response = await reminderCallRoute(new Request("http://localhost/api/voice/reminder-call", {
      method: "POST",
      body: JSON.stringify({ target: "+15555550123" })
    }));
    return { response, payload: await response.json() };
  });

  assert.equal(response.status, 200);
  assert.equal(payload.sent, false);
  assert.equal(payload.mode, "preview");
});

test("voice status route echoes Twilio callback fields", async () => {
  const body = new URLSearchParams({
    CallSid: "CA999",
    CallStatus: "completed",
    Direction: "outbound-api"
  });
  const response = await statusRoute(new Request("http://localhost/api/voice/status", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  }));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.callSid, "CA999");
  assert.equal(payload.callStatus, "completed");
  assert.equal(payload.direction, "outbound-api");
});

async function withVoiceEnv(callback) {
  const keys = [
    "OPENAI_API_KEY",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_PHONE_NUMBER",
    "VOICE_TEST_TARGET",
    "VOICE_TARGET_ALLOWLIST",
    "VOICE_CALL_EXECUTE",
    "PUBLIC_APP_URL"
  ];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  Object.assign(process.env, {
    OPENAI_API_KEY: "sk-test",
    TWILIO_ACCOUNT_SID: "AC123",
    TWILIO_AUTH_TOKEN: "secret",
    TWILIO_PHONE_NUMBER: "+15555550000",
    VOICE_TEST_TARGET: "+15555550123",
    VOICE_TARGET_ALLOWLIST: "+15555550123",
    VOICE_CALL_EXECUTE: "0",
    PUBLIC_APP_URL: "https://kinloop.example"
  });

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
