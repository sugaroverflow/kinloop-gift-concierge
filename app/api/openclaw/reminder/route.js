import { gifts, recipients } from "../../../../lib/product-data.js";
import { readJson } from "../../../../lib/api/read-json.js";
import { loadProductCandidates } from "../../../../lib/product-source.js";
import { sendReminderViaOpenClaw } from "../../../../lib/openclaw/adapter.js";
import { openClawModes, resolveOpenClawMode } from "../../../../lib/openclaw/modes.js";
import { buildReminderPayload } from "../../../../lib/openclaw/payloads.js";

export async function POST(request) {
  const body = await readJson(request);
  const mode = resolveOpenClawMode({ OPENCLAW_MODE: body.mode || process.env.OPENCLAW_MODE });
  const target = body.target || process.env.OPENCLAW_TEST_TARGET || "kinloop-recipient";
  const approvalUrl = body.approvalUrl || process.env.OPENCLAW_REVIEW_BASE_URL || "http://localhost:3000";
  const defaultRecipient = recipients[0];
  const defaultRecipientName = defaultRecipient?.name || "Recipient";
  const defaultBirthday = defaultRecipient?.birthday || "upcoming birthday";
  const productSource = await loadProductCandidates({
    input: body.sourceText || "",
    preferLive: body.preferLiveProducts === true || process.env.SHOPIFY_UCP_LIVE === "1",
    limit: 3
  });

  if (mode !== openClawModes.PREVIEW && target === "kinloop-recipient") {
    return Response.json({
      ok: false,
      error: "A real or CLI OpenClaw send requires an explicit target."
    }, { status: 400 });
  }

  const payload = buildReminderPayload({
    recipientName: body.recipientName || defaultRecipientName,
    birthday: body.birthday || defaultBirthday,
    giftOptions: productSource.products.length ? productSource.products : gifts.slice(0, 3),
    approvalUrl
  });

  const message = await sendReminderViaOpenClaw({ target, payload, mode });

  return Response.json({
    ok: !message.error,
    mode,
    target,
    productSource: productSource.source,
    message
  });
}
