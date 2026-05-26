import { fetchLatestAgentMailMessage, isAgentMailConfigured } from "../../../../lib/agentmail/inbox.js";
import { createSignalFromEmail, formatSignalForCodex } from "../../../../lib/signals/email-signal.js";

export const dynamic = "force-dynamic";

export async function GET() {
  return importLatestAgentMailSignal();
}

export async function POST() {
  return importLatestAgentMailSignal();
}

async function importLatestAgentMailSignal() {
  if (!isAgentMailConfigured()) {
    return Response.json(
      { ok: false, error: "Kinloop AgentMail inbox is not connected." },
      { status: 503 }
    );
  }

  try {
    const email = await fetchLatestAgentMailMessage();
    if (!email) {
      return Response.json(
        { ok: false, error: "No AgentMail hints were found for Kinloop." },
        { status: 404 }
      );
    }

    const signal = createSignalFromEmail(email);
    return Response.json({
      ok: true,
      signal,
      sourceText: formatSignalForCodex(signal)
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Kinloop AgentMail could not be read."
      },
      { status: 502 }
    );
  }
}
