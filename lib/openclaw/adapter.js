import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { isOpenClawTargetAllowed, openClawModes, resolveOpenClawMode } from "./modes.js";
import { buildOpenClawSendCommand } from "./payloads.js";

const execFileAsync = promisify(execFile);

export async function sendReminderViaOpenClaw({
  target,
  payload,
  mode = resolveOpenClawMode(),
  env = process.env,
  runner = runOpenClawCommand
}) {
  if (mode === openClawModes.DISABLED) {
    return disabledResult("message");
  }

  if (mode === openClawModes.LOCAL) {
    return localResult("message", payload.message);
  }

  const command = buildOpenClawSendCommand({
    target,
    message: payload.message,
    channel: env.OPENCLAW_CHANNEL || "",
    account: env.OPENCLAW_ACCOUNT || ""
  });

  if (mode === openClawModes.CLI && env.OPENCLAW_CLI_EXECUTE === "1") {
    return executeAllowlistedCommand({ kind: "message", target, command, payload, mode, env, runner });
  }

  if (mode === openClawModes.PREVIEW || mode === openClawModes.CLI) {
    return {
      mode,
      sent: false,
      command,
      payload
    };
  }

  return {
    mode,
    sent: false,
    command,
    payload,
    error: "Real OpenClaw API/VPS transport is not wired yet."
  };
}

function disabledResult(kind) {
  return { mode: openClawModes.DISABLED, kind, sent: false, disabled: true };
}

function localResult(kind, preview) {
  return { mode: openClawModes.LOCAL, kind, sent: false, preview };
}

async function executeAllowlistedCommand({ kind, target, command, payload, mode, env, runner }) {
  const commandToRun = withRemoteOpenClaw(command, env);

  if (!isOpenClawTargetAllowed(target, env)) {
    return {
      mode,
      kind,
      sent: false,
      command: commandToRun,
      payload,
      error: "Target is not in OPENCLAW_TARGET_ALLOWLIST."
    };
  }

  try {
    const result = await runner(commandToRun);
    return {
      mode,
      kind,
      sent: true,
      command: commandToRun,
      payload,
      stdout: result.stdout || "",
      stderr: result.stderr || ""
    };
  } catch (error) {
    return {
      mode,
      kind,
      sent: false,
      command: commandToRun,
      payload,
      error: error instanceof Error ? error.message : "OpenClaw CLI command failed"
    };
  }
}

function withRemoteOpenClaw(command, env) {
  const host = String(env.OPENCLAW_SSH_HOST || "").trim();
  if (!host) return command;

  const sshOptions = String(env.OPENCLAW_SSH_OPTIONS || "")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const remotePrefix = String(env.OPENCLAW_SSH_REMOTE_PREFIX || "").trim();
  const baseCommand = command.map(shellQuote).join(" ");
  const remoteCommand = remotePrefix ? `${remotePrefix} ${baseCommand}` : baseCommand;
  return ["ssh", ...sshOptions, host, remoteCommand];
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

async function runOpenClawCommand(command) {
  const [binary, ...args] = command;
  return execFileAsync(binary, args);
}
