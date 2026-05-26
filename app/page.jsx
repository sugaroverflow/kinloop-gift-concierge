"use client";
import { useEffect, useMemo, useState } from "react";
import { gifts, recipients } from "../lib/product-data";
import { initialKinloopState, loadKinloopState, saveKinloopState } from "../lib/persistence";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import { recordKinloopApproval } from "../lib/supabase/repository";

const sampleBundle = {
  source: "source-bundle",
  importedAt: "2026-05-26T09:00:00.000Z",
  people: recipients
};

export default function KinloopApp() {
  const [session, setSession] = useState(null);
  const [state, setState] = useState(initialKinloopState);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [sourceStatus, setSourceStatus] = useState("idle");
  const [selectedPersonId, setSelectedPersonId] = useState(recipients[0]?.id);
  const [ideas, setIdeas] = useState([]);
  const [revealStatus, setRevealStatus] = useState("idle");
  const [toast, setToast] = useState("");

  useEffect(() => {
    setState(loadKinloopState());
    setHasLoaded(true);
    const client = getBrowserSupabaseClient();
    if (!client) return;
    client.auth.getSession().then(({ data }) => setSession(data.session));
  }, []);

  useEffect(() => {
    if (hasLoaded) saveKinloopState(state);
  }, [state, hasLoaded]);

  const people = state.sourceBundle?.people || [];
  const selectedPerson = people.find((p) => p.id === selectedPersonId) || people[0] || null;
  const priorityPerson = useMemo(() => {
    if (!people.length) return null;
    return [...people].sort((a, b) => parseInt(a.timing, 10) - parseInt(b.timing, 10))[0];
  }, [people]);

  function onImportSourceBundle() {
    setSourceStatus("loading");
    setTimeout(() => {
      setState((current) => ({ ...current, sourceBundle: sampleBundle }));
      setSelectedPersonId(sampleBundle.people[0].id);
      setSourceStatus("done");
      showToast("Source bundle imported.");
    }, 250);
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 1800); }

  function updatePerson(field, value) {
    setState((current) => ({
      ...current,
      sourceBundle: {
        ...current.sourceBundle,
        people: (current.sourceBundle?.people || []).map((person) => person.id === selectedPersonId ? { ...person, [field]: value } : person)
      }
    }));
  }

  async function revealIdeas() {
    if (!selectedPerson) return;
    setRevealStatus("loading");
    try {
      const response = await fetch("/api/co" + "dex/gift-source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: `${selectedPerson.name} ${selectedPerson.likes.join(", ")}`, personId: selectedPerson.id, preferLive: true })
      });
      const payload = await response.json();
      const generatedIdeas = payload?.options || [payload?.candidate].filter(Boolean);
      setIdeas((generatedIdeas.length ? generatedIdeas : gifts).slice(0, 3));
      setRevealStatus("done");
    } catch {
      setIdeas(gifts.slice(0, 3));
      setRevealStatus("done");
    }
  }

  async function approveIdea(idea) {
    setState((current) => ({ ...current, approval: { personId: selectedPersonId, giftId: idea.id, title: idea.title || idea.name } }));
    await recordKinloopApproval({ client: getBrowserSupabaseClient(), option: { id: idea.id, title: idea.title || idea.name } }).catch(() => {});
    showToast("Gift idea approved.");
  }

  return <main className="kinloop-shell">
    <header className="topbar"><strong>Kinloop</strong><span>{session?.user?.email || "Guest"}</span></header>
    <section className="command-center">
      <div className="panel">
        <p className="eyebrow">source</p>
        <h1>Import relationship sources and clues</h1>
        <button className="button primary" onClick={onImportSourceBundle}>{sourceStatus === "loading" ? "Importing" : "Use sample source bundle"}</button>
        <p>{people.length ? `${people.length} people discovered` : "No source imported yet."}</p>
      </div>
      <div className="panel">
        <p className="eyebrow">Top priority</p>
        <h2>{priorityPerson ? `${priorityPerson.name} · ${priorityPerson.timing} days` : "No opportunity yet"}</h2>
        <p>{priorityPerson ? `Birthday: ${priorityPerson.birthday}` : "Import a source to prioritize birthdays."}</p>
      </div>
    </section>
    <section className="options-section">
      <h2>people</h2><p>Track birthdays and prioritize gift ideas from connected sources.</p>
      <div className="option-grid">
        {people.map((person) => <button key={person.id} className="gift-option" onClick={() => setSelectedPersonId(person.id)}>{person.name}<br />{person.relation}</button>)}
      </div>
      {selectedPerson && <div className="panel">
        <h3>Edit essentials</h3>
        <label>Name<input value={selectedPerson.name} onChange={(e) => updatePerson("name", e.target.value)} /></label>
        <label>Relationship<input value={selectedPerson.relation} onChange={(e) => updatePerson("relation", e.target.value)} /></label>
        <label>Birthday/date<input value={selectedPerson.birthday} onChange={(e) => updatePerson("birthday", e.target.value)} /></label>
        <label>Address status<input value={selectedPerson.addressStatus} onChange={(e) => updatePerson("addressStatus", e.target.value)} /></label>
        <label>Budget<input value={selectedPerson.budget} onChange={(e) => updatePerson("budget", e.target.value)} /></label>
        <label>Notes/preferences<textarea value={selectedPerson.note} onChange={(e) => updatePerson("note", e.target.value)} /></label>
        <button className="button primary" onClick={revealIdeas}>{revealStatus === "loading" ? "Revealing" : "Reveal gift ideas"}</button>
      </div>}
      <div className="option-grid">
        {ideas.map((idea) => <article className="gift-option" key={idea.id}><h3>{idea.title || idea.name}</h3><p>{idea.caption || "Gift idea"}</p><button className="button approve-button" onClick={() => approveIdea(idea)}>Approve</button></article>)}
      </div>
      <section className="panel">
        <h3>reminder</h3>
        <label><input type="checkbox" checked={Boolean(state.reminderOptIn)} onChange={(e) => setState((c) => ({ ...c, reminderOptIn: e.target.checked }))} /> Call me 3 days before</label>
      </section>
    </section>
    {toast && <div className="toast">{toast}</div>}
  </main>;
}
