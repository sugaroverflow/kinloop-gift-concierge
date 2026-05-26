import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { isOpenClawTargetAllowed, openClawModes, resolveOpenClawMode } from "./modes.js";
import { buildOpenClawSendCommand, buildVoiceCallCommand } from "./payloads.js";

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

  const command = buildOpenClawSendCommand({ target, message: payload.message });

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

export async function startVoiceEscalation({
  to,
  message,
  mode = resolveOpenClawMode(),
  env = process.env,
  runner = runOpenClawCommand
}) {
  if (mode === openClawModes.DISABLED) {
    return disabledResult("voice");
  }

  if (mode === openClawModes.LOCAL) {
    return localResult("voice", message);
  }

  const command = buildVoiceCallCommand({ to, message });

  if (mode === openClawModes.CLI && env.OPENCLAW_CLI_EXECUTE === "1") {
    return executeAllowlistedCommand({ kind: "voice", target: to, command, mode, env, runner });
  }

  if (mode === openClawModes.PREVIEW || mode === openClawModes.CLI) {
    return {
      mode,
      sent: false,
      command,
      recovery: "browser_or_transcript"
    };
  }

  return {
    mode,
    sent: false,
    command,
    recovery: "browser_or_transcript",
    error: "Real OpenClaw voice transport is not wired yet."
  };
}

function disabledResult(kind) {
  return { mode: openClawModes.DISABLED, kind, sent: false, disabled: true };
}

function localResult(kind, preview) {
  return { mode: openClawModes.LOCAL, kind, sent: false, preview };
}

async function executeAllowlistedCommand({ kind, target, command, payload, mode, env, runner }) {
  if (!isOpenClawTargetAllowed(target, env)) {
    return {
      mode,
      kind,
      sent: false,
      command,
      payload,
      error: "Target is not in OPENCLAW_TARGET_ALLOWLIST."
    };
  }

  try {
    const result = await runner(command);
    return {
      mode,
      kind,
      sent: true,
      command,
      payload,
      stdout: result.stdout || "",
      stderr: result.stderr || ""
    };
  } catch (error) {
    return {
      mode,
      kind,
      sent: false,
      command,
      payload,
      error: error instanceof Error ? error.message : "OpenClaw CLI command failed"
    };
  }
}

async function runOpenClawCommand(command) {
  const [binary, ...args] = command;
  return execFileAsync(binary, args);
}
