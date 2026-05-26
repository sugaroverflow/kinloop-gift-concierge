"use client";

import { useEffect, useMemo, useState } from "react";
import sourceBundle from "../data/kinloop/agentmail-inbox-sample.json";
import { gifts, recipients } from "../lib/product-data";
import { initialKinloopState, loadKinloopState, saveKinloopState } from "../lib/persistence";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import { recordKinloopApproval } from "../lib/supabase/repository";

const dueSoonest = (left, right) => timingDays(left.timing) - timingDays(right.timing);

export default function KinloopApp() {
  const [state, setState] = useState(initialKinloopState);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [session, setSession] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authForm, setAuthForm] = useState({ email: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [people, setPeople] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [sourceStatus, setSourceStatus] = useState("idle");
  const [giftStatus, setGiftStatus] = useState("idle");
  const [giftError, setGiftError] = useState("");
  const [giftIdeas, setGiftIdeas] = useState([]);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [toast, setToast] = useState("");

  const selectedPerson = useMemo(
    () => people.find((person) => person.id === selectedId) || people[0] || null,
    [people, selectedId]
  );
  const priorityPerson = useMemo(() => [...people].sort(dueSoonest)[0] || null, [people]);
  const approvedIdea = giftIdeas.find((idea) => idea.id === state.approval?.giftId);

  useEffect(() => {
    const loaded = loadKinloopState();
    setState(loaded);
    setReminderEnabled(Boolean(loaded.reminderEnabled));
    setPeople(Array.isArray(loaded.discoveredPeople) ? loaded.discoveredPeople : []);
    setSelectedId(loaded.selectedPersonId || "");
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
    if (!hasLoaded) return;
    saveKinloopState({
      ...state,
      reminderEnabled,
      discoveredPeople: people,
      selectedPersonId: selectedId
    });
  }, [state, reminderEnabled, people, selectedId, hasLoaded]);

  function showToast(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  function importSources() {
    setSourceStatus("loading");
    window.setTimeout(() => {
      const discovered = buildDiscoveredPeople();
      setPeople(discovered);
      setSelectedId((current) => current || discovered[0]?.id || "");
      setGiftIdeas([]);
      setSourceStatus("ready");
      showToast(`${discovered.length} people found.`);
    }, 240);
  }

  function updatePerson(field, value) {
    setPeople((current) => current.map((person) => (
      person.id === selectedPerson?.id ? { ...person, [field]: value } : person
    )));
  }

  async function revealGiftIdeas() {
    if (!selectedPerson) return;
    setGiftStatus("loading");
    setGiftError("");

    try {
      const response = await fetch("/api/gift-source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: sourceTextForPerson(selectedPerson),
          personId: selectedPerson.id,
          preferLive: true
        })
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Gift ideas could not be prepared.");

      const nextIdeas = normalizeIdeas(payload.options || [payload.candidate], selectedPerson);
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
      showToast("Gift ideas ready.");
    } catch {
      const fallback = gifts.slice(0, 3).map((gift) => giftToIdea(gift, selectedPerson));
      setGiftIdeas(fallback);
      setGiftStatus("ready");
      setGiftError("Using saved product feed while live matching is unavailable.");
    }
  }

  async function approveIdea(idea) {
    setState((current) => ({
      ...current,
      approval: {
        giftId: idea.id,
        personId: selectedPerson?.id,
        title: idea.title,
        approvedAt: new Date().toISOString(),
        reason: idea.why
      }
    }));
    recordKinloopApproval({ client: getBrowserSupabaseClient(), option: idea }).catch(() => {});
    showToast(`${idea.title} approved.`);
  }

  async function signIn(event) {
    event.preventDefault();
    setAuthError("");

    const client = getBrowserSupabaseClient();
    if (!client) {
      setAuthError("Sign-in is not configured here. You can still use this device.");
      return;
    }

    const result = await client.auth.signInWithPassword(authForm);
    if (result.error) {
      setAuthError("Those details did not sign you in.");
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
          <span className="brand-mark">K</span>
          <span>
            <strong>Kinloop</strong>
            <small>Gift concierge</small>
          </span>
        </button>
        <nav className="topbar-status" aria-label="Progress">
          <StatusPill label="Sources" active={people.length > 0} />
          <StatusPill label="Ideas" active={giftIdeas.length > 0} />
          <StatusPill label="Approved" active={Boolean(state.approval)} />
        </nav>
        <div className="account-cluster">
          <span>{session ? session.user.email : "This device"}</span>
          {session ? (
            <button className="button quiet" onClick={signOut}>Sign out</button>
          ) : (
            <button className="button quiet" onClick={() => setAuthOpen((open) => !open)}>Sign in</button>
          )}
        </div>
      </header>

      <section className="hero-grid" aria-label="Gift concierge workspace">
        <section className="source-panel" aria-labelledby="source-title">
          <div className="source-copy">
            <p className="eyebrow">Connected sources</p>
            <h1 id="source-title">Birthdays, clues, and gift timing in one place.</h1>
            <p>Import relationship context, then choose what feels right. Kinloop keeps the decision yours.</p>
          </div>
          <button className="button primary large" onClick={importSources} disabled={sourceStatus === "loading"}>
            {sourceStatus === "loading" ? "Importing sources" : people.length ? "Refresh sources" : "Import connected sources"}
          </button>
          <div className="source-stats" aria-label="Source summary">
            <Metric label="People" value={people.length ? String(people.length) : "Ready"} />
            <Metric label="Clues" value={people.length ? String(totalClues(people)) : "Waiting"} />
            <Metric label="Next date" value={priorityPerson?.birthday || "After import"} />
          </div>
        </section>

        <section className="priority-panel" aria-labelledby="priority-title">
          <p className="eyebrow">Top priority</p>
          {priorityPerson ? (
            <>
              <div className="priority-head">
                <Avatar name={priorityPerson.name} tone={priorityPerson.id} />
                <div>
                  <h2 id="priority-title">{priorityPerson.name}</h2>
                  <p>{priorityPerson.relation} · {priorityPerson.timing}</p>
                </div>
              </div>
              <p>{priorityPerson.note}</p>
              <button className="button" onClick={() => setSelectedId(priorityPerson.id)}>
                Review this birthday
              </button>
            </>
          ) : (
            <>
              <h2 id="priority-title">No birthday selected yet</h2>
              <p>Import sources to find the next relationship that needs a thoughtful gift decision.</p>
            </>
          )}
        </section>
      </section>

      <section className="workspace-grid">
        <aside className="people-panel" aria-labelledby="people-title">
          <div className="panel-title">
            <p className="eyebrow">People</p>
            <h2 id="people-title">Upcoming birthdays</h2>
          </div>
          <div className="people-list">
            {(people.length ? people : recipients).map((person) => (
              <button
                className={person.id === selectedPerson?.id ? "person-row active" : "person-row"}
                key={person.id}
                onClick={() => setSelectedId(person.id)}
              >
                <Avatar name={person.name} tone={person.id} />
                <span>
                  <strong>{person.name}</strong>
                  <small>{person.birthday} · {person.timing}</small>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="detail-panel" aria-labelledby="detail-title">
          {selectedPerson ? (
            <>
              <div className="panel-title split">
                <div>
                  <p className="eyebrow">Gift opportunity</p>
                  <h2 id="detail-title">{selectedPerson.name}</h2>
                </div>
                <span className="date-chip">{selectedPerson.timing}</span>
              </div>

              <div className="essentials-grid">
                <label>
                  Relationship
                  <input value={selectedPerson.relation} onChange={(event) => updatePerson("relation", event.target.value)} />
                </label>
                <label>
                  Birthday
                  <input value={selectedPerson.birthday} onChange={(event) => updatePerson("birthday", event.target.value)} />
                </label>
                <label>
                  Budget
                  <input value={selectedPerson.budget} onChange={(event) => updatePerson("budget", event.target.value)} />
                </label>
                <label>
                  Address
                  <input value={selectedPerson.addressStatus} onChange={(event) => updatePerson("addressStatus", event.target.value)} />
                </label>
              </div>

              <label className="note-field">
                Notes
                <textarea value={selectedPerson.note} onChange={(event) => updatePerson("note", event.target.value)} rows={4} />
              </label>

              <div className="clue-strip">
                {selectedPerson.clues.map((clue) => <span key={clue}>{clue}</span>)}
              </div>

              <div className="reveal-row">
                <button className="button primary" onClick={revealGiftIdeas} disabled={giftStatus === "loading"}>
                  {giftStatus === "loading" ? "Revealing ideas" : "Reveal gift ideas"}
                </button>
                <p>{giftIdeas.length ? `${giftIdeas.length} ideas prepared for ${selectedPerson.name}.` : "Ideas are based on sources, preferences, and product availability."}</p>
              </div>
              {giftError && <p className="inline-error">{giftError}</p>}
            </>
          ) : (
            <div className="empty-state">
              <h2 id="detail-title">Import sources to begin</h2>
              <p>Kinloop will discover people, dates, and gift clues from the source bundle.</p>
            </div>
          )}
        </section>
      </section>

      <section className="ideas-section" aria-labelledby="ideas-title">
        <div className="section-title">
          <div>
            <p className="eyebrow">Gift ideas</p>
            <h2 id="ideas-title">{selectedPerson ? `For ${selectedPerson.name}` : "Ready when sources are imported"}</h2>
          </div>
          {approvedIdea && <strong className="approved-note">{approvedIdea.title} approved</strong>}
        </div>

        <div className="idea-grid">
          {(giftIdeas.length ? giftIdeas : gifts.slice(0, 3).map((gift) => giftToIdea(gift, selectedPerson))).map((idea, index) => (
            <GiftIdea
              key={idea.id || idea.title}
              idea={idea}
              index={index}
              approved={state.approval?.giftId === idea.id}
              onApprove={approveIdea}
            />
          ))}
        </div>
      </section>

      <section className="reminder-band" aria-labelledby="reminder-title">
        <div>
          <p className="eyebrow">Reminder</p>
          <h2 id="reminder-title">Get a call before the gift window closes.</h2>
          <p>Kinloop can remind you three days before the order deadline so the final decision does not slip.</p>
        </div>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={reminderEnabled}
            onChange={(event) => {
              setReminderEnabled(event.target.checked);
              showToast(event.target.checked ? "Reminder call enabled." : "Reminder call paused.");
            }}
          />
          <span>{reminderEnabled ? "Reminder call enabled" : "Call me 3 days before"}</span>
        </label>
      </section>

      <footer className="app-footer">
        <span>Privacy and controls</span>
        <span>Approval only. No purchase or payment happens in Kinloop.</span>
      </footer>

      {authOpen && (
        <form className="signin-drawer" onSubmit={signIn}>
          <div>
            <p className="eyebrow">Account</p>
            <h2>Sign in to save Kinloop</h2>
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

function GiftIdea({ idea, index, approved, onApprove }) {
  return (
    <article className={approved ? "gift-idea approved" : "gift-idea"}>
      <div className={`idea-art tone-${index + 1}`} aria-hidden="true">
        <span>{index + 1}</span>
      </div>
      <div className="idea-copy">
        <div className="gift-title-row">
          <h3>{idea.title}</h3>
          <strong>{idea.fitScore}%</strong>
        </div>
        <p>{idea.caption}</p>
        <dl>
          <div>
            <dt>Why it fits</dt>
            <dd>{idea.why}</dd>
          </div>
          <div>
            <dt>Check first</dt>
            <dd>{idea.risk}</dd>
          </div>
        </dl>
      </div>
      <div className="idea-footer">
        <span>{idea.priceRange}</span>
        <span>{idea.deliveryNote}</span>
      </div>
      <button className="button approve-button" onClick={() => onApprove(idea)} disabled={approved}>
        {approved ? "Approved" : "Approve"}
      </button>
    </article>
  );
}

function StatusPill({ label, active }) {
  return <span className={active ? "status-pill active" : "status-pill"}>{label}</span>;
}

function Avatar({ name, tone = "" }) {
  const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2);
  return <span className={`avatar avatar-${tone.replace(/[^a-z0-9]/gi, "")}`}>{initials}</span>;
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function buildDiscoveredPeople() {
  return recipients
    .map((person) => {
      const source = sourceBundle.byPerson?.[person.id] || {};
      const interests = source.interests?.length ? source.interests : person.likes;
      const avoid = source.avoid?.length ? source.avoid : person.avoid;
      return {
        ...person,
        clues: interests.slice(0, 5),
        avoid,
        sourceCount: source.messageCount || person.sourceSummary?.length || 0,
        sourceSubjects: source.subjects || []
      };
    })
    .sort(dueSoonest);
}

function sourceTextForPerson(person) {
  const source = sourceBundle.byPerson?.[person.id] || {};
  return [
    `Name: ${person.name}`,
    `Relationship: ${person.relation}`,
    `Birthday: ${person.birthday}`,
    `Budget: ${person.budget}`,
    `Interests: ${person.clues.join(", ")}`,
    `Avoid: ${(person.avoid || []).join(", ")}`,
    `Notes: ${person.note}`,
    `Recent subjects: ${(source.subjects || []).slice(0, 5).join("; ")}`
  ].join("\n");
}

function normalizeIdeas(rawIdeas, person) {
  const prepared = rawIdeas.filter(Boolean).slice(0, 3).map((idea, index) => ({
    id: idea.id || `gift-idea-${index + 1}`,
    title: idea.title || idea.name,
    caption: idea.caption || "A gift idea selected from the product feed.",
    why: idea.why || `Matches ${person.name}'s current clues.`,
    risk: idea.risk || idea.consider || "Confirm delivery and fit before approving.",
    priceRange: idea.priceRange || idea.displayPrice || "Price shown by seller",
    deliveryNote: idea.deliveryNote || idea.delivery || "Check delivery before the birthday",
    sellerSignal: idea.sellerSignal || idea.seller || "Seller details available before purchase",
    fitScore: clampScore(idea.fitScore || idea.score || 82)
  }));

  const fill = gifts.map((gift) => giftToIdea(gift, person));
  while (prepared.length < 3) prepared.push(fill[prepared.length]);
  return prepared;
}

function giftToIdea(gift, person) {
  return {
    id: gift.id,
    title: gift.name,
    caption: gift.caption,
    why: gift.why || (person ? `Matches ${person.name}'s clues.` : "Matches imported gift clues."),
    risk: gift.consider,
    priceRange: gift.displayPrice,
    deliveryNote: gift.delivery,
    sellerSignal: gift.seller,
    fitScore: gift.score
  };
}

function totalClues(list) {
  return list.reduce((count, person) => count + (person.clues?.length || 0), 0);
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
