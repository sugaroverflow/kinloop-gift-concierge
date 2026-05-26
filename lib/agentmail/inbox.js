const AGENTMAIL_API_ROOT = "https://api.agentmail.to/v0";
const DEFAULT_INBOX_ID = "kinloop-agent@agentmail.to";

export function getAgentMailConfig(env = process.env) {
  return {
    apiKey: env.AGENTMAIL_API_KEY || "",
    inboxId: env.AGENTMAIL_INBOX_ID || DEFAULT_INBOX_ID,
    includeUnauthenticated: env.AGENTMAIL_INCLUDE_UNAUTHENTICATED === "1"
  };
}

export function isAgentMailConfigured(env = process.env) {
  const config = getAgentMailConfig(env);
  return Boolean(config.apiKey && config.inboxId);
}

export async function fetchLatestAgentMailMessage({ env = process.env, limit = 1 } = {}) {
  const config = getAgentMailConfig(env);
  if (!config.apiKey) {
    throw new Error("Kinloop AgentMail API key is not configured.");
  }

  const messages = await listMessages({ config, limit });
  const latest = messages[0];
  if (!latest) return null;

  return getMessage({
    config,
    messageId: latest.message_id
  });
}

async function listMessages({ config, limit }) {
  const url = new URL(`${AGENTMAIL_API_ROOT}/inboxes/${encodeURIComponent(config.inboxId)}/messages`);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("ascending", "false");
  if (config.includeUnauthenticated) {
    url.searchParams.set("include_unauthenticated", "true");
  }

  const payload = await agentMailFetch(url, config);
  return payload.messages || [];
}

async function getMessage({ config, messageId }) {
  const url = new URL(
    `${AGENTMAIL_API_ROOT}/inboxes/${encodeURIComponent(config.inboxId)}/messages/${encodeURIComponent(messageId)}`
  );
  const message = await agentMailFetch(url, config);
  const text = message.extracted_text || message.text || stripHtml(message.extracted_html || message.html || "");

  return {
    id: message.message_id,
    threadId: message.thread_id,
    inboxId: message.inbox_id,
    from: message.from || "",
    to: message.to || [],
    subject: message.subject || "",
    date: message.timestamp || message.created_at || "",
    snippet: message.preview || "",
    labels: message.labels || [],
    text
  };
}

async function agentMailFetch(url, config) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${config.apiKey}` },
    cache: "no-store"
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = payload.error?.message || payload.message || response.statusText;
    throw new Error(`AgentMail request failed. ${detail}`.trim());
  }

  return payload;
}

function stripHtml(value) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
