import { openClawModes, resolveOpenClawMode } from "../../../../lib/openclaw/modes.js";

export async function GET() {
  const mode = resolveOpenClawMode();
  const executeEnabled = process.env.OPENCLAW_CLI_EXECUTE === "1";
  const target = String(process.env.OPENCLAW_TEST_TARGET || "").trim();
  const allowlist = String(process.env.OPENCLAW_TARGET_ALLOWLIST || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const channel = String(process.env.OPENCLAW_CHANNEL || "").trim();
  const account = String(process.env.OPENCLAW_ACCOUNT || "").trim();
  const sshHost = String(process.env.OPENCLAW_SSH_HOST || "").trim();

  const ready = mode === openClawModes.CLI && executeEnabled && Boolean(target) && allowlist.includes(target) && Boolean(channel);

  return Response.json({
    ok: true,
    ready,
    mode,
    summary: summarizeStatus({ mode, executeEnabled, target, allowlist, channel }),
    setup: {
      executeEnabled,
      targetPresent: Boolean(target),
      targetAllowlisted: allowlist.includes(target),
      channelPresent: Boolean(channel),
      accountPresent: Boolean(account),
      remoteConfigured: Boolean(sshHost)
    }
  });
}

function summarizeStatus({ mode, executeEnabled, target, allowlist, channel }) {
  if (mode !== openClawModes.CLI) return "Reminder channel runs in preview until CLI mode is enabled.";
  if (!executeEnabled) return "Reminder channel is in preview. Enable live send to deliver messages.";
  if (!target) return "Set a reminder target to enable delivery.";
  if (!allowlist.includes(target)) return "Allowlist the reminder target before sending.";
  if (!channel) return "Choose a reminder channel before sending.";
  return "Reminder channel ready for allowlisted text delivery.";
}
