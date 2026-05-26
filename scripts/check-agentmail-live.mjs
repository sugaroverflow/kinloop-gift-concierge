import { fetchLatestAgentMailMessage, getAgentMailConfig, isAgentMailConfigured } from "../lib/agentmail/inbox.js";
import { createSignalFromEmail } from "../lib/signals/email-signal.js";

if (!isAgentMailConfigured()) {
  console.error("AgentMail live check requires AGENTMAIL_API_KEY and AGENTMAIL_INBOX_ID.");
  process.exit(1);
}

const config = getAgentMailConfig();
const email = await fetchLatestAgentMailMessage();

if (!email) {
  console.error(`No messages found in ${config.inboxId}.`);
  process.exit(1);
}

const signal = createSignalFromEmail(email);

console.log("AgentMail live check passed.");
console.log(`inbox=${config.inboxId}`);
console.log(`message=${email.id}`);
console.log(`subject=${email.subject || "(untitled)"}`);
console.log(`from=${email.from || "(unknown)"}`);
console.log(`lead=${signal.extracted.giftLead}`);
console.log(`interests=${signal.extracted.interests.join(", ") || "(none found)"}`);
