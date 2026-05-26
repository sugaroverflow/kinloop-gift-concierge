import { gifts, recipients } from "../product-data.js";

export const giftSourceSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    caption: { type: "string" },
    why: { type: "string" },
    risk: { type: "string" },
    priceRange: { type: "string" },
    deliveryNote: { type: "string" },
    sellerSignal: { type: "string" },
    suggestedSearch: { type: "string" },
    fitScore: { type: "number" }
  },
  required: ["title", "caption", "why", "risk", "priceRange", "deliveryNote", "sellerSignal", "suggestedSearch", "fitScore"],
  additionalProperties: false
};

export const giftOptionsSchema = {
  type: "object",
  properties: {
    options: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: giftSourceSchema
    }
  },
  required: ["options"],
  additionalProperties: false
};

export async function generateGiftSource({ input = "", personId = "sarah", preferLive = false } = {}) {
  const normalizedInput = normalizeSourceInput(input);
  const person = recipients.find((recipient) => recipient.id === personId) || recipients[0];

  if (!preferLive || !hasCodexCredential()) {
    const options = generateFallbackGiftOptions({ input: normalizedInput, person });
    return {
      source: "local_resilience",
      candidate: options[0],
      options
    };
  }

  try {
    const options = await generateCodexGiftOptions({ input: normalizedInput, person });
    return {
      source: "codex_sdk",
      candidate: options[0],
      options
    };
  } catch (error) {
    const options = generateFallbackGiftOptions({ input: normalizedInput, person });
    return {
      source: "local_resilience",
      fallbackReason: error instanceof Error ? error.message : "Codex SDK source analysis failed",
      candidate: options[0],
      options
    };
  }
}

export function generateFallbackGiftSource({ input = "", person = recipients[0] } = {}) {
  const baseGift = chooseRelevantGift(input);
  const topic = extractSourceTopic(input) || baseGift.name;
  const likes = person.likes?.slice(0, 3).join(", ") || "her known interests";

  return validateGiftSourceCandidate({
    title: topic,
    caption: `${baseGift.caption} Inspired by the added source and checked against ${person.name}'s birthday preferences.`,
    why: `Matches ${likes}, stays close to the existing birthday brief, and can be compared against catalog-backed options before approval.`,
    risk: baseGift.consider || "Confirm delivery timing, returns, and seller reliability before choosing it.",
    priceRange: baseGift.displayPrice || "GBP 40-75",
    deliveryNote: baseGift.delivery || "Check delivery before June 2",
    sellerSignal: baseGift.seller || "Seller details need review",
    suggestedSearch: `${person.name.split(" ")[0]} ${topic} birthday gift`,
    fitScore: Math.min(96, Math.max(72, baseGift.score || 82))
  });
}

export function generateFallbackGiftOptions({ input = "", person = recipients[0] } = {}) {
  const rankedGifts = chooseRelevantGifts(input);

  return rankedGifts.slice(0, 3).map((gift, index) => validateGiftSourceCandidate({
    title: gift.name,
    caption: `${gift.caption} Interpreted from the imported signal and checked against ${person.name}'s birthday context.`,
    why: gift.why,
    risk: gift.consider || "Confirm timing, returns, and fit before approving.",
    priceRange: gift.displayPrice || "GBP 40-75",
    deliveryNote: gift.delivery || "Check delivery before June 2",
    sellerSignal: gift.seller || "Seller details need review",
    suggestedSearch: `${person.name.split(" ")[0]} ${gift.name} birthday gift`,
    fitScore: Math.min(98, Math.max(68, Number(gift.score || 80) - index))
  }));
}

async function generateCodexGiftOptions({ input, person }) {
  const { Codex } = await import("@openai/codex-sdk");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.CODEX_GIFT_SOURCE_TIMEOUT_MS || 15000));
  const useCliAuth = process.env.CODEX_USE_CLI_AUTH === "1";
  const apiKey = useCliAuth ? "" : process.env.CODEX_API_KEY || process.env.OPENAI_API_KEY || "";
  const codexEnv = {
    PATH: process.env.PATH || "",
    HOME: process.env.HOME || "",
    CODEX_HOME: process.env.CODEX_HOME || ""
  };

  if (apiKey) {
    codexEnv.OPENAI_API_KEY = apiKey;
    codexEnv.CODEX_API_KEY = apiKey;
  }

  const codex = new Codex({
    apiKey: apiKey || undefined,
    env: codexEnv
  });

  try {
    const thread = codex.startThread({
      workingDirectory: process.cwd(),
      skipGitRepoCheck: true,
      sandboxMode: "read-only",
      approvalPolicy: "never",
      modelReasoningEffort: "low",
      networkAccessEnabled: false,
      webSearchEnabled: false
    });
    const turn = await thread.run(buildCodexPrompt({ input, person }), {
      outputSchema: giftOptionsSchema,
      signal: controller.signal
    });

    return validateGiftOptions(JSON.parse(turn.finalResponse));
  } finally {
    clearTimeout(timeout);
  }
}

