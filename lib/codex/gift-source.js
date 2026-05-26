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

export const productCurationSchema = {
  type: "object",
  properties: {
    productIds: {
      type: "array",
      minItems: 0,
      maxItems: 6,
      items: { type: "string" }
    }
  },
  required: ["productIds"],
  additionalProperties: false
};

export async function generateGiftSource({ input = "", personId = "sarah", preferLive = false, brief, sourceSignal } = {}) {
  const request = normalizeGiftSourceRequest({ input, personId, preferLive, brief, sourceSignal });
  const normalizedInput = request.sourceText;
  const person = request.person;
  let productSource = await loadProductCandidates({
    input: normalizedInput,
    person,
    preferLive: request.preferLive
  });

  if (!request.preferLive || !hasCodexCredential()) {
    productSource = productSource.source === "shopify_ucp_mcp"
      ? fallbackProductSource({ input: normalizedInput, person, reason: "Codex product curation is unavailable." })
      : productSource;
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
    productSource = await curateProductSource({
      input: normalizedInput,
      person,
      productSource
    });
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
    productSource = productSource.source === "shopify_ucp_mcp"
      ? fallbackProductSource({
          input: normalizedInput,
          person,
          reason: error instanceof Error ? error.message : "Codex SDK source analysis failed"
        })
      : productSource;
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
  const likes = person.likes?.slice(0, 3).join(", ") || "their known interests";

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
  }, { products: [baseGift], index: 0, person, input });
}

export function generateFallbackGiftOptions({ input = "", person = recipients[0], products = gifts } = {}) {
  const rankedGifts = chooseRelevantGifts({ input, person, products });
  const personFirstName = firstName(person?.name || "");

  return rankedGifts.slice(0, 3).map((gift, index) => validateGiftSourceCandidate({
    title: safeText(gift.name, "Curated gift option"),
    caption: safeText(gift.caption, "Gift details available before approval."),
    why: gift.why,
    risk: gift.consider || "Confirm timing, returns, and fit before approving.",
    priceRange: gift.displayPrice || "GBP 40-75",
    deliveryNote: gift.delivery || "Check delivery before June 2",
    sellerSignal: gift.seller || "Seller details need review",
    suggestedSearch: `${personFirstName} ${safeText(gift.name, "gift")} birthday gift`,
    productId: gift.id,
    rank: index + 1,
    matchLabel: matchLabel(index + 1),
    fitScore: Math.min(98, Math.max(68, Number(gift.score || 80) - index))
  }, { products: rankedGifts, index, person, input }));
}

async function curateProductSource({ input, person, productSource }) {
  if (productSource.source !== "shopify_ucp_mcp") return productSource;

  const curatedProducts = await curateProductsWithCodex({
    input,
    person,
    products: productSource.products
  });
  if (curatedProducts.length >= 3) {
    return {
      ...productSource,
      products: curatedProducts,
      curation: "codex_candidate_filter"
    };
  }

  return {
    curation: "codex_candidate_filter",
    ...fallbackProductSource({
      input,
      person,
      reason: "Codex rejected Shopify candidates that did not fit the recipient source signals."
    })
  };
}

function fallbackProductSource({ input, person, reason }) {
  return {
    source: "mock_retailer_feed",
    fallbackReason: reason,
    products: selectGiftProducts({ input, person, products: gifts, limit: 12 })
  };
}

async function curateProductsWithCodex({ input, person, products }) {
  const prompt = buildProductCurationPrompt({ input, person, products });
  const payload = await runCodexStructured({
    prompt,
    schema: productCurationSchema,
    timeoutMs: Number(process.env.CODEX_PRODUCT_CURATION_TIMEOUT_MS || 12000)
  });
  const selectedIds = Array.isArray(payload?.productIds) ? payload.productIds.map(String) : [];
  const selected = selectedIds
    .map((id) => products.find((product) => product.id === id))
    .filter(Boolean)
    .filter((product) => !isUnsafeProductForPerson(product, person));
  return dedupeGiftOptions(selected.map((product, index) => ({ ...product, productId: product.id, rank: index + 1 })))
    .map((option) => products.find((product) => product.id === option.productId))
    .filter(Boolean);
}

