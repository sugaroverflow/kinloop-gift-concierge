import { createReminderCall, getVoiceConfig, validateVoiceConfig } from "../../../../lib/voice/twilio.js";
import { readJson } from "../../../../lib/api/read-json.js";

export async function POST(request) {
  const body = await readJson(request);
  const config = getVoiceConfig();
  const target = body.target || config.testTarget;
  const validation = validateVoiceConfig(config, { requireExecute: body.execute === true });

  if (!validation.ok) {
    return Response.json({
      ok: false,
      sent: false,
      error: `Missing voice configuration: ${validation.missing.join(", ")}`
    }, { status: 400 });
  }

  if (body.execute !== true && !config.execute) {
    return Response.json({
      ok: true,
      sent: false,
      mode: "preview",
      target,
      message: "Voice call is configured but VOICE_CALL_EXECUTE=1 is required to place a real call."
    });
  }

  const result = await createReminderCall({
    target,
    personName: body.personName || "Sarah",
    birthday: body.birthday || "June 2",
    giftTitle: body.giftTitle || "Pottery Studio Voucher",
    reminderDays: Number(body.reminderDays ?? 3),
    config
  });

  return Response.json(result, { status: result.ok ? 200 : 400 });
}
