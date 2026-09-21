"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Supp = {
  id: string;
  name: string;
  dose: string | null;
  time: string | null;
  notes: string | null;
};

export default function SupplementsPage() {
  const [items, setItems] = useState<Supp[]>([]);
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/supplements")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed");
        setItems(json);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/supplements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        dose: dose || null,
        time: new Date().toISOString(),
        notes: notes || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Failed");
      return;
    }
    setName("");
    setDose("");
    setNotes("");
    load();
  }

  return (
    <div className="animate-rise space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">Supplements</h1>
        <p className="mt-1 text-[var(--muted)]">Was du nimmst — mit Dosis und Zeitpunkt.</p>
      </div>

      <form
        onSubmit={onSubmit}
        className="grid gap-3 rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)]/70 p-4 sm:grid-cols-[2fr_1fr_2fr_auto]"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name (Creatine, Vitamin D…)"
          required
          className="rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]"
        />
        <input
          value={dose}
          onChange={(e) => setDose(e.target.value)}
          placeholder="Dosis"
          className="rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]"
        />
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notiz"
          className="rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]"
        />
        <button type="submit" className="rounded-md bg-[var(--accent)] px-4 py-2 font-semibold text-[#0e1110]">
          Loggen
        </button>
      </form>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      <ul className="divide-y divide-[var(--line)] rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)]/60">
        {items.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="font-semibold">{s.name}</p>
              <p className="text-sm text-[var(--muted)]">
                {s.dose || "—"} · {s.notes || "keine Notiz"}
              </p>
            </div>
            <span className="text-xs tabular-nums text-[var(--muted)]">
              {s.time ? new Date(s.time).toLocaleString() : "—"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
