export const openClawModes = {
  REAL: "real",
  CLI: "cli",
  PREVIEW: "preview",
  LOCAL: "local",
  DISABLED: "disabled"
};

export function resolveOpenClawMode(env = process.env) {
  const mode = env.OPENCLAW_MODE || openClawModes.PREVIEW;
  if (Object.values(openClawModes).includes(mode)) return mode;
  return openClawModes.PREVIEW;
}

export function canSendOpenClaw(mode) {
  return mode === openClawModes.REAL || mode === openClawModes.CLI;
}

export function isOpenClawTargetAllowed(target, env = process.env) {
  const allowlist = String(env.OPENCLAW_TARGET_ALLOWLIST || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (allowlist.length === 0) return false;
  return allowlist.includes(target);
}
