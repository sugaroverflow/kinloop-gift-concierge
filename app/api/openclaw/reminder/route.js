import { gifts } from "../../../../lib/product-data.js";
import { sendReminderViaOpenClaw, startVoiceEscalation } from "../../../../lib/openclaw/adapter.js";
import { openClawModes, resolveOpenClawMode } from "../../../../lib/openclaw/modes.js";
import { buildReminderPayload } from "../../../../lib/openclaw/payloads.js";

export async function POST(request) {
  const body = await readJson(request);
  const mode = resolveOpenClawMode({ OPENCLAW_MODE: body.mode || process.env.OPENCLAW_MODE });
  const target = body.target || process.env.OPENCLAW_TEST_TARGET || "kinloop-recipient";
  const approvalUrl = body.approvalUrl || process.env.OPENCLAW_REVIEW_BASE_URL || "http://localhost:3000";

  if (mode !== openClawModes.PREVIEW && target === "kinloop-recipient") {
    return Response.json({
      ok: false,
      error: "A real or CLI OpenClaw send requires an explicit target."
    }, { status: 400 });
  }

  const payload = buildReminderPayload({
    recipientName: body.recipientName || "Sarah",
    birthday: body.birthday || "June 2",
    giftOptions: gifts,
    approvalUrl
  });

  const message = await sendReminderViaOpenClaw({ target, payload, mode });
  const voice = body.includeVoice
    ? await startVoiceEscalation({
      to: target,
      message: body.voiceMessage || "Sarah's birthday needs a gift decision.",
      mode
    })
    : null;

  return Response.json({
    ok: !message.error && !voice?.error,
    mode,
    target,
    message,
    voice
  });
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
