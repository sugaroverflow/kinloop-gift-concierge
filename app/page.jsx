"use client";

import { useEffect, useMemo, useState } from "react";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import { recordKinloopApproval } from "../lib/supabase/repository";

const SAMPLE_BUNDLE = {
  sources: ["messages", "contacts", "calendar"],
  people: [
    {
      id: "maya-chen",
      name: "Maya Chen",
      relationship: "Best friend",
      birthday: "2026-06-02",
      clues: ["pottery studio classes", "home espresso setup", "hosts Sunday brunch"],
      budget: "USD 60-120",
      addressStatus: "Confirmed"
    },
    {
      id: "leo-diaz",
      name: "Leo Diaz",
      relationship: "Brother",
      birthday: "2026-06-14",
      clues: ["trail running", "spicy cooking", "minimalist gear"],
      budget: "USD 40-90",
      addressStatus: "Need update"
    }
  ]
};

export default function KinloopPage() {
  const [session, setSession] = useState(null);
  const [people, setPeople] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [sourceBundle, setSourceBundle] = useState(JSON.stringify(SAMPLE_BUNDLE, null, 2));
  const [giftIdeas, setGiftIdeas] = useState([]);
  const [approvedId, setApprovedId] = useState("");
  const [callReminder, setCallReminder] = useState(false);

  const selected = useMemo(() => people.find((p) => p.id === selectedId) || people[0], [people, selectedId]);

  useEffect(() => {
    const client = getBrowserSupabaseClient();
    if (!client) return;
    client.auth.getSession().then(({ data }) => setSession(data.session));
  }, []);

  async function signInUser() {
    const client = getBrowserSupabaseClient();
    if (!client) return;
    const { data } = await client.auth.signInAnonymously();
    setSession(data.session);
  }

  function importBundle() {
    const parsed = JSON.parse(sourceBundle);
    const normalized = (parsed.people || []).map((person) => ({ ...person, notes: "", preferences: "" }));
    setPeople(normalized);
    setSelectedId(normalized[0]?.id || "");
    setGiftIdeas([]);
    setApprovedId("");
  }

  async function revealIdeas() {
    if (!selected) return;
    const input = [
      `Name: ${selected.name}`,
      `Relationship: ${selected.relationship}`,
      `Birthday: ${selected.birthday}`,
      `Clues: ${(selected.clues || []).join(", ")}`,
      `Budget: ${selected.budget}`
    ].join("\n");
    const response = await fetch("/api/gift-source", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input, personId: "sarah", preferLive: false })
    });
    const payload = await response.json();
    setGiftIdeas(payload.options || []);
  }

  async function approveIdea(idea) {
    setApprovedId(idea.id || idea.title);
    await recordKinloopApproval({ client: getBrowserSupabaseClient(), option: { id: idea.id || idea.title, title: idea.title, why: idea.why } });
  }

  return <main className="kinloop-shell">
    <h1>Kinloop</h1>
    <p>{session ? session.user?.email || "Signed in" : "Sign in to save approvals"}</p>
    {!session && <button onClick={signInUser}>Log in</button>}

    <section>
      <h2>Connected sources</h2>
      <button onClick={() => setSourceBundle(JSON.stringify(SAMPLE_BUNDLE, null, 2))}>Use sample source bundle</button>
      <textarea value={sourceBundle} onChange={(e) => setSourceBundle(e.target.value)} rows={10} aria-label="Source bundle" />
      <button onClick={importBundle}>Import source bundle</button>
    </section>

    <section>
      <h2>People & birthdays</h2>
      {people.map((p) => <button key={p.id} onClick={() => setSelectedId(p.id)}>{p.name} · {p.relationship}</button>)}
    </section>

    {selected && <section>
      <h2>Top priority gift opportunity</h2>
      <p>{selected.name} · Birthday {selected.birthday}</p>
      <input value={selected.relationship} onChange={(e) => setPeople((all) => all.map((p) => p.id === selected.id ? { ...p, relationship: e.target.value } : p))} aria-label="relationship" />
      <input value={selected.birthday} onChange={(e) => setPeople((all) => all.map((p) => p.id === selected.id ? { ...p, birthday: e.target.value } : p))} aria-label="birthday" />
      <input value={selected.addressStatus} onChange={(e) => setPeople((all) => all.map((p) => p.id === selected.id ? { ...p, addressStatus: e.target.value } : p))} aria-label="address status" />
      <input value={selected.budget} onChange={(e) => setPeople((all) => all.map((p) => p.id === selected.id ? { ...p, budget: e.target.value } : p))} aria-label="budget" />
      <textarea value={selected.preferences} onChange={(e) => setPeople((all) => all.map((p) => p.id === selected.id ? { ...p, preferences: e.target.value } : p))} aria-label="notes preferences" />
      <button onClick={revealIdeas}>Reveal gift ideas</button>
    </section>}

    <section>
      {giftIdeas.map((idea) => <article key={idea.title}>
        <h3>{idea.title}</h3><p>{idea.why}</p>
        <button onClick={() => approveIdea(idea)}>{approvedId === (idea.id || idea.title) ? "Approved" : "Approve"}</button>
      </article>)}
    </section>

    <label><input type="checkbox" checked={callReminder} onChange={(e) => setCallReminder(e.target.checked)} /> Call me 3 days before</label>
  </main>;
}
