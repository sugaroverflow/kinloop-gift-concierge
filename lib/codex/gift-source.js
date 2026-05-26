import { gifts, recipients, selectGiftProducts } from "../product-data.js";
import { loadProductCandidates } from "../product-source.js";

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
    productId: { type: "string" },
    rank: { type: "number" },
    matchLabel: { type: "string" },
    fitScore: { type: "number" }
  },
  required: ["title", "caption", "why", "risk", "priceRange", "deliveryNote", "sellerSignal", "suggestedSearch", "productId", "rank", "matchLabel", "fitScore"],
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

export async function generateGiftSource({ input = "", personId = "sarah", preferLive = false, brief, sourceSignal } = {}) {
  const request = normalizeGiftSourceRequest({ input, personId, preferLive, brief, sourceSignal });
  const normalizedInput = request.sourceText;
  const person = request.person;
  const productSource = await loadProductCandidates({
    input: normalizedInput,
    person,
    preferLive: request.preferLive
  });

  if (!request.preferLive || !hasCodexCredential()) {
    const options = generateFallbackGiftOptions({
      input: normalizedInput,
      person,
      products: productSource.products
    });
    return {
      source: productSource.source,
      mode: "deterministic_fallback",
      brief: request.brief,
      catalog: summarizeCatalogSource(productSource),
      fallbackReason: productSource.fallbackReason || null,
      candidate: options[0],
      options
    };
  }

  try {
    const options = await generateCodexGiftOptions({
      input: normalizedInput,
      person,
      products: productSource.products
    });
    return {
      source: "codex_sdk",
      mode: "codex_structured_transform",
      brief: request.brief,
      productSource: productSource.source,
      catalog: summarizeCatalogSource(productSource),
      candidate: options[0],
      options
    };
  } catch (error) {
    const options = generateFallbackGiftOptions({
      input: normalizedInput,
      person,
      products: productSource.products
    });
    return {
      source: productSource.source,
      mode: "deterministic_fallback",
      brief: request.brief,
      catalog: summarizeCatalogSource(productSource),
      fallbackReason: error instanceof Error ? error.message : "Codex SDK source analysis failed",
      candidate: options[0],
      options
    };
  }
}

export function generateFallbackGiftSource({ input = "", person = recipients[0] } = {}) {
  const baseGift = chooseRelevantGift({ input, person });
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

export function generateFallbackGiftOptions({ input = "", person = recipients[0], products = gifts } = {}) {
  const rankedGifts = chooseRelevantGifts({ input, person, products });

  return rankedGifts.slice(0, 3).map((gift, index) => validateGiftSourceCandidate({
    title: gift.name,
    caption: `${gift.caption} Interpreted from the imported signal and checked against ${person.name}'s birthday context.`,
    why: gift.why,
    risk: gift.consider || "Confirm timing, returns, and fit before approving.",
    priceRange: gift.displayPrice || "GBP 40-75",
    deliveryNote: gift.delivery || "Check delivery before June 2",
    sellerSignal: gift.seller || "Seller details need review",
    suggestedSearch: `${person.name.split(" ")[0]} ${gift.name} birthday gift`,
    productId: gift.id,
    rank: index + 1,
    matchLabel: matchLabel(index + 1),
    fitScore: Math.min(98, Math.max(68, Number(gift.score || 80) - index))
  }, rankedGifts, index));
}

async function generateCodexGiftOptions({ input, person, products }) {
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
    const turn = await thread.run(buildCodexPrompt({ input, person, products }), {
      outputSchema: giftOptionsSchema,
      signal: controller.signal
    });

    return validateGiftOptions(JSON.parse(turn.finalResponse), products);
  } finally {
    clearTimeout(timeout);
  }
}

function buildCodexPrompt({ input, person, products = gifts }) {
  return [
    "You are powering an ecommerce birthday gift tool.",
    "Convert the added source into exactly three user-facing gift options.",
    "Rank the options as: rank 1 Best match, rank 2 Strong match, rank 3 Safe backup.",
    "Each option must correspond to one provided product candidate and include productId.",
    "Do not create code, files, purchases, payment actions, telecom actions, or external service calls.",
    "Use only the provided person profile, product feed candidates, and source text.",
    "Keep copy natural for a shopper. Avoid internal implementation labels.",
    JSON.stringify({
      giftBrief: relationshipBriefForPrompt(person),
      sourceText: input,
      productFeedCandidates: products.map(({ id, name, caption, why, consider, displayPrice, delivery, seller, score, catalog }) => ({
        id,
        name,
        caption,
        why,
        risk: consider,
        displayPrice,
        delivery,
        seller,
        score,
        category: catalog?.category
      }))
    })
  ].join("\n");
}

function validateGiftOptions(payload, products = gifts) {
  const rawOptions = Array.isArray(payload?.options) ? payload.options : [];
  const validated = rawOptions.slice(0, 3).map((candidate, index) => validateGiftSourceCandidate(candidate, products, index));
  const fallbackOptions = generateFallbackGiftOptions({ products });

  while (validated.length < 3) {
    validated.push(fallbackOptions[validated.length]);
  }

  return validated;
}

