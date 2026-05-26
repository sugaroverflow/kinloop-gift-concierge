import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createSignalFromEmail, formatSignalForCodex } from "../lib/signals/email-signal.js";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUTBOX = path.join(ROOT, "sample-emails/outbox");
const OUTPUT = path.join(ROOT, "data/kinloop/agentmail-inbox-sample.json");

const FRIENDS = {
  "elara-moonwell": {
    personId: "sarah",
    displayName: "Elara Moonwell",
    email: "elara.moonwell@gmail.com",
    relation: "Close friend"
  },
  "torin-oakenspire": {
    personId: "mateo",
    displayName: "Torin Oakenspire",
    email: "torin.oakenspire@gmail.com",
    relation: "Colleague"
  },
  "lyra-starweave": {
    personId: "priya",
    displayName: "Lyra Starweave",
    email: "lyra.starweave@gmail.com",
    relation: "Sister"
  },
  "celeste-fernwick": {
    personId: "amina",
    displayName: "Celeste Fernwick",
    email: "celeste.fernwick@gmail.com",
    relation: "Mentor"
  },
  "rowan-ashvale": {
    personId: "rowan",
    displayName: "Rowan Ashvale",
    email: "rowan.ashvale@gmail.com",
    relation: "Friend / activist"
  }
};

const MESSAGE_DATES = {
  "elara-moonwell/03-pottery-studio-open-house.msg3.txt": "2026-05-17T16:02:00.000Z"
};

function parseSampleFile(content, relativePath) {
  const subjectMatch = content.match(/^Subject: (.+)$/m);
  const body = content.split("---\n")[1]?.trim() || "";
  const threadMatch = relativePath.match(/\/(\d+)-([^.]+)(?:\.thread|\.msg\d+)?\.txt$/);
  const friendKey = relativePath.split("/")[0];
  const threadSlug = threadMatch ? `${threadMatch[1]}-${threadMatch[2]}` : path.basename(relativePath, ".txt");
  const messageKind = relativePath.includes(".thread.txt") ? "thread" : "message";
  const messageOrdinal = relativePath.match(/\.msg(\d+)\.txt$/)?.[1] || (messageKind === "thread" ? "1" : "1");

  return {
    friendKey,
    threadSlug,
    threadId: `${friendKey}/${threadSlug}`,
    messageKind,
    messageOrdinal: Number(messageOrdinal),
    subject: subjectMatch?.[1] || "Untitled",
    body,
    relativePath
  };
}

function buildEmail(parsed, index) {
  const messageId = `sample_${parsed.friendKey}_${parsed.threadSlug}_${parsed.messageOrdinal}`;
  return {
    id: messageId,
    threadId: parsed.threadId,
    inboxId: "kinloop-agent@agentmail.to",
    from: "sugaroverflow@gmail.com",
    to: ["kinloop-agent@agentmail.to"],
    subject: parsed.subject,
    date: MESSAGE_DATES[parsed.relativePath] || `2026-05-${String(10 + (index % 18)).padStart(2, "0")}T${String(9 + (index % 10)).padStart(2, "0")}:00:00.000Z`,
    snippet: "",
    labels: [],
    text: parsed.body
  };
}

