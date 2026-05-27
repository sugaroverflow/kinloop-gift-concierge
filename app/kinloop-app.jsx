"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import sourceBundle from "../data/kinloop/synthetic-source-sample.json";
import { recipients } from "../lib/product-data";
import { initialKinloopState, loadKinloopState, saveKinloopState } from "../lib/persistence";
import { getBrowserSupabaseClient, signInWithEmailPassword, signOutOfSupabase } from "../lib/supabase/client";
import { recordKinloopApproval, recordKinloopImport } from "../lib/supabase/repository";

const importSteps = ["connect", "scanning", "complete"];
const stepLabels = { connect: "Input", scanning: "Scanning", complete: "Ready" };
const syntheticSource = { id: "synthetic", name: "Synthetic JSON sample" };
const importSources = [
  {
    id: "synthetic",
    name: "Synthetic data input",
    icon: "K",
    label: "Ready",
    description: "Use the checked-in sample email data for a deterministic, privacy-safe run.",
    detail: "33 messages · 5 people · local fixture",
    accent: "oklch(68% 0.13 151)",
    enabled: true
  },
  {
    id: "gmail",
    name: "Gmail",
    icon: "G",
    label: "Coming soon",
    description: "Bring in birthday clues from selected email threads.",
    detail: "OAuth, scoped import, no continuous indexing",
    accent: "oklch(66% 0.16 28)"
  },
  {
    id: "obsidian",
    name: "Obsidian",
    icon: "O",
    label: "Coming soon",
    description: "Turn personal notes into relationship memory and gift context.",
    detail: "Vault import with explicit file selection",
    accent: "oklch(58% 0.15 292)"
  },
  {
    id: "imessage",
    name: "iMessage",
    icon: "I",
    label: "Coming soon",
    description: "Summarize opted-in conversation snippets without background scraping.",
    detail: "Consent-first, bounded import",
    accent: "oklch(65% 0.16 151)"
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: "W",
    label: "Coming soon",
    description: "Use exported chats as a relationship signal source.",
    detail: "Manual export, explicit review",
    accent: "oklch(67% 0.14 160)"
  }
];
const sourceCharacters = (sourceBundle.friends || []).map((friend) => {
  const source = sourceBundle.byPerson?.[friend.personId] || {};
  return {
    id: friend.personId,
    name: friend.displayName,
    relation: friend.relation,
    email: friend.email,
    messageCount: source.messageCount || 0,
    subjects: source.subjects || []
  };
});
const birdCircleLogoSrc = "/kinloop-bird-circle.png";

