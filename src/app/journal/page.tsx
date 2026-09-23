"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { SwipeDeleteRow } from "@/components/SwipeDeleteRow";
import { GROUP_LABELS, resolveMuscleGroup, type MuscleGroupKey } from "@/lib/muscles";

type Entry = {
  id: string;
  date: string;
  sleep_hours: number | null;
  notes: string | null;
};

type DayWorkout = {
  id: string;
  date: string;
  name: string | null;
  notes: string | null;
  completed: boolean;
  duration_minutes: number | null;
  exercise_count: number;
  muscle_groups: (string | null)[];
};

function formatEntryDate(raw: string) {
  return raw.slice(0, 10);
}

function workoutTitle(w: Pick<DayWorkout, "name" | "notes" | "muscle_groups">) {
  if (w.name?.trim()) return w.name.trim();
  const labels = [
    ...new Set(
      w.muscle_groups
        .map((g) => resolveMuscleGroup(g))
        .filter((g): g is MuscleGroupKey => !!g)
        .map((g) => GROUP_LABELS[g]),
    ),
  ];
  if (labels.length) return labels.join(" + ");
  if (w.notes?.trim()) return w.notes.trim();
  return "Workout";
}

export default function JournalPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [dayWorkouts, setDayWorkouts] = useState<DayWorkout[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sleep, setSleep] = useState("7.5");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [swipeOpenId, setSwipeOpenId] = useState<string | null>(null);
  const [confirmWorkoutId, setConfirmWorkoutId] = useState<string | null>(null);
  const [deletingWorkout, setDeletingWorkout] = useState(false);

  const loadJournal = useCallback(() => {
    fetch("/api/journal")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed");
        setEntries(json);
      })
      .catch((err) => setError(err.message));
  }, []);

  const loadDayWorkouts = useCallback((forDate: string) => {
    fetch(`/api/workouts?date=${encodeURIComponent(forDate)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed");
        setDayWorkouts(json);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    loadJournal();
  }, [loadJournal]);

  useEffect(() => {
    loadDayWorkouts(date);
  }, [date, loadDayWorkouts]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        sleep_hours: Number(sleep),
        notes: notes || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Failed");
      return;
    }
    setNotes("");
    loadJournal();
  }

  async function removeEntry(id: string) {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/journal/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed");
      setConfirmId(null);
      setSwipeOpenId(null);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setDeleting(false);
    }
  }

  async function removeWorkout(id: string) {
    setDeletingWorkout(true);
    setError(null);
    try {
      const res = await fetch(`/api/workouts/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed");
      setConfirmWorkoutId(null);
      setDayWorkouts((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setDeletingWorkout(false);
    }
  }

  async function patchWorkout(
    id: string,
    patch: { completed?: boolean; notes?: string | null; duration_minutes?: number | null },
  ) {
    setSavingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/workouts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setDayWorkouts((prev) => prev.map((w) => (w.id === id ? { ...w, ...json } : w)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="animate-rise space-y-8">
      <form
        onSubmit={onSubmit}
        className="grid gap-3 rounded-[1.75rem] bg-[var(--bg-elevated)] p-4 sm:grid-cols-2"
      >
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Datum</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Schlaf (h)</span>
          <input
            type="number"
            step="0.1"
            value={sleep}
            onChange={(e) => setSleep(e.target.value)}
            className="w-full rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-[var(--muted)]">Notiz</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]"
          />
        </label>
        <button
          type="submit"
          className="arc-chrome rounded-[1.75rem] px-4 py-2 font-semibold sm:col-span-2 sm:w-fit"
        >
          Speichern
        </button>
      </form>

      <section className="space-y-3 rounded-[1.75rem] bg-[var(--bg-elevated)] p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2
            className="text-lg font-semibold"
            style={{ fontFamily: '"Times New Roman", Times, serif' }}
          >
            Workouts
          </h2>
          <p className="text-[12px] tabular-nums text-white/35">{date}</p>
        </div>

        {dayWorkouts.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-[var(--muted)]">Keine Workouts an diesem Tag.</p>
            <Link
              href="/workouts"
              className="inline-flex text-[13px] text-white/55 underline-offset-2 hover:text-white hover:underline"
            >
              Workout anlegen →
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {dayWorkouts.map((w) => {
              const title = workoutTitle(w);
              const busy = savingId === w.id;
              const confirming = confirmWorkoutId === w.id;
              return (
                <li
                  key={w.id}
                  className={`overflow-hidden rounded-[1.75rem] border border-white/8 ${
                    w.completed ? "bg-emerald-500/8" : "bg-white/[0.03]"
                  }`}
                >
                  {confirming ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3">
                      <p className="text-sm text-white/70">Session wirklich entfernen?</p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={deletingWorkout}
                          onClick={() => setConfirmWorkoutId(null)}
                          className="rounded-[1.75rem] px-3 py-1.5 text-xs text-white/60 hover:text-white"
                        >
                          Abbrechen
                        </button>
                        <button
                          type="button"
                          disabled={deletingWorkout}
                          onClick={() => void removeWorkout(w.id)}
                          className="rounded-[1.75rem] bg-[#ff3b30] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          {deletingWorkout ? "…" : "Entfernen"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-medium text-white">{title}</p>
                          <p className="mt-0.5 text-[12px] text-white/40">
                            {w.exercise_count} Übungen
                            {w.completed ? " · erledigt" : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => patchWorkout(w.id, { completed: !w.completed })}
                            className={`rounded-[1.75rem] px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                              w.completed
                                ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                                : "bg-white/8 text-white/70 hover:bg-white/12 hover:text-white"
                            }`}
                          >
                            {w.completed ? "Erledigt" : "Erledigen"}
                          </button>
                          <button
                            type="button"
                            disabled={busy || deletingWorkout}
                            onClick={() => setConfirmWorkoutId(w.id)}
                            className="rounded-[1.75rem] bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/25 hover:text-red-200 disabled:opacity-50"
                          >
                            Löschen
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-[1fr_7rem]">
                        <label className="text-sm">
                          <span className="mb-1 block text-[11px] text-white/40">Notiz</span>
                          <input
                            type="text"
                            defaultValue={w.notes ?? ""}
                            key={`${w.id}-notes-${w.notes ?? ""}`}
                            disabled={busy}
                            onBlur={(e) => {
                              const next = e.target.value.trim() || null;
                              if (next !== (w.notes ?? null)) {
                                patchWorkout(w.id, { notes: next });
                              }
                            }}
                            placeholder="Session-Notiz…"
                            className="w-full rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                          />
                        </label>
                        <label className="text-sm">
                          <span className="mb-1 block text-[11px] text-white/40">Zeit (min)</span>
                          <input
                            type="number"
                            min={0}
                            step={5}
                            defaultValue={w.duration_minutes ?? ""}
                            key={`${w.id}-dur-${w.duration_minutes ?? ""}`}
                            disabled={busy}
                            onBlur={(e) => {
                              const raw = e.target.value.trim();
                              const next = raw === "" ? null : Number(raw);
                              if (next !== w.duration_minutes) {
                                patchWorkout(w.id, { duration_minutes: next });
                              }
                            }}
                            placeholder="—"
                            className="w-full rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm tabular-nums outline-none focus:border-[var(--accent)]"
                          />
                        </label>
                      </div>

                      <Link
                        href={`/workouts/${w.id}`}
                        className="inline-flex text-[12px] text-white/40 underline-offset-2 hover:text-white/70 hover:underline"
                      >
                        Session öffnen →
                      </Link>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      <ul className="overflow-hidden rounded-[1.75rem] bg-[var(--bg-elevated)]">
        {entries.map((e) => {
          const confirming = confirmId === e.id;
          return (
            <li key={e.id} className="border-b border-white/8 last:border-b-0">
              <SwipeDeleteRow
                open={swipeOpenId === e.id || confirming}
                onOpenChange={(open) => {
                  if (!open) {
                    setSwipeOpenId(null);
                    setConfirmId(null);
                    return;
                  }
                  setSwipeOpenId(e.id);
                }}
                actionLabel={confirming ? (deleting ? "…" : "Entfernen") : "Löschen"}
                onDelete={() => {
                  if (confirming) {
                    if (!deleting) removeEntry(e.id);
                    return;
                  }
                  setConfirmId(e.id);
                  setSwipeOpenId(e.id);
                }}
              >
                {confirming ? (
                  <p className="text-sm text-white/70">Eintrag wirklich entfernen?</p>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold tabular-nums">{formatEntryDate(e.date)}</p>
                      <p className="text-sm text-[var(--muted)]">{e.notes || "—"}</p>
                    </div>
                    <span className="text-sm tabular-nums text-[var(--accent)]">
                      Schlaf {e.sleep_hours ?? "—"}h
                    </span>
                  </div>
                )}
              </SwipeDeleteRow>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