async function generateCodexGiftOptions({ input, person, products }) {
  const payload = await runCodexStructured({
    prompt: buildCodexPrompt({ input, person, products }),
    schema: giftOptionsSchema,
    timeoutMs: Number(process.env.CODEX_GIFT_SOURCE_TIMEOUT_MS || 15000)
  });

  return validateGiftOptions(payload, { products, person, input });
}

async function runCodexStructured({ prompt, schema, timeoutMs }) {
  const { Codex } = await import("@openai/codex-sdk");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
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
    const turn = await thread.run(prompt, {
      outputSchema: schema,
      signal: controller.signal
    });

    return JSON.parse(turn.finalResponse);
  } finally {
    clearTimeout(timeout);
  }
}

function buildProductCurationPrompt({ input, person, products = [] }) {
  return [
    "You are filtering Shopify catalog candidates before a gift recommendation step.",
    "Return only productIds for real gift products that fit the recipient source signals.",
    "Reject service charges, fees, deposits, warranties, shipping charges, checkout charges, and non-products.",
    "Reject anything matching the avoid list. If avoid says generic mugs, reject mugs and mug-like products.",
    "Prefer products connected to source clues, relationship context, budget, and birthday timing.",
    "Return up to six productIds. Return an empty list if none are appropriate.",
    "Do not invent productIds. Use only the provided product candidates.",
    JSON.stringify({
      giftBrief: relationshipBriefForPrompt(person),
      sourceText: input,
      productFeedCandidates: products.map(({ id, name, caption, why, consider, displayPrice, delivery, seller, price, match, catalog }) => ({
        id,
        name,
        caption,
        why,
        risk: consider,
        displayPrice,
        price,
        delivery,
        seller,
        match,
        category: catalog?.category
      }))
    })
  ].join("\n");
}

