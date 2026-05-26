"use client";

import { useEffect, useMemo, useState } from "react";
import { gifts, recipients } from "../lib/product-data";
import {
  createAuditEvent,
  initialKinloopState,
  loadKinloopState,
  saveKinloopState
} from "../lib/persistence";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import { recordKinloopApproval, recordKinloopAuditEvent } from "../lib/supabase/repository";

const sarah = recipients.find((person) => person.id === "sarah") || recipients[0];

export default function KinloopCockpit() {
  const [state, setState] = useState(initialKinloopState);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [session, setSession] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authForm, setAuthForm] = useState({ email: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [signalStatus, setSignalStatus] = useState("idle");
  const [signalError, setSignalError] = useState("");
  const [matchingStatus, setMatchingStatus] = useState("idle");
  const [matchingError, setMatchingError] = useState("");
  const [toast, setToast] = useState("");

  const options = state.codexRun.options.length ? state.codexRun.options : gifts.map(giftToOption);
  const approvedOption = options.find((option) => option.id === state.approval?.giftId);
  const workflowState = state.approval ? "approved" : state.codexRun.status === "complete" ? "ready" : state.signal ? "signal" : "waiting";

  useEffect(() => {
    setState(loadKinloopState());
    setHasLoaded(true);

    const client = getBrowserSupabaseClient();
    if (!client) return;

    client.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (hasLoaded) saveKinloopState(state);
  }, [state, hasLoaded]);

  function updateState(updater) {
    setState((current) => typeof updater === "function" ? updater(current) : updater);
  }

  function showToast(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  }

  async function importAgentMailHint() {
    setSignalStatus("loading");
    setSignalError("");

    try {
      const response = await fetch("/api/signals/agentmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Agent inbox is not connected.");

      updateState((current) => ({
        ...current,
        signal: payload.signal,
        auditEvents: [
          createAuditEvent("Signal imported", payload.signal.subject || "Latest AgentMail hint", "agentmail"),
          ...current.auditEvents
        ]
      }));
      setSourceText(payload.sourceText);
      recordKinloopAuditEvent({
        client: getBrowserSupabaseClient(),
        eventType: "signal_imported",
        summary: payload.signal.subject || "Latest AgentMail hint imported",
        metadata: {
          source: payload.signal.source,
          subject: payload.signal.subject,
          from: payload.signal.from,
          extracted: payload.signal.extracted
        }
      }).catch(() => {});
      showToast("Latest hint imported.");
    } catch (error) {
      setSignalError(error instanceof Error ? error.message : "Agent inbox is not connected.");
    } finally {
      setSignalStatus("idle");
    }
  }

  async function runCodexScan() {
    setMatchingStatus("loading");
    setMatchingError("");

    if (!state.signal) {
      setMatchingError("Import the latest gift hint before generating options.");
      return;
    }

    try {
      const response = await fetch("/api/codex/gift-source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: sourceText, personId: "sarah", preferLive: true })
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Gift matching could not complete.");

      const nextOptions = normalizeOptions(payload.options || [payload.candidate]);
      updateState((current) => ({
        ...current,
        codexRun: {
          status: "complete",
          source: payload.source,
          options: nextOptions
        },
        auditEvents: [
          createAuditEvent("Gift options generated", `${nextOptions.length} options prepared for Sarah.`, payload.source || "matching"),
          ...current.auditEvents
        ]
      }));
      recordKinloopAuditEvent({
        client: getBrowserSupabaseClient(),
        eventType: "gift_options_generated",
        summary: `${nextOptions.length} options prepared for Sarah.`,
        metadata: {
          source: payload.source,
          option_titles: nextOptions.map((option) => option.title)
        }
      }).catch(() => {});
      showToast("Gift options generated.");
    } catch {
      setMatchingError("Gift matching could not complete. The message text is still available for review.");
    } finally {
      setMatchingStatus("idle");
    }
  }

  function approveGift(option) {
    updateState((current) => ({
      ...current,
      approval: {
        giftId: option.id,
        title: option.title,
        approvedAt: new Date().toISOString(),
        reason: option.why
      },
      auditEvents: [
        createAuditEvent("Gift approved", `${option.title} approved for Sarah.`, "human"),
        ...current.auditEvents
      ]
    }));
    recordKinloopApproval({
      client: getBrowserSupabaseClient(),
      option
    }).catch(() => {});
    showToast(`${option.title} approved.`);
  }

  async function signIn(event) {
    event.preventDefault();
    setAuthError("");

    const client = getBrowserSupabaseClient();
    if (!client) {
      setAuthError("Sign-in is not configured on this device.");
      return;
    }

    const result = await client.auth.signInWithPassword(authForm);
    if (result.error) {
      setAuthError("We could not sign you in with those details.");
      return;
    }

    setSession(result.data.session);
    setAuthOpen(false);
    showToast("Signed in.");
  }

  async function signOut() {
    const client = getBrowserSupabaseClient();
    await client?.auth.signOut();
    setSession(null);
    showToast("Signed out.");
  }

  return (
    <main className="kinloop-shell">
      <header className="topbar">
        <button className="brand-lockup" aria-label="Kinloop home">
          <span className="brand-orbit">K</span>
          <span>
            <strong>Kinloop</strong>
            <small>Agentic gift approval</small>
          </span>
        </button>
        <div className="topbar-status" aria-label="Workflow status">
          <StatusPill label="Hint" active={Boolean(state.signal)} />
          <StatusPill label="Options" active={state.codexRun.status === "complete"} />
          <StatusPill label="Approved" active={Boolean(state.approval)} />
        </div>
        <div className="account-cluster">
          <span>{session ? session.user.email : "Local session"}</span>
          {session ? (
            <button className="button quiet" onClick={signOut}>Sign out</button>
          ) : (
            <button className="button quiet" onClick={() => setAuthOpen((open) => !open)}>Sign in</button>
          )}
        </div>
      </header>

      <section className={`command-center ${workflowState}`}>
        <SarahPanel />
        <SignalPanel
          signal={state.signal}
          sourceText={sourceText}
          signalStatus={signalStatus}
          signalError={signalError}
          onImport={importAgentMailHint}
          onSourceText={setSourceText}
        />
      </section>

      <section className="options-section" aria-labelledby="options-heading">
        <div className="section-title">
          <div>
            <p className="eyebrow">Gift matching</p>
            <h2 id="options-heading">Three gift paths for Sarah</h2>
          </div>
          <div className="option-actions">
            <span className={`run-state ${state.codexRun.status === "complete" ? "complete" : matchingStatus}`}>
              {state.codexRun.status === "complete" ? "Options ready" : matchingStatus === "loading" ? "Generating" : "Awaiting hint"}
            </span>
            <button className="button primary" onClick={runCodexScan} disabled={!state.signal || matchingStatus === "loading"}>
              {matchingStatus === "loading" ? "Generating options" : "Generate gift options"}
            </button>
          </div>
        </div>
        {matchingError && <p className="inline-error option-error">{matchingError}</p>}
        {approvedOption && <strong className="approved-note">{approvedOption.title} approved</strong>}
        <div className="option-grid">
          {options.map((option, index) => (
            <GiftOption
              key={option.id}
              option={option}
              index={index}
              approved={state.approval?.giftId === option.id}
              onApprove={approveGift}
            />
          ))}
        </div>
      </section>

      <section className="bottom-grid">
        <AuditTrail events={state.auditEvents} />
        <ApprovalBoundary approval={state.approval} />
      </section>

      {authOpen && (
        <form className="signin-drawer" onSubmit={signIn}>
          <div>
            <p className="eyebrow">Account</p>
            <h2>Sign in to sync Kinloop</h2>
          </div>
          <label>
            Email
            <input
              type="email"
              value={authForm.email}
              onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
              autoComplete="email"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={authForm.password}
              onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
              autoComplete="current-password"
            />
          </label>
          {authError && <p className="form-error">{authError}</p>}
          <button className="button primary" type="submit">Continue</button>
        </form>
      )}

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function SarahPanel() {
  return (
    <section className="panel sarah-panel" aria-labelledby="sarah-title">
      <div className="countdown-card">
        <span>14</span>
        <small>days until birthday</small>
      </div>
      <div>
        <p className="eyebrow">{sarah.relation}</p>
        <h1 id="sarah-title">Sarah's birthday needs a gift decision.</h1>
        <p>{sarah.note}</p>
      </div>
      <div className="profile-row">
        <Avatar name={sarah.name} />
        <div>
          <strong>{sarah.name}</strong>
          <span>{sarah.budget} · arrive before June 2</span>
        </div>
      </div>
      <SignalTags label="Likes" items={sarah.likes} />
      <SignalTags label="Avoid" items={sarah.avoid} muted />
    </section>
  );
}

function SignalPanel({ signal, sourceText, signalStatus, signalError, onImport, onSourceText }) {
  const extracted = signal?.extracted;

  return (
    <section className="panel signal-panel" aria-labelledby="signal-title">
      <div className="panel-head">
        <div>
          <p className="eyebrow">AgentMail inbox</p>
          <h2 id="signal-title">Latest gift hint</h2>
        </div>
        <span className="address-chip">kinloop-agent@agentmail.to</span>
      </div>
      <button className="button primary" onClick={onImport} disabled={signalStatus === "loading"}>
        {signalStatus === "loading" ? "Importing hint" : "Import latest hint"}
      </button>
      {signalError && <p className="inline-error">{signalError}</p>}
      <div className="signal-readout">
        <strong>{signal?.subject || "No hint imported yet"}</strong>
        <p>{extracted?.giftLead || "Kinloop is waiting for the newest message from the agent inbox."}</p>
        {extracted && (
          <div className="mini-grid">
            <Metric label="From" value={signal.from || "AgentMail"} />
            <Metric label="Budget" value={extracted.budget || sarah.budget} />
            <Metric label="Delivery" value={extracted.delivery || "Before June 2"} />
          </div>
        )}
      </div>
      <label className="source-editor">
        Gift hint message
        <textarea
          value={sourceText}
          onChange={(event) => onSourceText(event.target.value)}
          rows={7}
          readOnly={!signal}
          placeholder="Import the latest AgentMail hint to populate this message."
        />
      </label>
    </section>
  );
}

function GiftOption({ option, index, approved, onApprove }) {
  return (
    <article className={`gift-option ${approved ? "approved" : ""}`}>
      <div className="gift-art" aria-hidden="true">
        <span>{index + 1}</span>
      </div>
      <div className="gift-copy">
        <div className="gift-title-row">
          <h3>{option.title}</h3>
          <strong>{option.fitScore}%</strong>
        </div>
        <p>{option.caption}</p>
        <dl>
          <div>
            <dt>Why it fits</dt>
            <dd>{option.why}</dd>
          </div>
          <div>
            <dt>Watch-outs</dt>
            <dd>{option.risk}</dd>
          </div>
        </dl>
      </div>
      <div className="gift-footer">
        <span>{option.priceRange}</span>
        <span>{option.deliveryNote}</span>
      </div>
      <button className="button approve-button" onClick={() => onApprove(option)} disabled={approved}>
        {approved ? "Approved" : "Approve gift"}
      </button>
    </article>
  );
}

function AuditTrail({ events }) {
  return (
    <section className="panel audit-panel" aria-labelledby="audit-title">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Audit trail</p>
          <h2 id="audit-title">What Kinloop changed</h2>
        </div>
      </div>
      <div className="audit-list">
        {events.slice(0, 5).map((event) => (
          <article key={event.id}>
            <time>{formatTime(event.createdAt)}</time>
            <div>
              <strong>{event.title}</strong>
              <p>{event.summary}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ApprovalBoundary({ approval }) {
  return (
    <section className="panel boundary-panel" aria-labelledby="boundary-title">
      <p className="eyebrow">Human in the loop</p>
      <h2 id="boundary-title">{approval ? "Approval recorded" : "Approval is still yours"}</h2>
      <p>
        {approval
          ? `${approval.title} is approved for Sarah. Kinloop recorded the decision path without taking a purchase action.`
          : "Kinloop can import signals and prepare gift options. The final decision requires your explicit approval."}
      </p>
    </section>
  );
}

function StatusPill({ label, active }) {
  return <span className={active ? "status-pill active" : "status-pill"}>{label}</span>;
}

function Avatar({ name }) {
  return <span className="avatar">{name.split(" ").map((part) => part[0]).join("")}</span>;
}

function SignalTags({ label, items, muted = false }) {
  return (
    <div className={muted ? "signal-tags muted" : "signal-tags"}>
      <strong>{label}</strong>
      <div>{items.map((item) => <span key={item}>{item}</span>)}</div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function normalizeOptions(rawOptions) {
  const prepared = rawOptions.filter(Boolean).slice(0, 3).map((option, index) => ({
    id: option.id || `codex-option-${index + 1}`,
    title: option.title,
    caption: option.caption,
    why: option.why,
    risk: option.risk,
    priceRange: option.priceRange,
    deliveryNote: option.deliveryNote,
    sellerSignal: option.sellerSignal,
    fitScore: option.fitScore
  }));

  if (prepared.length >= 3) return prepared;

  const fill = gifts.map(giftToOption);
  while (prepared.length < 3) {
    prepared.push(fill[prepared.length]);
  }
  return prepared;
}

function giftToOption(gift) {
  return {
    id: gift.id,
    title: gift.name,
    caption: gift.caption,
    why: gift.why,
    risk: gift.consider,
    priceRange: gift.displayPrice,
    deliveryNote: gift.delivery,
    sellerSignal: gift.seller,
    fitScore: gift.score
  };
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Now";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
