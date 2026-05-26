export function createSarahHeartbeatFixture() {
  return {
    id: "sarah-birthday-2026",
    personId: "sarah",
    recipientName: "Sarah",
    birthday: "2026-06-02",
    state: "brief_ready",
    approved: false,
    lastReminderAt: null
  };
}

export function evaluateReminders(reminders = [], today = new Date().toISOString()) {
  const now = new Date(today);
  const changed = [];
  const unchanged = [];
  const auditEvents = [];

  for (const reminder of reminders) {
    const next = evaluateReminder(reminder, now);
    if (next.changed) {
      changed.push(next.reminder);
      auditEvents.push(next.auditEvent);
    } else {
      unchanged.push(next.reminder);
    }
  }

  return { changed, unchanged, auditEvents };
}

export function evaluateReminder(reminder, now = new Date()) {
  if (reminder.approved || reminder.state === "approved") {
    return unchanged({ ...reminder, state: "approved" });
  }

  const days = daysUntil(reminder.birthday, now);
  const nextState = nextReminderState(days);

  if (!nextState || reminder.state === nextState) {
    return unchanged(reminder);
  }

  const updated = {
    ...reminder,
    state: nextState,
    lastReminderAt: now.toISOString()
  };

  return {
    changed: true,
    reminder: updated,
    auditEvent: {
      id: `${reminder.id || "reminder"}-${nextState}`,
      type: "reminder_due",
      summary: `${reminder.recipientName || "Recipient"} reminder moved to ${nextState}.`,
      metadata: {
        reminderId: reminder.id,
        daysUntilBirthday: days,
        state: nextState
      }
    }
  };
}

function unchanged(reminder) {
  return { changed: false, reminder, auditEvent: null };
}

function nextReminderState(days) {
  if (days <= 1) return "t_1_due";
  if (days <= 3) return "t_3_due";
  if (days <= 7) return "t_7_due";
  return null;
}

function daysUntil(birthday, now) {
  const target = new Date(`${birthday}T12:00:00Z`);
  const current = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12));
  return Math.ceil((target.getTime() - current.getTime()) / 86_400_000);
}