function buildCodexPrompt({ input, person }) {
  return [
    "You are powering an ecommerce birthday gift tool.",
    "Convert the added source into exactly three user-facing gift options.",
    "Do not create code, files, purchases, payment actions, telecom actions, or external service calls.",
    "Use only the provided person profile, existing catalog examples, and source text.",
    "Keep copy natural for a shopper. Avoid internal implementation labels.",
    JSON.stringify({
      person,
      sourceText: input,
      catalogExamples: gifts.map(({ id, name, caption, why, consider, displayPrice, delivery, seller, score }) => ({
        id,
        name,
        caption,
        why,
        risk: consider,
        displayPrice,
        delivery,
        seller,
        score
      }))
    })
  ].join("\n");
}

function validateGiftOptions(payload) {
  const rawOptions = Array.isArray(payload?.options) ? payload.options : [];
  const validated = rawOptions.slice(0, 3).map(validateGiftSourceCandidate);
  const fallbackOptions = generateFallbackGiftOptions();

  while (validated.length < 3) {
    validated.push(fallbackOptions[validated.length]);
  }

  return validated;
}

function validateGiftSourceCandidate(candidate) {
  const fallback = gifts[0];

  return {
    title: safeText(candidate?.title, fallback.name),
    caption: safeText(candidate?.caption, fallback.caption),
    why: safeText(candidate?.why, fallback.why),
    risk: safeText(candidate?.risk, fallback.consider),
    priceRange: safeText(candidate?.priceRange, fallback.displayPrice),
    deliveryNote: safeText(candidate?.deliveryNote, fallback.delivery),
    sellerSignal: safeText(candidate?.sellerSignal, fallback.seller),
    suggestedSearch: safeText(candidate?.suggestedSearch, `${fallback.name} birthday gift`),
    fitScore: clampScore(candidate?.fitScore)
  };
}

function chooseRelevantGift(input) {
  return chooseRelevantGifts(input)[0];
}

function chooseRelevantGifts(input) {
  const lower = input.toLowerCase();
  const ranked = gifts
    .map((gift) => ({
      gift,
      rank: scoreGiftAgainstInput(gift, lower)
    }))
    .sort((left, right) => right.rank - left.rank || right.gift.score - left.gift.score)
    .map(({ gift }) => gift);

  return ranked.length ? ranked : gifts;
}

function scoreGiftAgainstInput(gift, lowerInput) {
  const haystack = [gift.name, gift.caption, gift.why, gift.consider, ...(gift.basedOn || [])].join(" ").toLowerCase();
  return haystack
    .split(/\W+/)
    .filter((word) => word.length > 4 && lowerInput.includes(word))
    .length;
}

function extractSourceTopic(input) {
  const firstLine = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !isMetadataLine(line)) || "";
  return firstLine
    .replace(/^https?:\/\/\S+/i, "Gift idea from your source")
    .replace(/\s+/g, " ")
    .slice(0, 82);
}

function isMetadataLine(line) {
  return /^(source|recipient|from|subject|received|extracted gift signal|message):/i.test(line) || /^-\s*(lead|interests|avoid|budget|delivery):/i.test(line);
}

function normalizeSourceInput(input) {
  return safeText(input, "Handmade pottery class voucher with flexible weekend booking").slice(0, 1200);
}

function safeText(value, fallback) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed || fallback;
}

function clampScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return 82;
  return Math.min(100, Math.max(1, Math.round(score)));
}

function hasCodexCredential() {
  return Boolean(process.env.CODEX_API_KEY || process.env.OPENAI_API_KEY || process.env.CODEX_USE_CLI_AUTH === "1");
}
