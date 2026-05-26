const approvalMap = new Map([
  ["1", "pottery-voucher"],
  ["2", "espresso-kit"],
  ["3", "hosting-care"]
]);

export function parseOpenClawReply(input) {
  const raw = String(input || "").trim();
  const normalized = raw.toLowerCase();

  if (approvalMap.has(normalized)) {
    return { type: "approve", giftId: approvalMap.get(normalized), raw };
  }

  if (normalized === "defer" || normalized === "d") {
    return { type: "defer", raw };
  }

  if (normalized === "review" || normalized === "open" || normalized === "dashboard") {
    return { type: "open_dashboard", raw };
  }

  return { type: "unknown", raw };
}