function validateGiftSourceCandidate(candidate, products = gifts, index = 0) {
  const fallback = resolveCandidateProduct(candidate, products) || products[index] || products[0] || gifts[0];
  const rank = clampRank(candidate?.rank || index + 1);

  return {
    title: safeText(candidate?.title, fallback.name),
    caption: safeText(candidate?.caption, fallback.caption),
    why: safeText(candidate?.why, fallback.why),
    risk: safeText(candidate?.risk, fallback.consider),
    priceRange: safeText(candidate?.priceRange, fallback.displayPrice),
    deliveryNote: safeText(candidate?.deliveryNote, fallback.delivery),
    sellerSignal: safeText(candidate?.sellerSignal, fallback.seller),
    suggestedSearch: safeText(candidate?.suggestedSearch, `${fallback.name} birthday gift`),
    productId: safeText(candidate?.productId, fallback.id),
    rank,
    matchLabel: safeText(candidate?.matchLabel, matchLabel(rank)),
    fitScore: clampScore(candidate?.fitScore)
  };
}

function chooseRelevantGift({ input, person, products = gifts }) {
  return chooseRelevantGifts({ input, person, products })[0];
}

function chooseRelevantGifts({ input, person, products = gifts }) {
  const ranked = selectGiftProducts({ input, person, products, limit: 3 });
  return ranked.length ? ranked : gifts.slice(0, 3);
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

export function normalizeGiftSourceRequest(raw = {}) {
  const body = raw && typeof raw === "object" ? raw : {};
  const brief = objectOrEmpty(body.brief);
  const sourceSignal = objectOrEmpty(body.sourceSignal);
  const signal = objectOrEmpty(sourceSignal.signal);
  const extracted = objectOrEmpty(signal.extracted);
  const sourcePersonId = stringOrEmpty(signal.personId);
  const briefPersonId = stringOrEmpty(brief.personId);
  const resolvedPersonId = briefPersonId || sourcePersonId || stringOrEmpty(body.personId) || "sarah";
  const basePerson = recipients.find((recipient) => recipient.id === resolvedPersonId) || recipients[0];
  const clues = uniqueClean([
    ...arrayOfStrings(brief.clues),
    ...arrayOfStrings(brief.interests),
    ...arrayOfStrings(extracted.interests),
    ...(basePerson.likes || [])
  ]).slice(0, 8);
  const avoid = uniqueClean([
    ...arrayOfStrings(brief.avoid),
    ...arrayOfStrings(extracted.avoid),
    ...(basePerson.avoid || [])
  ]).slice(0, 8);
  const sourceText = normalizeSourceInput([
    stringOrEmpty(body.input),
    stringOrEmpty(sourceSignal.sourceText),
    stringOrEmpty(brief.sourceText),
    stringOrEmpty(extracted.giftLead) ? `Gift lead: ${stringOrEmpty(extracted.giftLead)}` : "",
    clues.length ? `Clues: ${clues.join(", ")}` : "",
    avoid.length ? `Avoid: ${avoid.join(", ")}` : ""
  ].filter(Boolean).join("\n"));
  const person = {
    ...basePerson,
    id: resolvedPersonId,
    name: stringOrEmpty(brief.name) || basePerson.name,
    relation: stringOrEmpty(brief.relationship) || stringOrEmpty(brief.relation) || basePerson.relation,
    birthday: stringOrEmpty(brief.birthday) || basePerson.birthday,
    timing: stringOrEmpty(brief.timing) || basePerson.timing,
    budget: stringOrEmpty(extracted.budget) || stringOrEmpty(brief.budget) || basePerson.budget,
    addressStatus: stringOrEmpty(brief.addressStatus) || basePerson.addressStatus,
    note: stringOrEmpty(brief.note) || stringOrEmpty(extracted.giftLead) || basePerson.note,
    giftTone: stringOrEmpty(brief.giftTone) || basePerson.giftTone,
    likes: clues,
    avoid,
    clues
  };

  return {
    preferLive: body.preferLive === true,
    sourceText,
    person,
    brief: {
      personId: person.id,
      name: person.name,
      relationship: person.relation,
      birthday: person.birthday,
      timing: person.timing,
      budget: person.budget,
      addressStatus: person.addressStatus,
      giftTone: person.giftTone,
      clues,
      avoid,
      sourceText
    }
  };
}

function objectOrEmpty(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function stringOrEmpty(value) {
  return typeof value === "string" ? value.trim() : "";
}

function arrayOfStrings(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

function summarizeCatalogSource(productSource) {
  return {
    source: productSource.source,
    fallbackReason: productSource.fallbackReason || null,
    candidateCount: productSource.products?.length || 0,
    productIds: (productSource.products || []).slice(0, 6).map((product) => product.id)
  };
}

function relationshipBriefForPrompt(person) {
  return {
    personId: person.id,
    name: person.name,
    relationship: person.relation,
    birthday: person.birthday,
    timing: person.timing,
    budget: person.budget,
    addressStatus: person.addressStatus,
    giftTone: person.giftTone,
    clues: person.clues || person.likes || [],
    avoid: person.avoid || [],
    note: person.note
  };
}

function resolveCandidateProduct(candidate, products = gifts) {
  const productId = candidate?.productId || candidate?.id || candidate?.catalogId;
  if (!productId) return null;
  return products.find((product) => product.id === productId) || gifts.find((gift) => gift.id === productId) || null;
}

function uniqueClean(values) {
  return [...new Set(values.filter((value) => typeof value === "string").map((value) => value.trim()).filter(Boolean))];
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

function clampRank(value) {
  const rank = Number(value);
  if (!Number.isFinite(rank)) return 1;
  return Math.min(3, Math.max(1, Math.round(rank)));
}

function matchLabel(rank) {
  if (rank === 1) return "Best match";
  if (rank === 2) return "Strong match";
  return "Safe backup";
}

function hasCodexCredential() {
  return Boolean(process.env.CODEX_API_KEY || process.env.OPENAI_API_KEY || process.env.CODEX_USE_CLI_AUTH === "1");
}