export default function KinloopApp({ initialView = "dashboard" }) {
  const [state, setState] = useState(initialKinloopState);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [view, setView] = useState(initialView);
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [authStatus, setAuthStatus] = useState("idle");
  const [authError, setAuthError] = useState("");
  const [giftStatus, setGiftStatus] = useState("idle");
  const [giftError, setGiftError] = useState("");
  const [giftIdeas, setGiftIdeas] = useState([]);
  const [approvalTarget, setApprovalTarget] = useState(null);
  const [reminderSetupOpen, setReminderSetupOpen] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderChannel, setReminderChannel] = useState({ loading: false, ready: false, summary: "" });
  const [toast, setToast] = useState("");
  const sourceImport = state.sourceImport || null;
  const people = Array.isArray(state.discoveredPeople) ? state.discoveredPeople : [];
  const selectedId = state.selectedPersonId || people[0]?.id || "";
  const importStep = state.importStep || (people.length ? "complete" : "connect");
  const connectedSources = [syntheticSource];

  const selectedPerson = useMemo(
    () => people.find((person) => person.id === selectedId) || people[0] || null,
    [people, selectedId]
  );

  const orderedPeople = useMemo(() => [...people].sort(dueSoonest), [people]);
  const approvedIdea = state.approval || null;

  useEffect(() => {
    const loaded = loadKinloopState();
    const discovered = Array.isArray(loaded.discoveredPeople) ? loaded.discoveredPeople : [];
    const hasLocalSession = Boolean(loaded.localSession || discovered.length);

    setState({
      ...loaded,
      discoveredPeople: discovered,
      selectedPersonId: loaded.selectedPersonId || discovered[0]?.id || "",
      sourceImport: loaded.sourceImport || null,
      importStep: loaded.importStep || (discovered.length ? "complete" : "connect")
    });
    setView(resolveInitialView(initialView, hasLocalSession, discovered.length));
    setHasLoaded(true);

    const client = getBrowserSupabaseClient();
    if (!client) return;

    client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        setState((current) => ({ ...current, localSession: true, importStep: "connect" }));
        setView((currentView) => currentView === "signin" ? "import" : currentView);
      }
    });
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        setState((current) => ({ ...current, localSession: true, importStep: "connect" }));
        setView((currentView) => currentView === "signin" ? "import" : currentView);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [initialView]);

  useEffect(() => {
    if (!hasLoaded) return;
    saveKinloopState({
      ...state,
      localSession: state.localSession || Boolean(session)
    });
  }, [state, session, hasLoaded]);

  useEffect(() => {
    if (!hasLoaded) return;
    const path = pathForView(view);
    if (window.location.pathname !== path) {
      window.history.pushState({}, "", path);
    }
  }, [view, hasLoaded]);

  useEffect(() => {
    const onPop = () => setView(viewForPath(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (view !== "dashboard") return;

    setReminderChannel({ loading: true, ready: false, summary: "Checking reminder channel..." });
    fetch("/api/openclaw/status")
      .then((response) => response.json().then((payload) => ({ response, payload })))
      .then(({ response, payload }) => {
        if (cancelled) return;
        if (!response.ok || !payload.ok) {
          setReminderChannel({ loading: false, ready: false, summary: payload.error || "Channel setup required." });
          return;
        }
        setReminderChannel({
          loading: false,
          ready: Boolean(payload.ready),
          summary: payload.ready ? payload.summary || "Ready to send reminders." : payload.summary || "Channel setup required."
        });
      })
      .catch(() => {
        if (cancelled) return;
        setReminderChannel({ loading: false, ready: false, summary: "Channel setup required." });
      });

    return () => {
      cancelled = true;
    };
  }, [view]);

  function showToast(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  function navigate(nextView) {
    if (nextView === "dashboard" && !people.length) {
      setView("import");
      return;
    }
    setView(nextView);
  }

  async function sendEmailLink(event) {
    event.preventDefault();
    setAuthStatus("loading");
    setAuthError("");

    const result = await signInWithEmailPassword({ email, password });
    if (!result.ok) {
      setAuthStatus("error");
      setAuthError(result.error || "Sign-in failed.");
      return;
    }

    setAuthStatus("authenticated");
    setSession(result.session);
    setEmailSent(false);
    setState((current) => ({
      ...current,
      localSession: true,
      importStep: "connect",
      discoveredPeople: [],
      selectedPersonId: "",
      sourceImport: null,
      importSummary: null
    }));
    setView("import");
  }

  async function signOut() {
    const result = await signOutOfSupabase();
    if (!result.ok) {
      showToast(result.error || "Sign-out failed.");
      return;
    }

    setSession(null);
    setState((current) => ({ ...current, localSession: false }));
    setView("signin");
  }

  function scanSources() {
    setState((current) => ({ ...current, importStep: "scanning" }));
  }

  async function finishImport() {
    const imported = await importRelationshipSource();
    const discovered = buildDiscoveredPeople(imported);
    setGiftIdeas([]);
    setGiftStatus("idle");
    setState((current) => ({
      ...current,
      localSession: true,
      sourceImport: imported,
      discoveredPeople: discovered,
      selectedPersonId: discovered[0]?.id || "",
      importStep: "complete",
      importSummary: {
        peopleFound: discovered.length,
        cluesCollected: totalClues(discovered),
        connectedSources: [syntheticSource.id],
        mode: imported.mode,
        fallbackReason: imported.fallbackReason || "",
        importedAt: new Date().toISOString()
      }
    }));
    await recordKinloopImport({ client: getBrowserSupabaseClient(), people: discovered, sourceImport: imported }).catch(() => {});
  }

  async function revealGiftIdeas() {
    if (!selectedPerson) return;
    setGiftStatus("loading");
    setGiftError("");
    setGiftIdeas([]);
    const activeSourceImport = sourceImport;

    try {
      const response = await fetch("/api/gift-source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: sourceTextForPerson(selectedPerson, activeSourceImport),
          personId: selectedPerson.id,
          brief: giftBriefPayload(selectedPerson, activeSourceImport),
          sourceSignal: activeSourceImport,
          preferLive: true
        })
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Gift ideas could not be prepared.");

      const nextIdeas = normalizeIdeas(payload.options || [payload.candidate], selectedPerson);
      if (!nextIdeas.length) throw new Error("Gift ideas could not be prepared.");

      setGiftIdeas(nextIdeas);
      setState((current) => ({
        ...current,
        codexRun: {
          status: "complete",
          source: payload.source,
          productSource: payload.productSource,
          options: nextIdeas
        }
      }));
      setGiftStatus("ready");
    } catch (error) {
      setGiftIdeas([]);
      setGiftStatus("idle");
      setGiftError(
        error instanceof Error && error.message
          ? error.message
          : "Gift matching is unavailable right now. Try again in a moment."
      );
    }
  }

  function selectPerson(personId) {
    setState((current) => ({ ...current, selectedPersonId: personId }));
    setGiftIdeas([]);
    setGiftStatus("idle");
    setGiftError("");
    setView("dashboard");
  }

  async function confirmApproval(gift) {
    const approval = {
      giftId: gift.id,
      personId: selectedPerson?.id,
      personName: selectedPerson?.name,
      personBirthday: selectedPerson?.birthday,
      title: gift.title,
      priceRange: gift.priceRange,
      deliveryNote: gift.deliveryNote,
      approvedAt: new Date().toISOString(),
      reason: gift.why
    };

    setState((current) => ({ ...current, approval }));
    setApprovalTarget(null);
    await recordKinloopApproval({
      client: getBrowserSupabaseClient(),
      option: gift,
      person: selectedPerson,
      reminderDays: 0
    }).catch(() => {});
    showToast(`${gift.title} approved.`);
  }

  async function confirmReminderHeartbeats(reminderTiming) {
    if (!selectedPerson || sendingReminder) return;

    const isDemoInstant = reminderTiming.id === "later-today";
    setSendingReminder(true);

    try {
      let sendResult = null;
      if (isDemoInstant) {
        const activeSourceImport = sourceImport;
        const response = await fetch("/api/openclaw/reminder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipientName: firstName(selectedPerson.name),
            birthday: selectedPerson.birthday,
            sourceText: sourceTextForPerson(selectedPerson, activeSourceImport),
            approvalUrl: `${window.location.origin}/`
          })
        });
        const payload = await response.json();
        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || "Reminder could not be sent.");
        }
        sendResult = payload;
      }

      setState((current) => ({
        ...current,
        reminderEnabled: true,
        reminderHeartbeat: {
          channel: "Discord",
          state: isDemoInstant && sendResult?.message?.sent ? "sent" : "requested",
          timing: reminderTiming.label,
          reminderDays: reminderTiming.days,
          requestedAt: new Date().toISOString(),
          personId: selectedPerson.id,
          personName: selectedPerson.name,
          birthday: selectedPerson.birthday,
          sent: Boolean(sendResult?.message?.sent),
          mode: sendResult?.mode || "",
          error: sendResult?.message?.error || sendResult?.error || ""
        }
      }));
      setReminderSetupOpen(false);
      if (isDemoInstant) {
        showToast(sendResult?.message?.sent ? "Discord ping sent." : "Discord ping prepared for demo.");
      } else {
        showToast(`Reminder set for ${reminderTiming.label.toLowerCase()}.`);
      }
    } catch {
      setState((current) => ({
        ...current,
        reminderHeartbeat: {
          channel: "Discord",
          state: "requested",
          timing: reminderTiming.label,
          reminderDays: reminderTiming.days,
          requestedAt: new Date().toISOString(),
          personId: selectedPerson.id,
          personName: selectedPerson.name,
          birthday: selectedPerson.birthday,
          error: "Channel setup required."
        }
      }));
      showToast(isDemoInstant ? "Discord ping could not be sent." : "Reminder could not be saved.");
    } finally {
      setSendingReminder(false);
    }
  }

  if (!hasLoaded) {
    return <main className="wash-screen" aria-label="Kinloop loading" />;
  }

  if (view === "signin") {
    return (
      <SignInScreen
        authError={authError}
        authStatus={authStatus}
        email={email}
        emailSent={emailSent}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onResetEmail={() => {
          setEmail("");
          setPassword("");
          setEmailSent(false);
          setAuthError("");
        }}
        onSendEmailLink={sendEmailLink}
        password={password}
      />
    );
  }

  if (view === "import") {
    return (
      <ImportScreen
        connectedSources={connectedSources}
        importStep={importStep}
        onScanSources={scanSources}
        onFinishImport={finishImport}
        onDashboard={() => navigate("dashboard")}
        people={people}
      />
    );
  }

  return (
    <main className="kinloop-shell">
      <KinloopHeader
        active={view}
        accountLabel={session?.user?.email || "On this device"}
        onNavigate={navigate}
        onSignIn={() => setView("signin")}
        onSignOut={signOut}
        signedIn={Boolean(session)}
      />

      {view === "people" ? (
        <PeopleView people={orderedPeople} selectedId={selectedId} onSelect={selectPerson} />
      ) : view === "approved" ? (
        <ApprovedView
          approval={approvedIdea}
          onNavigateDashboard={() => navigate("dashboard")}
        />
      ) : (
        <DashboardView
          connectedSources={connectedSources}
          giftError={giftError}
          giftIdeas={giftIdeas}
          giftStatus={giftStatus}
          reminderChannel={reminderChannel}
          reminderHeartbeat={state.reminderHeartbeat}
          sendingReminder={sendingReminder}
          people={orderedPeople}
          selectedPerson={selectedPerson}
          selectedId={selectedId}
          onApprove={setApprovalTarget}
          onFindGift={revealGiftIdeas}
          onOpenReminder={() => setReminderSetupOpen(true)}
          onSelectPerson={selectPerson}
          approvedGiftId={approvedIdea?.giftId}
        />
      )}

      <footer className="kinloop-footer">
        <span>Privacy and controls</span>
        <span>Approval only. Approved gift ready for purchase queue (pending)</span>
      </footer>

      <ApprovalModal
        gift={approvalTarget}
        person={selectedPerson}
        onClose={() => setApprovalTarget(null)}
        onConfirm={confirmApproval}
      />

      <ReminderModal
        open={reminderSetupOpen}
        person={selectedPerson}
        sending={sendingReminder}
        onClose={() => setReminderSetupOpen(false)}
        onConfirm={confirmReminderHeartbeats}
      />

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function SignInScreen({
  authError,
  authStatus,
  email,
  emailSent,
  onEmailChange,
  onPasswordChange,
  onResetEmail,
  onSendEmailLink,
  password
}) {
  return (
    <main className="entry-screen">
      <div className="entry-brand" aria-label="Kinloop">
        <KinloopMark size="small" />
        <span>Kinloop</span>
      </div>

      <section className="entry-stack" aria-labelledby="signin-title">
        {!emailSent ? (
          <>
            <div className="entry-heading">
              <span className="entry-orb"><KinloopMark /></span>
              <h1 id="signin-title">Sign in</h1>
              <p>Your gift concierge, brought to life by what you already know about people.</p>
            </div>

            <form className="entry-card" onSubmit={onSendEmailLink}>
              <label>
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => onEmailChange(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </label>
              <label>
                <span>Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => onPasswordChange(event.target.value)}
                  placeholder="Account password"
                  autoComplete="current-password"
                />
              </label>
              {authError ? <p className="inline-note" role="alert">{authError}</p> : null}
              <button className="pill-button primary" type="submit" disabled={authStatus === "loading"}>
                {authStatus === "loading" ? "Signing in" : "Sign in"}
              </button>
              <p className="microcopy">Sign in to save imported people, approvals, and reminder preferences.</p>
            </form>
          </>
        ) : (
          <section className="entry-card sent-card">
            <span className="mail-dot">✉</span>
            <h2>Signed in</h2>
            <p><strong>{email}</strong> is ready to save Kinloop decisions.</p>
            <button className="text-button" type="button" onClick={onResetEmail}>
              Use a different account
            </button>
          </section>
        )}
      </section>
    </main>
  );
}

function ImportScreen({
  connectedSources,
  importStep,
  people,
  onScanSources,
  onFinishImport,
  onDashboard
}) {
  return (
    <main className="import-screen">
      <section className="import-stack" aria-labelledby="import-title">
        <div className="center-brand">
          <KinloopMark size="small" />
          <span>Kinloop</span>
        </div>

        <StepPills activeStep={importStep} />

        <div className="import-card">
          {importStep === "connect" && (
            <>
              <div className="screen-copy">
                <h1 id="import-title">Bring in your people</h1>
                <p>Choose a source for relationship clues. The sample email data is ready today.</p>
              </div>

              <div className="source-group" aria-label="Available sources">
                <div className="source-group-title">
                  <i />
                  <strong>Sources</strong>
                  <i />
                </div>
                {importSources.map((source) => (
                  <SourceCard key={source.id} source={source} onSelect={onScanSources} />
                ))}
              </div>
              <SourcePreview characters={sourceCharacters} />
              <p className="microcopy">Loads a checked-in synthetic JSON sample to keep the flow deterministic and privacy-safe.</p>
            </>
          )}

          {importStep === "scanning" && (
            <ScanningStep onDone={onFinishImport} />
          )}

          {importStep === "complete" && (
            <CompleteStep connectedSources={connectedSources} people={people} onDashboard={onDashboard} />
          )}
        </div>
      </section>
    </main>
  );
}

function SourcePreview({ characters }) {
  return (
    <section className="source-preview" aria-label="Synthetic source preview">
      <div className="source-group-title">
        <i />
        <strong>Sample inbox</strong>
        <i />
      </div>
      <div className="source-people">
        {characters.map((character) => (
          <article key={character.id} className="source-person">
            <div>
              <strong>{character.name}</strong>
              <span>{character.relation}</span>
            </div>
            <a href={`mailto:${character.email}`}>{character.email}</a>
            <small>
              {character.messageCount} messages
              {character.subjects[0] ? ` · ${character.subjects[0]}` : ""}
            </small>
          </article>
        ))}
      </div>
    </section>
  );
}

function SourceCard({ source, onSelect }) {
  return (
    <article
      className={source.enabled ? "source-card connected" : "source-card unavailable"}
      style={{ "--source-accent": source.accent }}
    >
      <span className="source-icon" aria-hidden="true">{source.icon}</span>
      <div>
        <div className="source-card-head">
          <h3>{source.name}</h3>
          <span>{source.label}</span>
        </div>
        <p>{source.description}</p>
        <small>{source.detail}</small>
        {source.enabled ? (
          <button className="source-connect" type="button" onClick={onSelect}>
            Synthetic data input
          </button>
        ) : (
          <button className="source-connect" type="button" disabled>
            Not available yet
          </button>
        )}
      </div>
    </article>
  );
}

function KinloopHeader({ active, accountLabel, onNavigate, onSignIn, onSignOut, signedIn }) {
  const items = [
    ["dashboard", "Today"],
    ["people", "People"],
    ["approved", "Approved"]
  ];

  return (
    <header className="kinloop-header">
      <button className="header-brand" type="button" onClick={() => onNavigate("dashboard")}>
        <KinloopMark size="small" />
        <span>Kinloop</span>
      </button>
      <nav aria-label="Kinloop">
        {items.map(([id, label]) => (
          <button
            key={id}
            className={active === id ? "nav-pill active" : "nav-pill"}
            type="button"
            onClick={() => onNavigate(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="account-chip">
        <span>{accountLabel}</span>
        <button type="button" onClick={signedIn ? onSignOut : onSignIn}>
          {signedIn ? "Sign out" : "Sign in"}
        </button>
      </div>
    </header>
  );
}

function DashboardView({
  approvedGiftId,
  connectedSources,
  giftError,
  giftIdeas,
  giftStatus,
  reminderChannel,
  reminderHeartbeat,
  sendingReminder,
  people,
  selectedPerson,
  selectedId,
  onApprove,
  onFindGift,
  onOpenReminder,
  onSelectPerson
}) {
  if (!selectedPerson) {
    return (
      <section className="empty-main">
        <h1>Bring in your people</h1>
        <p>Connect a source to build your birthday dashboard.</p>
      </section>
    );
  }

  const heroIdea = giftIdeas[0];
  const alternatives = giftIdeas.slice(1, 3);
  const ideasRef = useRef(null);
  const hasRecommendation = Boolean(heroIdea);
  const briefCompact = giftStatus === "loading" || hasRecommendation;

  useEffect(() => {
    if (!hasRecommendation) return;
    ideasRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hasRecommendation]);

  return (
    <div className="dashboard-stack">
      <ReminderHero
        onOpenReminder={onOpenReminder}
        reminderChannel={reminderChannel}
        reminderHeartbeat={reminderHeartbeat}
        sendingReminder={sendingReminder}
      />

      <div className="source-status">
        <span className="pulse-dot" />
        <span>
          {people.length} people · {totalClues(people)} clues · {connectedSources.length ? "Sources refreshed today" : "Ready for sources"}
        </span>
      </div>

      <section className="dashboard-grid" aria-label="Birthday dashboard">
        <aside className="upcoming-card" aria-labelledby="upcoming-title">
          <UpcomingList people={people} selectedId={selectedId} onSelect={onSelectPerson} />
        </aside>

        <GiftBrief
          compact={briefCompact}
          person={selectedPerson}
          giftStatus={giftStatus}
          onFindGift={onFindGift}
        />
      </section>

      {giftError && <p className="inline-note">{giftError}</p>}

      {giftStatus === "loading" && <RecommendationSkeleton />}

      {heroIdea && (
        <section className="ideas-stack" aria-labelledby="recommendation-title" ref={ideasRef}>
          <RecommendationHero
            approved={approvedGiftId === heroIdea.id}
            idea={heroIdea}
            person={selectedPerson}
            onApprove={onApprove}
          />

          {alternatives.length > 0 && (
            <div className="alternatives-wrap">
              <p className="eyebrow">Other good options</p>
              <div className="alternative-grid">
                {alternatives.map((idea) => (
                  <AlternativeCard
                    key={idea.id}
                    approved={approvedGiftId === idea.id}
                    idea={idea}
                    onApprove={onApprove}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function ReminderHero({ reminderChannel, reminderHeartbeat, sendingReminder, onOpenReminder }) {
  const hasError = Boolean(reminderHeartbeat?.error);
  const status = hasError
    ? "Discord setup needs attention."
    : reminderHeartbeat?.sent ||
        reminderHeartbeat?.state === "sent" ||
        reminderHeartbeat?.state === "requested"
      ? `Reminder set: ${reminderHeartbeat.timing}.`
      : reminderHeartbeat
        ? "Reminder saved."
        : reminderChannel?.loading
          ? "Checking heartbeat channel..."
          : reminderChannel?.ready
            ? "Discord heartbeat channel ready."
            : "Heartbeat preview available.";

  return (
    <section className="reminder-hero" aria-labelledby="reminder-title">
      <div className="reminder-brand">
        <KinloopMark />
        <span>Kinloop</span>
      </div>
      <div className="message-banner">
        <span className="message-from">Kinloop text</span>
        <h2 id="reminder-title">Need a reminder?</h2>
        <p>Don't have time to review gifts today? Set heartbeat timing and Kinloop can ping you on Discord when the deadline is near.</p>
      </div>
      <div className="reminder-hero-action">
        <button className="pill-button primary" type="button" onClick={onOpenReminder} disabled={sendingReminder}>
          Set reminder
        </button>
        <small>{status}</small>
      </div>
    </section>
  );
}

function GiftBrief({ compact = false, person, giftStatus, onFindGift }) {
  return (
    <section className={compact ? "gift-brief compact" : "gift-brief"} aria-labelledby="brief-title">
      <div className="brief-head">
        <Avatar name={person.name} tone={person.id} large />
        <div>
          <p className="eyebrow">Up next</p>
          <h1 id="brief-title">{person.name}</h1>
          <p>{person.birthday} · {person.timing} away · {person.relation}</p>
        </div>
      </div>

      <blockquote>{person.note}</blockquote>

      <div className="signal-cloud" aria-label="Taste signals">
        {person.clues.slice(0, 5).map((clue) => <span key={clue}>{clue}</span>)}
      </div>

      <div className="brief-facts">
        <Fact label="Budget" value={person.budget} />
        <Fact label="Address" value={person.addressStatus} />
        <Fact label="Tone" value={person.giftTone || "Thoughtful"} />
      </div>

      <div className="brief-action">
        <button className="pill-button primary tall" onClick={onFindGift} disabled={giftStatus === "loading"}>
          {giftStatus === "loading" ? "Finding a gift" : `Find ${firstName(person.name)}'s gift`}
        </button>
        <p>Matched to {firstName(person.name)}'s taste, timing, and budget.</p>
      </div>
    </section>
  );
}

function RecommendationHero({ approved, idea, person, onApprove }) {
  return (
    <article className={approved ? "recommendation-hero approved" : "recommendation-hero"}>
      <div className="recommendation-copy">
        <div className="rec-topline">
          <span className="eyebrow">Recommended for {firstName(person.name)}</span>
          <span className="match-label">{matchLabel(idea.rank)}</span>
        </div>
        <h2 id="recommendation-title">{idea.title}</h2>
        <p className="rec-meta">{idea.priceRange} · {idea.deliveryNote}</p>
        <p className="rec-caption">{idea.caption}</p>
        <div className="why-box">
          <span>Why this fits</span>
          <p>{idea.why}</p>
        </div>
        <div className="recommendation-actions">
          <button className="pill-button primary" disabled={approved} onClick={() => onApprove(idea)}>
            {approved ? "Approved" : "Approve this gift"}
          </button>
          <p>No purchase happens here · saved to your Approved list</p>
        </div>
      </div>
    </article>
  );
}

function AlternativeCard({ approved, idea, onApprove }) {
  return (
    <article className={approved ? "alternative-card approved" : "alternative-card"}>
      <div className="alternative-heading">
        <h3>{idea.title}</h3>
        <span className="match-label quiet">{matchLabel(idea.rank)}</span>
        <p>{idea.priceRange} · {idea.deliveryNote}</p>
      </div>
      <p className="alternative-note">{idea.risk}</p>
      <button className="text-button" type="button" disabled={approved} onClick={() => onApprove(idea)}>
        {approved ? "Approved" : "Approve instead"}
      </button>
    </article>
  );
}

function ApprovalModal({ gift, person, onClose, onConfirm }) {
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!gift) {
      setConfirmed(false);
    }
  }, [gift]);

  if (!gift || !person) return null;

  function approve() {
    setConfirmed(true);
    window.setTimeout(() => onConfirm(gift), 420);
  }

  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="approval-title">
      <button className="modal-scrim" aria-label="Close approval" onClick={onClose} />
      <section className="approval-modal">
        {!confirmed ? (
          <>
            <p className="eyebrow">Approve gift</p>
            <h2 id="approval-title">{gift.title}</h2>
            <p>Chosen for {firstName(person.name)}'s taste, timing, and budget. No purchase happens here.</p>
            <div className="approval-summary">
              <span>{gift.priceRange}</span>
              <span>{gift.deliveryNote}</span>
            </div>
            <div className="modal-actions">
              <button className="pill-button secondary" type="button" onClick={onClose}>Cancel</button>
              <button className="pill-button primary" type="button" onClick={approve}>Approve gift</button>
            </div>
          </>
        ) : (
          <div className="confirmed-state">
            <span className="confirm-mark">✓</span>
            <h2>Gift approved</h2>
            <p>{gift.title} is in your Approved list.</p>
          </div>
        )}
      </section>
    </div>
  );
}

const reminderTimingOptions = [
  { id: "later-today", label: "Later today", days: 0 },
  { id: "three-days", label: "3 days", days: 3 },
  { id: "seven-days", label: "7 days", days: 7 }
];

function ReminderModal({ open, person, sending, onClose, onConfirm }) {
  const [selectedId, setSelectedId] = useState("three-days");

  useEffect(() => {
    if (open) setSelectedId("three-days");
  }, [open]);

  if (!open || !person) return null;

  const selectedTiming = reminderTimingOptions.find((option) => option.id === selectedId) || reminderTimingOptions[1];

  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="reminder-modal-title">
      <button className="modal-scrim" aria-label="Close reminder setup" onClick={onClose} />
      <section className="reminder-modal">
        <p className="eyebrow">Deadline heartbeats</p>
        <h2 id="reminder-modal-title">When should Kinloop remind you?</h2>
        <p>We will keep the heartbeat quiet until {firstName(person.name)}'s deadline is close.</p>
        <div className="heartbeat-picker" role="group" aria-label="Reminder timing">
          {reminderTimingOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className={selectedId === option.id ? "active" : ""}
              onClick={() => setSelectedId(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="modal-actions">
          <button className="pill-button secondary" type="button" onClick={onClose}>Cancel</button>
          <button
            className="pill-button primary"
            type="button"
            onClick={() => onConfirm(selectedTiming)}
            disabled={sending}
          >
            {sending ? "Setting reminder" : "Set reminder"}
          </button>
        </div>
      </section>
    </div>
  );
}

function PeopleView({ people, selectedId, onSelect }) {
  return (
    <section className="people-page" aria-labelledby="people-title">
      <div className="page-heading">
        <p className="eyebrow">People</p>
        <h1 id="people-title">Your loop</h1>
        <p>Kinloop keeps birthdays, clues, and address readiness in one calm place.</p>
      </div>
      <div className="people-grid">
        {people.map((person) => (
          <button
            key={person.id}
            className={person.id === selectedId ? "person-card active" : "person-card"}
            type="button"
            onClick={() => onSelect(person.id)}
          >
            <Avatar name={person.name} tone={person.id} />
            <span>
              <strong>{person.name}</strong>
              <small>{person.relation} · {person.birthday} · {person.timing}</small>
            </span>
            <em>{person.addressStatus}</em>
          </button>
        ))}
      </div>
    </section>
  );
}

function ApprovedView({ approval, onNavigateDashboard }) {
  return (
    <section className="approved-page" aria-labelledby="approved-title">
      <div className="page-heading">
        <p className="eyebrow">Approved gifts</p>
        <h1 id="approved-title">Gift decisions</h1>
        <p>Approved ideas live here with their person and purchase boundary.</p>
      </div>

      {approval ? (
        <article className="approved-card">
          <div>
            <span className="match-label">Approved</span>
            <h2>{approval.title}</h2>
            <p>{approval.personName} · {approval.priceRange} · {approval.deliveryNote}</p>
          </div>
          <div className="approved-status">
            <span>Approval saved</span>
            <small>Approved gift ready for purchase queue (pending)</small>
          </div>
        </article>
      ) : (
        <div className="empty-approved">
          <h2>No approved gifts yet</h2>
          <p>Choose a recommendation from the dashboard and it will appear here.</p>
          <button className="pill-button primary" type="button" onClick={onNavigateDashboard}>
            Go to dashboard
          </button>
        </div>
      )}
    </section>
  );
}

function ScanningStep({ onDone }) {
  const [tick, setTick] = useState(0);
  const doneRef = useRef(false);

  const lines = [
    "Loading synthetic source sample...",
    "Finding birthday signals and relationship clues...",
    "Matching signals to people...",
    "Building your loop..."
  ].filter(Boolean);

  useEffect(() => {
    if (doneRef.current) return;
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setTick(index);
      if (index >= lines.length + 1) {
        window.clearInterval(timer);
        doneRef.current = true;
        window.setTimeout(onDone, 220);
      }
    }, 420);
    return () => window.clearInterval(timer);
  }, [lines.length, onDone]);

  return (
    <div className="scanning-step" aria-live="polite">
      <div className="scan-ring" style={{ "--scan-progress": Math.min(tick / lines.length, 1) }}>
        <KinloopMark size="small" />
      </div>
      <div className="scan-lines">
        {lines.slice(0, tick).map((line, index) => (
          <p key={line} className={index < tick - 1 ? "done" : ""}><span>✓</span>{line}</p>
        ))}
      </div>
    </div>
  );
}

function CompleteStep({ connectedSources, people, onDashboard }) {
  const discovered = people.length ? people : buildDiscoveredPeople();
  const next = discovered[0];

  return (
    <div className="complete-step">
      <span className="ready-check">✓</span>
      <div>
        <h2>You're all set</h2>
        <p>Kinloop found everything it needs to get started.</p>
      </div>
      <div className="summary-grid">
        <Fact label="People found" value={String(discovered.length)} />
        <Fact label="Clues collected" value={String(totalClues(discovered))} />
        <Fact label="Next birthday" value={next?.birthday || "Ready"} />
      </div>
      {next && (
        <div className="next-person">
          <Avatar name={next.name} tone={next.id} />
          <div>
            <h3>{next.name}</h3>
            <p>{next.relation} · Birthday {next.birthday} · <span>{next.timing} away</span></p>
          </div>
          <strong>Up next</strong>
        </div>
      )}
      <div className="connected-chips">
        {connectedSources.length ? (
          <>
            <span>Connected:</span>
            {connectedSources.map((source) => <i key={source.id}>{source.name}</i>)}
          </>
        ) : (
          <>
            <span>Input:</span>
            <i>Synthetic JSON sample</i>
          </>
        )}
      </div>
      <button className="pill-button primary tall" type="button" onClick={onDashboard}>Go to dashboard</button>
    </div>
  );
}

function UpcomingList({ people, selectedId, onSelect }) {
  return (
    <>
      <div className="list-heading">
        <p className="eyebrow">Upcoming</p>
        <h2 id="upcoming-title">Birthdays</h2>
      </div>
      <div className="upcoming-list">
        {people.map((person) => (
          <button
            key={person.id}
            className={person.id === selectedId ? "upcoming-row active" : "upcoming-row"}
            type="button"
            onClick={() => onSelect(person.id)}
          >
            <Avatar name={person.name} tone={person.id} />
            <span>
              <strong>{person.name}</strong>
              <small>{person.birthday}</small>
            </span>
            <em>{timingDays(person.timing)}d</em>
          </button>
        ))}
      </div>
    </>
  );
}

function StepPills({ activeStep }) {
  const activeIndex = importSteps.indexOf(activeStep);
  return (
    <div className="step-pills" aria-label="Import progress">
      {importSteps.map((step, index) => (
        <span key={step} className={activeStep === step ? "active" : index < activeIndex ? "done" : ""}>
          {index < activeIndex && "✓"}{stepLabels[step]}
        </span>
      ))}
    </div>
  );
}

function RecommendationSkeleton() {
  return (
    <section className="recommendation-skeleton" aria-live="polite">
      <div />
      <span>Finding the best fit...</span>
    </section>
  );
}

function Fact({ label, value }) {
  return (
    <div className="fact">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Avatar({ large = false, name, tone = "" }) {
  const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2);
  return (
    <span className={large ? `avatar large tone-${tone}` : `avatar tone-${tone}`}>{initials}</span>
  );
}

function KinloopMark({ size = "default" }) {
  return (
    <span className={size === "small" ? "kinloop-mark small" : "kinloop-mark"} aria-hidden="true">
      <img src={birdCircleLogoSrc} alt="" decoding="async" />
    </span>
  );
}

async function importRelationshipSource() {
  return localSourceImport();
}

function localSourceImport(fallbackReason = "") {
  const latest = sourceBundle.latestImport || {};
  return {
    ok: true,
    mode: "local_source",
    signal: latest.signal || null,
    sourceText: latest.sourceText || "",
    fallbackReason,
    importedAt: sourceBundle.importedAt || new Date().toISOString()
  };
}

function buildDiscoveredPeople(sourceImport = null) {
  const signal = sourceImport?.signal || null;
  return recipients
    .map((person) => {
      const source = sourceBundle.byPerson?.[person.id] || {};
      const extracted = signal?.personId === person.id ? signal.extracted || {} : {};
      const interests = extracted.interests?.length
        ? mergeUnique(extracted.interests, person.clues || person.likes)
        : person.clues || person.likes;
      const avoid = extracted.avoid?.length
        ? mergeUnique(extracted.avoid, person.avoid)
        : person.avoid;
      return {
        ...person,
        clues: interests.slice(0, 5),
        avoid,
        budget: extracted.budget || person.budget,
        sourceCount: source.messageCount || person.sourceCount || person.sourceSummary?.length || 0,
        sourceSubjects: source.subjects || person.sourceSubjects || [],
        latestSignalId: signal?.personId === person.id ? signal.id : ""
      };
    })
    .sort(dueSoonest);
}

function sourceTextForPerson(person, sourceImport = null) {
  const source = sourceBundle.byPerson?.[person.id] || {};
  const hasImportedSignal = sourceImport?.signal?.personId === person.id && sourceImport.sourceText;
  return [
    `Name: ${person.name}`,
    `Relationship: ${person.relation}`,
    `Birthday: ${person.birthday}`,
    `Budget: ${person.budget}`,
    `Interests: ${person.clues.join(", ")}`,
    `Avoid: ${(person.avoid || []).join(", ")}`,
    `Notes: ${person.note}`,
    `Recent subjects: ${(source.subjects || []).slice(0, 5).join("; ")}`,
    person.latestSourceText ? `\nSynthetic email data:\n${person.latestSourceText}` : "",
    hasImportedSignal ? `\nLatest source signal:\n${sourceImport.sourceText}` : ""
  ].join("\n");
}

function giftBriefPayload(person, sourceImport = null) {
  return {
    personId: person.id,
    name: person.name,
    relationship: person.relation,
    birthday: person.birthday,
    timing: person.timing,
    budget: person.budget,
    addressStatus: person.addressStatus,
    note: person.note,
    giftTone: person.giftTone,
    clues: person.clues || person.likes || [],
    avoid: person.avoid || [],
    sourceText: sourceTextForPerson(person, sourceImport)
  };
}

function normalizeIdeas(rawIdeas, person) {
  return rawIdeas.filter(Boolean).slice(0, 3).map((idea, index) => ({
    id: idea.productId || idea.id || `gift-idea-${index + 1}`,
    rank: idea.rank || index + 1,
    title: idea.title || idea.name,
    caption: idea.caption || `A considered option for ${firstName(person.name)}'s current clues.`,
    why: idea.why || `Matches ${person.name}'s current clues.`,
    risk: idea.risk || idea.consider || "Confirm delivery and fit before approving.",
    priceRange: idea.priceRange || idea.displayPrice || "Price shown by seller",
    deliveryNote: idea.deliveryNote || idea.delivery || "Check delivery before the birthday",
    sellerSignal: idea.sellerSignal || idea.seller || "Seller details available before purchase",
    fitScore: clampScore(idea.fitScore || idea.score || 82)
  }));
}

function resolveInitialView(initialView, hasLocalSession, hasPeople) {
  if (initialView === "signin") return "signin";
  if (initialView === "import") return "import";
  if (!hasLocalSession) return "signin";
  if (!hasPeople) return "import";
  return initialView;
}

function pathForView(view) {
  if (view === "signin") return "/sign-in";
  if (view === "import") return "/import";
  if (view === "people") return "/people";
  if (view === "approved") return "/approved";
  return "/";
}

function viewForPath(pathname) {
  if (pathname === "/sign-in") return "signin";
  if (pathname === "/import") return "import";
  if (pathname === "/people") return "people";
  if (pathname === "/approved") return "approved";
  return "dashboard";
}

function firstName(name = "") {
  return name.split(" ")[0] || "their";
}

function matchLabel(rank = 1) {
  if (rank === 1) return "Best match";
  if (rank === 2) return "Strong match";
  return "Safe backup";
}

function totalClues(list) {
  return list.reduce((count, person) => count + (person.clues?.length || 0), 0);
}

function mergeUnique(primary = [], secondary = []) {
  return Array.from(new Set([...primary, ...secondary].filter(Boolean)));
}

function dueSoonest(left, right) {
  return timingDays(left.timing) - timingDays(right.timing);
}

function timingDays(value) {
  const match = String(value || "").match(/\d+/);
  return match ? Number(match[0]) : 999;
}

function clampScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return 82;
  return Math.min(100, Math.max(1, Math.round(score)));
}
