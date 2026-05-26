import sourceBundle from "../data/kinloop/synthetic-source-sample.json" with { type: "json" };

const profileDefaults = {
  sarah: {
    birthday: "June 2",
    timing: "7 days",
    budget: "GBP 40-75",
    addressStatus: "Ready",
    giftTone: "Thoughtful, useful, not extravagant",
    clues: ["pottery", "espresso", "hosting", "creative workshops"],
    avoid: ["generic mugs"]
  },
  mateo: {
    birthday: "June 19",
    timing: "24 days",
    budget: "GBP 25-50",
    addressStatus: "Ready",
    giftTone: "Friendly, practical, easy to ship",
    clues: ["desk coffee", "cycling", "cookbooks", "hiking"],
    avoid: ["alcohol"]
  },
  priya: {
    birthday: "July 4",
    timing: "40 days",
    budget: "GBP 60-120",
    addressStatus: "Needs address",
    giftTone: "Considered and design-aware",
    clues: ["textiles", "plants", "design books", "independent makers"],
    avoid: ["kitchen gadgets"]
  },
  amina: {
    birthday: "August 11",
    timing: "78 days",
    budget: "GBP 35-65",
    addressStatus: "Ready",
    giftTone: "Warm, respectful, low-pressure",
    clues: ["gardening", "tea", "journaling", "community health"],
    avoid: ["scented candles"]
  },
  rowan: {
    birthday: "September 9",
    timing: "106 days",
    budget: "GBP 30-70",
    addressStatus: "Needs address",
    giftTone: "Useful, values-aligned, not flashy",
    clues: ["activism", "journalism", "fundraising", "rest"],
    avoid: ["flashy gifts"]
  }
};

const cluePatterns = [
  ["pottery", /\b(pottery|ceramic|ceramics|clay|wheel|serving bowl|bowls)\b/i],
  ["espresso", /\b(espresso|coffee|grinder|pour-over|beans)\b/i],
  ["hosting", /\b(hosting|dinner party|having people over|guests|serving)\b/i],
  ["creative workshops", /\b(workshop|class|studio|lesson|open house)\b/i],
  ["desk coffee", /\b(desk coffee|hand grinder|pour-over|single-origin|coffee lab)\b/i],
  ["cycling", /\b(cycling|bike|bike route|river route|gear ratio|ride)\b/i],
  ["cookbooks", /\b(cookbook|bread book|vegetarian|pasta book|recipe)\b/i],
  ["hiking", /\b(hike|mt\.?\s*tam|trail|switchback)\b/i],
  ["textiles", /\b(textile|fabric|linen|weave|indigo|napkins|curtains|deadstock)\b/i],
  ["plants", /\b(plant|plants|cuttings|pothos|succulent|balcony|plant swap)\b/i],
  ["design books", /\b(design book|book club|book pick|architecture|interiors)\b/i],
  ["independent makers", /\b(handmade|maker|artisan|vendor|flea|small mill|story)\b/i],
  ["gardening", /\b(garden|gardening|garden club|compost|raised bed|seedlings)\b/i],
  ["tea", /\b(tea|oolong|kettle|loose leaf|brew)\b/i],
  ["journaling", /\b(journal|journaling|morning pages|notebook|pages)\b/i],
  ["community health", /\b(community health|grant|partnership|public health|clinic)\b/i],
  ["activism", /\b(activism|court observation|detention|propublica|panel|organizing)\b/i],
  ["journalism", /\b(journalism|article|piece|propublica|reported|story)\b/i],
  ["fundraising", /\b(fundraiser|donation|campaign|photos)\b/i],
  ["rest", /\b(day off|rest|burnout|take a day|recover)\b/i]
];

const avoidPatterns = [
  ["generic mugs", /\b(generic mug|generic mugs|mug energy|novelty mug)\b/i],
  ["alcohol", /\b(no alcohol|dry month|alcohol)\b/i],
  ["kitchen gadgets", /\b(kitchen gadgets|gadget|gadgets)\b/i],
  ["scented candles", /\b(scented candle|scented candles|candle)\b/i],
  ["flashy gifts", /\b(flashy|luxury|performative)\b/i]
];

export function getSyntheticSourceBundle() {
  return sourceBundle;
}

export function derivePeopleFromSyntheticSource(bundle = sourceBundle) {
  const friends = Array.isArray(bundle.friends) ? bundle.friends : [];
  const signals = Array.isArray(bundle.signals) ? bundle.signals : [];
  const byPerson = bundle.byPerson && typeof bundle.byPerson === "object" ? bundle.byPerson : {};

  return friends
    .map((friend) => derivePerson({ friend, signals, sourceSummary: byPerson[friend.personId] }))
    .filter(Boolean)
    .sort(dueSoonest);
}