function buildCodexPrompt({ input, person, products = gifts }) {
  return [
    "You are powering an ecommerce birthday gift tool.",
    "Convert the added source into exactly three user-facing gift options.",
    "Rank the options as: rank 1 Best match, rank 2 Strong match, rank 3 Safe backup.",
    "Each option must correspond to one provided product candidate and include productId.",
    "Caption and why must be relational and specific to this recipient.",
    "Each option should mention recipient clues and either budget or birthday timing.",
    "Never use placeholder phrasing like 'curated idea from your source', 'imported signal', or 'matched from catalog search'.",
    "Never use gendered pronouns such as her/his; use the recipient name.",
    "Write distinct caption and why text for each option.",
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

function validateGiftOptions(payload, { products = gifts, person = recipients[0], input = "" } = {}) {
  const rawOptions = Array.isArray(payload?.options) ? payload.options : [];
  const validated = rawOptions.slice(0, 3).map((candidate, index) => validateGiftSourceCandidate(candidate, { products, index, person, input }));
  const fallbackOptions = generateFallbackGiftOptions({ input, person, products });
  const deduped = dedupeGiftOptions(validated);

  for (const fallback of fallbackOptions) {
    if (deduped.length >= 3) break;
    const key = optionDedupeKey(fallback);
    if (deduped.some((option) => optionDedupeKey(option) === key)) continue;
    deduped.push(fallback);
  }

  while (deduped.length < 3) {
    deduped.push(validateGiftSourceCandidate({}, { products: gifts, index: deduped.length, person, input }));
  }

  return deduped.slice(0, 3).map((option, index) => ({
    ...option,
    rank: index + 1,
    matchLabel: matchLabel(index + 1)
  }));
}

function validateGiftSourceCandidate(candidate, { products = gifts, index = 0, person = recipients[0], input = "" } = {}) {
  const fallback = resolveCandidateProduct(candidate, products) || products[index] || products[0] || gifts[0];
  const rank = clampRank(candidate?.rank || index + 1);
  const personFirstName = firstName(person?.name || "");
  const clueText = relationalClueText({ person, fallback, input });
  const relationalCaption = `${safeText(fallback.name, "This option")} fits ${personFirstName}'s ${clueText} notes without feeling generic.`;
  const relationalWhy = `The source points to ${clueText}; this stays close to ${safeText(person?.budget, "the budget")} and leaves time before ${safeText(person?.birthday, "the birthday")}.`;
  const candidateCaption = safeText(candidate?.caption, relationalCaption);
  const candidateWhy = safeText(candidate?.why, relationalWhy);

  return {
    title: safeText(candidate?.title, fallback.name),
    caption: ensureRelationalCaption(candidateCaption, { person, fallback, input, relationalCaption }),
    why: ensureRelationalWhy(candidateWhy, { person, fallback, input, relationalWhy }),
    risk: safeText(candidate?.risk, fallback.consider),
    priceRange: shouldRewritePriceText(candidate?.priceRange)
      ? safeText(fallback.displayPrice, "Confirm price before approving")
      : safeText(candidate?.priceRange, safeText(fallback.displayPrice, "Confirm price before approving")),
    deliveryNote: shouldRewriteDeliveryText(candidate?.deliveryNote)
      ? safeText(fallback.delivery, `Confirm arrival before ${safeText(person?.birthday, "the birthday")}`)
      : safeText(candidate?.deliveryNote, safeText(fallback.delivery, `Confirm arrival before ${safeText(person?.birthday, "the birthday")}`)),
    sellerSignal: safeText(candidate?.sellerSignal, fallback.seller),
    suggestedSearch: safeText(candidate?.suggestedSearch, `${personFirstName} ${safeText(fallback.name, "gift")} birthday gift`),
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
    curation: productSource.curation || null,
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
  const resolved = textFromUnknown(value);
  if (resolved) return resolved;
  const fallbackText = textFromUnknown(fallback);
  return fallbackText || "Details available before approval";
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

function dedupeGiftOptions(options = []) {
  const seen = new Set();
  const deduped = [];

  for (const option of options) {
    const key = optionDedupeKey(option);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(option);
  }

  return deduped;
}

function optionDedupeKey(option = {}) {
  const productId = textFromUnknown(option.productId).toLowerCase();
  const title = textFromUnknown(option.title).toLowerCase();
  return `${productId}::${title}`;
}

function textFromUnknown(value) {
  if (typeof value === "string") {
    const trimmed = value.trim().replace(/\s+/g, " ");
    return trimmed || "";
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    const joined = value.map((item) => textFromUnknown(item)).filter(Boolean).join(" ");
    return joined.trim();
  }

  if (value && typeof value === "object") {
    const candidateKeys = ["title", "name", "text", "value", "label", "caption", "description"];
    for (const key of candidateKeys) {
      const next = textFromUnknown(value[key]);
      if (next) return next;
    }
  }

  return "";
}

function firstName(name = "") {
  const cleaned = safeText(name, "Recipient");
  return cleaned.split(" ")[0] || "Recipient";
}

function relationalClueText({ person, fallback, input = "" } = {}) {
  const personClues = uniqueClean([...(person?.clues || []), ...(person?.likes || [])]);
  const fallbackClues = uniqueClean(fallback?.basedOn || []);
  const signalClues = extractSignalKeywords(input);
  const clues = uniqueClean([...personClues, ...signalClues, ...fallbackClues]).slice(0, 2);
  if (!clues.length) return "gift";
  if (clues.length === 1) return clues[0];
  return `${clues[0]} and ${clues[1]}`;
}

function extractSignalKeywords(input = "") {
  const stopWords = new Set(["source", "recipient", "subject", "message", "gift", "birthday", "from", "with", "that", "this", "they", "them", "their", "before", "after", "within", "about"]);
  return uniqueClean(
    safeText(input, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length >= 4 && !stopWords.has(token))
      .slice(0, 8)
  );
}

function shouldRewriteRelationalText(value) {
  const text = textFromUnknown(value).toLowerCase();
  if (!text) return true;
  const genericPatterns = [
    "curated idea",
    "imported signal",
    "birthday brief",
    "catalog search",
    "gift signals",
    "shown by merchant",
    "merchant checkout",
    "confirmed at checkout",
    "details available before approval",
    "[object object]"
  ];
  if (genericPatterns.some((pattern) => text.includes(pattern))) return true;
  if (/\b(her|his)\b/.test(text)) return true;
  return false;
}

function shouldRewritePriceText(value) {
  const text = textFromUnknown(value).toLowerCase();
  if (!text) return true;
  return text.includes("price shown") || text.includes("merchant checkout") || text.includes("confirmed at checkout");
}

function shouldRewriteDeliveryText(value) {
  const text = textFromUnknown(value).toLowerCase();
  if (!text) return true;
  return text.includes("delivery shown") || text.includes("merchant checkout");
}

function isUnsafeProductForPerson(product, person) {
  const haystack = [
    product?.name,
    product?.caption,
    product?.why,
    product?.match,
    product?.seller,
    ...(product?.basedOn || [])
  ].join(" ").toLowerCase();
  const blockedTerms = [
    "scripting charge",
    "service charge",
    "shipping charge",
    "delivery charge",
    "handling fee",
    "processing fee",
    "custom fee",
    "deposit",
    "warranty",
    "insurance"
  ];
  if (blockedTerms.some((term) => haystack.includes(term))) return true;

  const avoidTerms = uniqueClean(person?.avoid || [])
    .flatMap((term) => String(term).toLowerCase().split(/[^a-z0-9]+/))
    .filter((term) => term.length >= 3);
  if (avoidTerms.some((term) => haystack.includes(term) || haystack.includes(term.replace(/s$/, "")))) return true;

  const budgetMax = parseBudgetMax(person?.budget);
  if (budgetMax && Number(product?.price) > budgetMax * 2.5) return true;
  return false;
}

function parseBudgetMax(value = "") {
  const amounts = String(value).match(/\d+/g)?.map(Number) || [];
  if (!amounts.length) return 0;
  return Math.max(...amounts);
}

function ensureRelationalCaption(text, { person, fallback, input, relationalCaption }) {
  if (shouldRewriteRelationalText(text)) return relationalCaption;
  if (hasPersonSignal(text, person)) return text;
  const first = firstName(person?.name || "");
  const clueText = relationalClueText({ person, fallback, input });
  return `${text} Picked for ${first}'s ${clueText} profile.`;
}

function ensureRelationalWhy(text, { person, fallback, input, relationalWhy }) {
  if (shouldRewriteRelationalText(text)) return relationalWhy;
  const normalized = text.toLowerCase();
  const includesTiming = normalized.includes("timeline") || normalized.includes("delivery") || normalized.includes("birthday");
  if (hasPersonSignal(text, person) && includesTiming) return text;
  const first = firstName(person?.name || "");
  const birthday = safeText(person?.birthday, "upcoming birthday");
  const clueText = relationalClueText({ person, fallback, input });
  return `${text} It stays aligned with ${first}'s ${clueText} clues and the ${birthday} deadline.`;
}

function hasPersonSignal(text, person) {
  const normalized = textFromUnknown(text).toLowerCase();
  if (!normalized) return false;
  const first = firstName(person?.name || "").toLowerCase();
  if (normalized.includes(first)) return true;
  const signalTerms = uniqueClean([...(person?.clues || []), ...(person?.likes || [])])
    .map((term) => term.toLowerCase())
    .filter((term) => term.length >= 4);
  return signalTerms.some((term) => normalized.includes(term));
}

function hasCodexCredential() {
  return Boolean(process.env.CODEX_API_KEY || process.env.OPENAI_API_KEY || process.env.CODEX_USE_CLI_AUTH === "1");
}