async function loadSampleMessages() {
  const entries = [];

  for (const friendKey of Object.keys(FRIENDS)) {
    const dir = path.join(OUTBOX, friendKey);
    const files = (await readdir(dir)).filter((name) => name.endsWith(".txt")).sort();
    for (const file of files) {
      const relativePath = `${friendKey}/${file}`;
      const content = await readFile(path.join(dir, file), "utf8");
      entries.push(parseSampleFile(content, relativePath));
    }
  }

  return entries.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function aggregateByPerson(signals) {
  const byPerson = {};

  for (const entry of signals) {
    const bucket = byPerson[entry.personId] || {
      personId: entry.personId,
      friendKey: entry.friendKey,
      displayName: entry.friend.displayName,
      messageCount: 0,
      threadIds: new Set(),
      interests: new Set(),
      avoid: new Set(),
      subjects: []
    };

    bucket.messageCount += 1;
    bucket.threadIds.add(entry.threadId);
    entry.signal.extracted.interests.forEach((value) => bucket.interests.add(value));
    entry.signal.extracted.avoid.forEach((value) => bucket.avoid.add(value));
    bucket.subjects.push(entry.signal.subject);
    byPerson[entry.personId] = bucket;
  }

  return Object.fromEntries(
    Object.entries(byPerson).map(([personId, bucket]) => [
      personId,
      {
        personId,
        friendKey: bucket.friendKey,
        displayName: bucket.displayName,
        messageCount: bucket.messageCount,
        threadCount: bucket.threadIds.size,
        interests: [...bucket.interests],
        avoid: [...bucket.avoid],
        subjects: bucket.subjects
      }
    ])
  );
}

function buildThreads(signals) {
  const threads = new Map();

  for (const entry of signals) {
    const thread = threads.get(entry.threadId) || {
      threadId: entry.threadId,
      friendKey: entry.friendKey,
      personId: entry.personId,
      displayName: entry.friend.displayName,
      subjectRoot: entry.signal.subject.replace(/^Re: /i, ""),
      messages: []
    };

    thread.messages.push({
      messageId: entry.messageId,
      kind: entry.messageKind,
      ordinal: entry.messageOrdinal,
      sampleFile: entry.sampleFile,
      receivedAt: entry.signal.receivedAt,
      subject: entry.signal.subject,
      signal: entry.signal,
      sourceText: entry.sourceText
    });
    threads.set(entry.threadId, thread);
  }

  return [...threads.values()].map((thread) => ({
    ...thread,
    messages: thread.messages.sort((a, b) => a.ordinal - b.ordinal)
  }));
}

const parsedMessages = await loadSampleMessages();
const signals = parsedMessages.map((parsed, index) => {
  const friend = FRIENDS[parsed.friendKey];
  const email = buildEmail(parsed, index);
  const signal = createSignalFromEmail(email, { personId: friend.personId });

  return {
    messageId: email.id,
    threadId: parsed.threadId,
    friendKey: parsed.friendKey,
    personId: friend.personId,
    friend,
    messageKind: parsed.messageKind,
    messageOrdinal: parsed.messageOrdinal,
    sampleFile: parsed.relativePath,
    signal,
    sourceText: formatSignalForCodex(signal)
  };
});

signals.sort((a, b) => new Date(b.signal.receivedAt) - new Date(a.signal.receivedAt));
const LATEST_SAMPLE_FILE = "elara-moonwell/03-pottery-studio-open-house.msg3.txt";
const latest = signals.find((entry) => entry.sampleFile === LATEST_SAMPLE_FILE) || signals[0];
const threads = buildThreads(signals);
const byPerson = aggregateByPerson(signals);

const fixture = {
  schemaVersion: "1.0",
  kind: "kinloop_agentmail_inbox_import",
  description: "Sample AgentMail inbox import for Kinloop testing and OpenClaw agent contract.",
  inboxId: "kinloop-agent@agentmail.to",
  importedAt: "2026-05-26T18:00:00.000Z",
  importedBy: "openclaw",
  operator: {
    email: "sugaroverflow@gmail.com"
  },
  stats: {
    messageCount: signals.length,
    threadCount: threads.length,
    friendCount: Object.keys(FRIENDS).length
  },
  friends: Object.entries(FRIENDS).map(([friendKey, friend]) => ({
    friendKey,
    ...friend
  })),
  latestImport: {
    ok: true,
    signal: latest.signal,
    sourceText: latest.sourceText
  },
  signals: signals.map(({ signal, sourceText, messageId, threadId, friendKey, personId, sampleFile, messageKind, messageOrdinal }) => ({
    messageId,
    threadId,
    friendKey,
    personId,
    sampleFile,
    messageKind,
    messageOrdinal,
    signal,
    sourceText
  })),
  threads,
  byPerson
};

await writeFile(OUTPUT, `${JSON.stringify(fixture, null, 2)}\n`);
console.log(`Wrote ${OUTPUT}`);
console.log(`messages=${signals.length} threads=${threads.length} latest=${latest.sampleFile}`);
