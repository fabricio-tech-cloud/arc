"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Entry = {
  id: string;
  date: string;
  mood: number | null;
  sleep_hours: number | null;
  energy: number | null;
  notes: string | null;
};

export default function JournalPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [mood, setMood] = useState("7");
  const [sleep, setSleep] = useState("7.5");
  const [energy, setEnergy] = useState("7");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/journal")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed");
        setEntries(json);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        mood: Number(mood),
        sleep_hours: Number(sleep),
        energy: Number(energy),
        notes: notes || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Failed");
      return;
    }
    setNotes("");
    load();
  }

  return (
    <div className="animate-rise space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">Journal</h1>
        <p className="mt-1 text-[var(--muted)]">Mood, Schlaf, Energie — täglich festhalten.</p>
      </div>

      <form
        onSubmit={onSubmit}
        className="grid gap-3 rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)]/70 p-4 sm:grid-cols-2"
      >
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Datum</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Schlaf (h)</span>
          <input
            type="number"
            step="0.1"
            value={sleep}
            onChange={(e) => setSleep(e.target.value)}
            className="w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Mood (1–10)</span>
          <input
            type="number"
            min={1}
            max={10}
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            className="w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Energie (1–10)</span>
          <input
            type="number"
            min={1}
            max={10}
            value={energy}
            onChange={(e) => setEnergy(e.target.value)}
            className="w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-[var(--muted)]">Notiz</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-[var(--accent)] px-4 py-2 font-semibold text-[#0e1110] sm:col-span-2 sm:w-fit"
        >
          Speichern
        </button>
      </form>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      <ul className="divide-y divide-[var(--line)] rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)]/60">
        {entries.map((e) => (
          <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="font-semibold tabular-nums">{e.date}</p>
              <p className="text-sm text-[var(--muted)]">{e.notes || "—"}</p>
            </div>
            <div className="flex gap-3 text-sm tabular-nums text-[var(--accent)]">
              <span>Mood {e.mood ?? "—"}</span>
              <span>Schlaf {e.sleep_hours ?? "—"}h</span>
              <span>Energie {e.energy ?? "—"}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
