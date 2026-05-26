export function buildReminderPayload({
  recipientName = "Recipient",
  birthday = "upcoming birthday",
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

export function buildOpenClawSendCommand({ target, message, channel = "", account = "" }) {
  const command = ["openclaw", "message", "send", "--target", target, "--message", message];
  if (channel) command.push("--channel", channel);
  if (account) command.push("--account", account);
  return command;
}
