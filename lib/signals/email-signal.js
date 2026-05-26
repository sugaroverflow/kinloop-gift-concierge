const INTEREST_PATTERNS = [
  ["pottery", ["pottery", "ceramic", "clay", "wheel", "vase", "bowl"]],
  ["espresso", ["espresso", "coffee", "beans", "grinder", "pour-over", "cafe"]],
  ["hosting", ["hosting", "dinner", "serving", "table", "guests", "cookbook"]],
  ["creative workshops", ["class", "workshop", "studio", "lesson", "making"]],
  ["independent makers", ["handmade", "independent", "maker", "artisan", "local"]]
];

const AVOID_PATTERNS = [
  ["generic mugs", ["generic mug", "mug set", "novelty mug"]],
  ["fitness gifts", ["fitness", "workout", "gym", "yoga mat"]],
  ["high price risk", ["expensive", "luxury", "over budget", "gbp 100", "£100"]]
];

export function createSignalFromEmail(email, { personId = "sarah" } = {}) {
  const text = normalizeWhitespace([email.subject, email.snippet, email.text].filter(Boolean).join("\n\n"));
  const interests = findMatches(text, INTEREST_PATTERNS);
  const avoid = findMatches(text, AVOID_PATTERNS);

  return {
    id: `synthetic:${email.id}`,
    source: "kinloop_synthetic_source",
    personId,
    receivedAt: resolveReceivedAt(email),
    from: email.from,
    subject: email.subject,
    text,
    extracted: {
      interests,
      avoid,
      giftLead: extractGiftLead(text),
      budget: extractBudget(text),
      delivery: extractDelivery(text)
    }
  };
}

export function formatSignalForCodex(signal) {
  const lines = [
    `Source: ${signal.source}`,
    `Recipient: ${signal.personId}`,
    `From: ${signal.from || "unknown sender"}`,
    `Subject: ${signal.subject || "untitled message"}`,
    `Received: ${signal.receivedAt}`,
    "",
    "Extracted gift signal:",
    `- Lead: ${signal.extracted.giftLead}`,
    `- Interests: ${signal.extracted.interests.length ? signal.extracted.interests.join(", ") : "none found"}`,
    `- Avoid: ${signal.extracted.avoid.length ? signal.extracted.avoid.join(", ") : "none found"}`,
    `- Budget: ${signal.extracted.budget || "not stated"}`,
    `- Delivery: ${signal.extracted.delivery || "not stated"}`,
    "",
    "Message:",
    signal.text
  ];

  return lines.join("\n");
}

function findMatches(text, patterns) {
  const lower = text.toLowerCase();
  return patterns
    .filter(([, needles]) => needles.some((needle) => lower.includes(needle)))
    .map(([label]) => label);
}

function extractGiftLead(text) {
  const sentence = text
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .find((line) => /gift|present|birthday|would love|wish|want|saw|found|shop|buy/i.test(line));

  return sentence || text.slice(0, 180) || "Gift idea from synthetic source";
}

function extractBudget(text) {
  return text.match(/(?:GBP|£)\s?\d+(?:\s?[-–]\s?(?:GBP|£)?\s?\d+)?/i)?.[0] || "";
}

function extractDelivery(text) {
  return text.match(/(?:ships?\s+)?(?:before|by)\s+[A-Z][a-z]+\s+\d{1,2}|arrives?\s+[A-Z][a-z]+\s+\d{1,2}/i)?.[0] || "";
}

function resolveReceivedAt(email) {
  if (email.internalDate) {
    const date = new Date(Number(email.internalDate));
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }

  const date = new Date(email.date);
  if (!Number.isNaN(date.getTime())) return date.toISOString();
  return new Date().toISOString();
}

function normalizeWhitespace(value) {
  return value.trim().replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
}