export function sourceTextForPersonId(personId, bundle = sourceBundle) {
  const signals = Array.isArray(bundle.signals) ? bundle.signals : [];
  return signals
    .filter((entry) => entry.personId === personId && entry.sourceText)
    .sort((left, right) => new Date(right.signal?.receivedAt || 0) - new Date(left.signal?.receivedAt || 0))
    .slice(0, 5)
    .map((entry) => entry.sourceText)
    .join("\n\n---\n\n");
}

function derivePerson({ friend, signals, sourceSummary }) {
  if (!friend?.personId) return null;

  const personSignals = signals.filter((entry) => entry.personId === friend.personId);
  const defaults = profileDefaults[friend.personId] || {};
  const rawMessageText = personSignals.map((entry) => [entry.signal?.subject, entry.signal?.text].filter(Boolean).join("\n")).join("\n\n");
  const extractedInterests = extractPatternLabels(rawMessageText, cluePatterns);
  const interests = uniqueClean(
    defaults.clues?.length ? defaults.clues : extractedInterests
  ).slice(0, 6);
  const avoid = uniqueClean([
    ...extractPatternLabels(rawMessageText, avoidPatterns),
    ...(defaults.avoid || [])
  ]).slice(0, 5);
  const budget = extractBudgetFromSignals(personSignals) || defaults.budget || "Budget flexible";
  const subjects = sourceSummary?.subjects || personSignals.map((entry) => entry.signal?.subject).filter(Boolean);
  const clues = interests.length ? interests : subjects.slice(0, 3);
  const note = buildSourceSummary({
    firstName: firstName(friend.displayName),
    tone: defaults.giftTone,
    clues,
    avoid,
    subjects
  });

  return {
    id: friend.personId,
    name: friend.displayName,
    relation: friend.relation,
    birthday: defaults.birthday || "Birthday pending",
    timing: defaults.timing || "Later",
    budget,
    status: "Imported from synthetic source",
    likes: clues,
    clues,
    avoid,
    note,
    addressStatus: defaults.addressStatus || "Needs address",
    giftTone: defaults.giftTone || "Thoughtful",
    sourceCount: sourceSummary?.messageCount || personSignals.length,
    sourceSubjects: subjects,
    sourceSummary: personSignals.slice(0, 3).map((entry, index) => ({
      id: entry.signal?.id || `${friend.personId}-signal-${index + 1}`,
      label: entry.signal?.subject || `Source signal ${index + 1}`,
      kind: "synthetic_email_signal",
      summary: cleanLead(entry.signal?.extracted?.giftLead) || entry.signal?.subject || "Gift signal from synthetic email data.",
      evidence: index === 0 ? "strong" : "medium"
    })),
    latestSourceText: sourceTextForPersonId(friend.personId)
  };
}

function buildSourceSummary({ firstName, tone, clues, avoid, subjects }) {
  const clueText = sentenceList(clues.slice(0, 3));
  const subjectText = sentenceList(subjects.slice(0, 2));
  const avoidText = sentenceList(avoid.slice(0, 2));
  const base = tone || "Thoughtful and useful";
  const context = clueText
    ? `${firstName} has been talking about ${clueText}.`
    : subjectText
      ? `${firstName}'s recent notes point to ${subjectText}.`
      : `${firstName}'s recent messages are ready for gift matching.`;
  const caution = avoidText ? `Avoid ${avoidText}.` : "";
  return [base + ".", context, caution].filter(Boolean).join(" ");
}

function extractBudgetFromSignals(signals) {
  const joined = signals.map((entry) => entry.sourceText || entry.signal?.text || "").join("\n");
  const match = joined.match(/(?:GBP|£|\$)\s?\d+(?:\s?[-–]\s?(?:GBP|£|\$)?\s?\d+)?/i);
  if (!match) return "";
  return match[0]
    .replace(/[$£]/g, "GBP ")
    .replace(/\s+/g, " ")
    .replace(/GBP\s+(\d+)\s?[-–]\s?GBP\s+(\d+)/i, "GBP $1-$2")
    .trim();
}

function cleanLead(value = "") {
  return String(value)
    .replace(/\n+/g, " ")
    .replace(/^>\s*/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 180)
    .trim();
}

function extractPatternLabels(text, patterns) {
  return patterns
    .filter(([, pattern]) => pattern.test(text))
    .map(([label]) => label);
}

function uniqueClean(values = []) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function sentenceList(values = []) {
  const clean = uniqueClean(values);
  if (clean.length <= 1) return clean[0] || "";
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")}, and ${clean.at(-1)}`;
}

function firstName(name = "") {
  return String(name).split(" ")[0] || "They";
}

function dueSoonest(left, right) {
  return timingDays(left.timing) - timingDays(right.timing);
}

function timingDays(value) {
  const match = String(value || "").match(/\d+/);
  return match ? Number(match[0]) : 999;
}
