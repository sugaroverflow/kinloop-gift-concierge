import { buildReminderTwiML, getVoiceConfig } from "../../../../lib/voice/twilio.js";

export async function GET(request) {
  return twimlResponse(request);
}

export async function POST(request) {
  return twimlResponse(request);
}

function twimlResponse(request) {
  const url = new URL(request.url);
  const config = getVoiceConfig();
  const body = buildReminderTwiML({
    personName: url.searchParams.get("person") || "Sarah",
    birthday: url.searchParams.get("birthday") || "June 2",
    giftTitle: url.searchParams.get("gift") || "Pottery Studio Voucher",
    reminderDays: Number(url.searchParams.get("days") || 3),
    streamUrl: url.searchParams.get("stream") || config.streamUrl,
    reviewUrl: url.searchParams.get("review") || config.reviewBaseUrl || config.publicAppUrl
  });

  return new Response(body, {
    headers: { "Content-Type": "text/xml; charset=utf-8" }
  });
}
