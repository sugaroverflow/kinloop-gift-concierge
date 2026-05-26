import { generateGiftSource } from "../../../../lib/codex/gift-source.js";

export async function POST(request) {
  const body = await readJson(request);
  const result = await generateGiftSource({
    input: body.input || "",
    personId: body.personId || "sarah",
    preferLive: body.preferLive === true || (body.preferLive !== false && process.env.CODEX_LIVE === "1")
  });

  return Response.json({
    ok: true,
    source: result.source,
    fallbackReason: result.fallbackReason || null,
    candidate: result.candidate,
    options: result.options || [result.candidate].filter(Boolean)
  });
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
