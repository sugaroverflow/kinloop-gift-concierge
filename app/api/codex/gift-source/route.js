import { generateGiftSource } from "../../../../lib/codex/gift-source.js";
import { readJson } from "../../../../lib/api/read-json.js";

export async function POST(request) {
  const body = await readJson(request);
  const result = await generateGiftSource({
    input: body.input || "",
    personId: body.personId || "sarah",
    preferLive: body.preferLive === true || (body.preferLive !== false && process.env.CODEX_LIVE === "1"),
    brief: body.brief,
    sourceSignal: body.sourceSignal
  });

  return Response.json({
    ok: true,
    mode: result.mode,
    source: result.source,
    productSource: result.productSource || result.source,
    catalog: result.catalog || null,
    brief: result.brief || null,
    fallbackReason: result.fallbackReason || null,
    candidate: result.candidate,
    options: result.options || [result.candidate].filter(Boolean)
  });
}
