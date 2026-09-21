"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { BodyState, MuscleId } from "body-muscles";
import { BodyMap } from "@/components/BodyMap";
import {
  GROUP_LABELS,
  GROUP_VIEW,
  TRAINING_GROUPS,
  bodyStateForGroupOnly,
  bodyStateFromGroupCounts,
  groupPath,
  muscleIdsForGroup,
  resolveGroupFromMuscleId,
  type MuscleGroupKey,
} from "@/lib/muscles";

type Workout = {
  id: string;
  date: string;
  notes: string | null;
  exercise_count: number;
};

type GroupPayload = {
  key: MuscleGroupKey;
  label: string;
  setCount: number;
  intensity: number;
  exercises: {
    id: string;
    name: string;
    muscle_group: string | null;
    date: string;
    set_count: number;
    workout_id: string;
  }[];
  suggestions: string[];
};

type WeekPayload = {
  weekStart: string;
  bodyState: BodyState;
  groups: GroupPayload[];
  totalSets: number;
};

export default function WorkoutsPage() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [week, setWeek] = useState<WeekPayload | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([
      fetch("/api/workouts").then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed");
        return json as Workout[];
      }),
      fetch("/api/muscles/week").then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed");
        return json as WeekPayload;
      }),
    ])
      .then(([w, m]) => {
        setWorkouts(w);
        setWeek(m);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c: Partial<Record<MuscleGroupKey, number>> = {};
    week?.groups.forEach((g) => {
      c[g.key] = g.setCount;
    });
    return c;
  }, [week]);

  const mainState = useMemo(() => bodyStateFromGroupCounts(counts), [counts]);

  const groupCards = week?.groups ??
    TRAINING_GROUPS.map((key) => ({
      key,
      label: GROUP_LABELS[key],
      setCount: 0,
      intensity: 0,
      exercises: [] as GroupPayload["exercises"],
      suggestions: [] as string[],
    }));

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, notes: notes || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setNotes("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  function onMuscleClick(id: MuscleId) {
    const group = resolveGroupFromMuscleId(id);
    if (group) router.push(groupPath(group));
  }

  return (
    <div className="animate-rise space-y-8">
      <section className="p-0 sm:p-0">
        <BodyMap bodyState={mainState} size="lg" showHint onMuscleClick={onMuscleClick} />
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
          <span>Intensität 0–10 = Sets diese Woche</span>
          <span className="h-2 w-16 rounded-full bg-gradient-to-r from-slate-500 via-amber-400 to-red-500" />
        </div>
      </section>

      <section>
        <h2
          className="mb-3 text-center text-xl font-normal"
          style={{ fontFamily: '"Times New Roman", Times, serif' }}
        >
          Muskelgruppen
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {groupCards.map((g) => {
            const miniState = bodyStateForGroupOnly(g.key, g.intensity > 0 ? g.intensity : 2);
            return (
              <div
                key={g.key}
                className="relative rounded-[1.75rem] bg-[var(--bg-elevated)] p-3 text-center transition hover:bg-[var(--bg-soft)]"
              >
                <Link
                  href={groupPath(g.key)}
                  className="absolute inset-0 z-10 rounded-[1.75rem]"
                  aria-label={`${g.label} — Übungen`}
                />
                <p
                  className="mb-2 text-base font-normal text-[var(--text)]"
                  style={{ fontFamily: '"Times New Roman", Times, serif' }}
                >
                  {g.label}
                </p>
                <BodyMap
                  bodyState={miniState}
                  view={GROUP_VIEW[g.key]}
                  size="sm"
                  showToggle={false}
                  interactive={false}
                  focusIds={muscleIdsForGroup(g.key)}
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">Sessions</h2>
        <form
          onSubmit={onCreate}
          className="grid gap-3 rounded-[1.75rem] bg-[var(--bg-elevated)] p-4 sm:grid-cols-[1fr_2fr_auto]"
        >
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Datum</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Notiz</span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Push day, gute Energie…"
              className="w-full rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={busy}
              className="arc-chrome w-full rounded-[1.75rem] px-4 py-2 font-semibold disabled:opacity-60 sm:w-auto"
            >
              {busy ? "…" : "Anlegen"}
            </button>
          </div>
        </form>

        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

        <ul className="divide-y divide-white/8 rounded-[1.75rem] bg-[var(--bg-elevated)]">
          {workouts.length === 0 && (
            <li className="px-4 py-6 text-[var(--muted)]">Noch leer — erstes Workout oben anlegen.</li>
          )}
          {workouts.map((w) => (
            <li key={w.id}>
              <Link
                href={`/workouts/${w.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3.5 transition hover:bg-[var(--bg-soft)]"
              >
                <div>
                  <p className="font-semibold tabular-nums">{w.date}</p>
                  <p className="text-sm text-[var(--muted)]">{w.notes || "—"}</p>
                </div>
                <span className="rounded-full bg-[var(--bg-soft)] px-2.5 py-1 text-xs text-[var(--accent)]">
                  {w.exercise_count} Übungen
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
