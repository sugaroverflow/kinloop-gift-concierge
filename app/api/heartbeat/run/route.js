import { NextResponse } from "next/server";
import { createSarahHeartbeatFixture, evaluateReminders } from "../../../../lib/heartbeat/evaluate-reminders.js";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const today = body.today || new Date().toISOString();
  const reminders = body.reminders || [createSarahHeartbeatFixture()];

  return NextResponse.json({
    mode: "preview",
    today,
    ...evaluateReminders(reminders, today)
  });
}
