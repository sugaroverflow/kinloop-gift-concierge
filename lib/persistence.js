const STORAGE_KEY = "kinloop-product-state";

export const initialKinloopState = {
  signal: null,
  discoveredPeople: [],
  selectedPersonId: "",
  sourceImport: null,
  sourceStatuses: {},
  importStep: "connect",
  codexRun: {
    status: "idle",
    options: []
  },
  approval: null,
  reminderHeartbeat: null,
  reminderState: "brief_ready",
  auditEvents: [
    {
      id: "seed-brief-ready",
      createdAt: "2026-05-25T09:12:00.000Z",
      title: "Birthday loop ready",
      summary: "Kinloop is ready to import the latest birthday hint.",
      mode: "local"
    },
    {
      id: "seed-approval-boundary",
      createdAt: "2026-05-25T09:18:00.000Z",
      title: "Approval boundary active",
      summary: "Gift recommendations require a human approval.",
      mode: "local"
    }
  ]
};

export function loadKinloopState() {
  if (typeof window === "undefined") return initialKinloopState;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialKinloopState;

    const parsed = JSON.parse(raw);
    return {
      ...initialKinloopState,
      ...parsed,
      approval: parsed.approval || approvalFromStoredApproval(parsed),
      codexRun: {
        ...initialKinloopState.codexRun,
        ...(parsed.codexRun || {})
      },
      auditEvents: Array.isArray(parsed.auditEvents) ? parsed.auditEvents : initialKinloopState.auditEvents
    };
  } catch {
    return initialKinloopState;
  }
}

export function saveKinloopState(state) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function approvalFromStoredApproval(parsed) {
  const giftId = parsed.approvedGiftId || "";
  if (!giftId) return null;

  return {
    giftId,
    approvedAt: parsed.approvedAt || new Date().toISOString(),
    reason: "Approved in Kinloop"
  };
}
