export function buildReminderPayload({
  recipientName = "Sarah",
  birthday = "June 2",
  giftOptions = [],
  approvalUrl = "http://localhost:3000"
} = {}) {
  const options = giftOptions.slice(0, 3).map((gift, index) => {
    const title = gift.title || gift.name;
    const price = gift.priceRange || gift.displayPrice || "";
    return `${index + 1}. ${title}${price ? ` (${price})` : ""}`;
  });

  return {
    kind: "birthday_reminder",
    recipientName,
    birthday,
    approvalUrl,
    options,
    message: [
      `${recipientName}'s birthday is ${birthday}.`,
      "Kinloop has gift options ready for approval:",
      ...options,
      `Review: ${approvalUrl}`,
      "Reply 1, 2, 3, or defer."
    ].join("\n")
  };
}

export function buildOpenClawSendCommand({ target, message }) {
  return ["openclaw", "message", "send", "--to", target, "--body", message];
}

export function buildVoiceCallCommand({ to, message }) {
  return ["openclaw", "voicecall", "call", "--to", to, "--say", message];
}
