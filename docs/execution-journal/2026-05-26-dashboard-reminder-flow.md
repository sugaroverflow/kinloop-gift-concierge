## [2026-05-26T23:42:00Z] - Dashboard Reminder Flow

### Goal

Move reminder setup out of gift approval so the demo has two clean paths: approve a recommended gift, or set reminder heartbeat timing from the home dashboard.

### Changes

- Added a dashboard reminder splash with the Kinloop mark, text-message styling, heartbeat reminder copy, and a `Set reminder` action.
- Changed the dashboard reminder action to open a timing modal with `1 day before`, `3 days before`, and `Later date`, then persist lightweight `reminderHeartbeat` state without sending an immediate ping.
- Removed reminder timing from the approval modal and simplified the Approved page to show only the saved gift decision and purchase boundary.
- Updated browser smoke coverage, UI copy checks, README, architecture docs, and UI architecture guidance for the split demo flow.

### Decisions

- Kept Discord as the product-facing delivery channel for deadline-triggered reminders.
- Kept WhatsApp and phone-call extensions as demo narration rather than visible product controls.
- Left real channel delivery behind a later heartbeat evaluation plus the existing credential, consent, mode, and allowlist boundary.
- Recorded approval without reminder timing so gift decisions and reminder setup are independent.

### Tradeoffs

- The dashboard CTA records heartbeat timing; it does not send an immediate Discord message.
- The app shows generic channel-readiness copy instead of exposing implementation status details.

### Risks

- Reminder delivery remains environment-dependent when live credentials and allowlists are enabled.
- The approval persistence path still supports reminder rows for older or backend-led flows, but the current product UI no longer creates them from approval.

### Verification

- `scripts/container-run.sh npm run check:ui-copy`
- `scripts/container-run.sh npm run test`
- `scripts/container-run.sh npm run check:browser`
- IDE lints for edited files passed.

### Demo Impact

The recording can now show two branches after login and import: review a gift and approve it, or use the home splash to set reminder timing. The script can explain that the heartbeat later triggers Discord, and that the same channel boundary could route to WhatsApp or a phone call through OpenClaw.

### Customer-Facing Context

Gift approval remains a deliberate human decision with no purchase, payment, or fulfillment side effect. Reminder outreach is separated from approval and stays bounded by explicit channel configuration.

### Next Recommended Step

Capture a fresh demo walkthrough with the dashboard reminder splash visible before entering the gift recommendation path.
