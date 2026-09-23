"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { SwipeBack } from "@/components/SwipeBack";
import type { CartSetDraft } from "@/components/SessionCart";
import {
  GROUP_LABELS,
  TRAINING_GROUPS,
  resolveMuscleGroup,
  type MuscleGroupKey,
} from "@/lib/muscles";
import {
  parsePlanExercises,
  type SessionPlanExercise,
  type WeekMode,
} from "@/lib/session-schedule";
import { WEEKDAYS } from "@/lib/supplements";

type EditExercise = {
  name: string;
  muscleGroup: MuscleGroupKey;
  sets: CartSetDraft[];
};

function toDraftSets(sets: SessionPlanExercise["sets"]): CartSetDraft[] {
  if (!sets.length) return [{ reps: "", weight: "", rir: "", failure: false }];
  return sets.map((s) => ({
    reps: s.reps == null ? "" : String(s.reps),
    weight: s.weight == null ? "" : String(s.weight),
    rir: s.rir == null ? "" : String(s.rir),
    failure: Boolean(s.failure),
  }));
}

function fromPlanExercises(raw: SessionPlanExercise[]): EditExercise[] {
  return raw.map((ex) => ({
    name: ex.name,
    muscleGroup: resolveMuscleGroup(ex.muscle_group) ?? TRAINING_GROUPS[0]!,
    sets: toDraftSets(ex.sets),
  }));
}

export default function EditSessionPlanPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [days, setDays] = useState<number[]>([]);
  const [weekMode, setWeekMode] = useState<WeekMode>("every");
  const [intervalWeeks, setIntervalWeeks] = useState(2);
  const [exercises, setExercises] = useState<EditExercise[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/session-plans/${id}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed");
        setName(json.name ?? "");
        setNotes(json.notes ?? "");
        setDays(Array.isArray(json.days) ? json.days.map(Number) : []);
        setWeekMode((json.week_mode as WeekMode) || "every");
        setIntervalWeeks(json.interval_weeks ?? 2);
        setExercises(fromPlanExercises(parsePlanExercises(json.exercises)));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  function updateSet(exName: string, index: number, patch: Partial<CartSetDraft>) {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.name !== exName) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s, i) => (i === index ? { ...s, ...patch } : s)),
        };
      }),
    );
  }

  function addSetRow(exName: string) {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.name === exName
          ? { ...ex, sets: [...ex.sets, { reps: "", weight: "", rir: "", failure: false }] }
          : ex,
      ),
    );
  }

  function removeSetRow(exName: string, index: number) {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.name !== exName) return ex;
        const next = ex.sets.filter((_, i) => i !== index);
        return {
          ...ex,
          sets: next.length ? next : [{ reps: "", weight: "", rir: "", failure: false }],
        };
      }),
    );
  }

  function toggleFailure(exName: string, index: number) {
    const ex = exercises.find((e) => e.name === exName);
    const current = ex?.sets[index];
    if (!current) return;
    const nextFailure = !current.failure;
    updateSet(exName, index, {
      failure: nextFailure,
      rir: nextFailure ? "0" : "",
    });
  }

  function removeExercise(exName: string) {
    setExercises((prev) => prev.filter((ex) => ex.name !== exName));
  }

  function toggleDay(day: number) {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b),
    );
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (exercises.length === 0 || busy) return;
    if (days.length === 0) {
      setError("Mindestens einen Wochentag wählen");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/session-plans/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || null,
          notes: notes.trim() || null,
          days,
          week_mode: weekMode,
          interval_weeks: weekMode === "interval" ? intervalWeeks : null,
          exercises: exercises.map((item) => ({
            name: item.name,
            muscle_group: item.muscleGroup,
            sets: item.sets,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      router.push("/workouts");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!confirm("Session wirklich löschen?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/session-plans/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed");
      router.push("/workouts");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-[var(--muted)]">Laden…</p>;
  }

  if (error && exercises.length === 0) {
    return (
      <div className="animate-rise space-y-4">
        <SwipeBack href="/workouts" />
        <p className="text-[var(--danger)]">{error}</p>
        <Link href="/workouts" className="text-sm text-[var(--accent)]">
          ← Zurück
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSave} className="animate-rise space-y-8">
      <SwipeBack href="/workouts" />
      <div className="text-center">
        <h1
          className="text-3xl font-normal text-[var(--text)]"
          style={{ fontFamily: '"Times New Roman", Times, serif' }}
        >
          Session bearbeiten
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {exercises.length} {exercises.length === 1 ? "Übung" : "Übungen"}
        </p>
      </div>

      <div className="space-y-4 rounded-[1.75rem] bg-[var(--bg-elevated)] p-4">
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Push A…"
            className="w-full rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]"
          />
        </label>

        <div>
          <p className="mb-2 text-sm text-[var(--muted)]">Wochentage</p>
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((d) => {
              const on = days.includes(d.value);
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleDay(d.value)}
                  aria-pressed={on}
                  className={`rounded-[1.25rem] py-2 text-center text-sm font-medium transition ${
                    on
                      ? "arc-chrome"
                      : "border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm text-[var(--muted)]">Rhythmus</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              [
                ["every", "Jede Woche"],
                ["A", "A-Woche"],
                ["B", "B-Woche"],
                ["interval", "Intervall"],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setWeekMode(mode)}
                aria-pressed={weekMode === mode}
                className={`rounded-[1.25rem] px-2 py-2 text-center text-sm transition ${
                  weekMode === mode
                    ? "arc-chrome font-semibold"
                    : "border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {weekMode === "interval" && (
            <label className="mt-3 block text-sm">
              <span className="mb-1 block text-[var(--muted)]">Alle N Wochen</span>
              <input
                type="number"
                min={2}
                max={12}
                value={intervalWeeks}
                onChange={(e) => setIntervalWeeks(Math.max(2, Number(e.target.value) || 2))}
                className="w-full rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]"
              />
            </label>
          )}
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Notiz</span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
            className="w-full rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]"
          />
        </label>
      </div>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      <div className="space-y-4">
        {exercises.map((item) => (
          <article key={item.name} className="rounded-[1.75rem] bg-[var(--bg-elevated)] p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-medium text-[var(--text)]">{item.name}</h2>
                <p className="text-xs text-[var(--muted)]">{GROUP_LABELS[item.muscleGroup]}</p>
              </div>
              <button
                type="button"
                onClick={() => removeExercise(item.name)}
                className="shrink-0 text-sm text-[var(--muted)] hover:text-[var(--danger)]"
              >
                Entfernen
              </button>
            </div>

            <ul className="space-y-2">
              {item.sets.map((s, i) => (
                <li
                  key={i}
                  className="grid grid-cols-[1.5rem_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)_1.5rem] items-center gap-1.5"
                >
                  <span className="text-center text-xs tabular-nums text-[var(--muted)]">
                    #{i + 1}
                  </span>
                  <div className="flex min-w-0 overflow-hidden rounded-[1.25rem] border border-[var(--line)] bg-[var(--bg)]">
                    <button
                      type="button"
                      onClick={() => toggleFailure(item.name, i)}
                      aria-label={s.failure ? "Auf Reps wechseln" : "Auf Failure wechseln"}
                      aria-pressed={s.failure}
                      className={`shrink-0 px-1.5 text-[10px] font-semibold tracking-wide transition ${
                        s.failure
                          ? "bg-[var(--accent)]/20 text-[var(--accent)]"
                          : "text-[var(--muted)] hover:text-[var(--text)]"
                      }`}
                    >
                      {s.failure ? "F" : "R"}
                    </button>
                    {s.failure ? (
                      <button
                        type="button"
                        onClick={() => toggleFailure(item.name, i)}
                        className="min-w-0 flex-1 px-1 py-1.5 text-center text-sm font-medium text-[var(--accent)]"
                      >
                        Fail
                      </button>
                    ) : (
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="Reps"
                        value={s.reps}
                        onChange={(e) => updateSet(item.name, i, { reps: e.target.value })}
                        className="min-w-0 w-full flex-1 border-0 bg-transparent px-1 py-1.5 text-center text-sm outline-none"
                      />
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    inputMode="decimal"
                    placeholder="kg"
                    value={s.weight}
                    onChange={(e) => updateSet(item.name, i, { weight: e.target.value })}
                    className="min-w-0 w-full rounded-[1.25rem] border border-[var(--line)] bg-[var(--bg)] px-1.5 py-1.5 text-center text-sm outline-none focus:border-[var(--accent)]"
                  />
                  {s.failure ? (
                    <span className="rounded-[1.25rem] border border-[var(--line)]/50 px-1.5 py-1.5 text-center text-xs text-[var(--muted)]">
                      RIR 0
                    </span>
                  ) : (
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="RIR"
                      value={s.rir}
                      onChange={(e) => updateSet(item.name, i, { rir: e.target.value })}
                      className="min-w-0 w-full rounded-[1.25rem] border border-[var(--line)] bg-[var(--bg)] px-1.5 py-1.5 text-center text-sm outline-none focus:border-[var(--accent)]"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeSetRow(item.name, i)}
                    aria-label={`Set ${i + 1} entfernen`}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--muted)] hover:text-[var(--danger)]"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => addSetRow(item.name)}
              className="mt-3 text-sm text-[var(--accent)] hover:text-white"
            >
              + Set
            </button>
          </article>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-3 pb-4">
        <button
          type="submit"
          disabled={busy || days.length === 0 || exercises.length === 0}
          className="rounded-[1.75rem] border border-[var(--accent)]/35 bg-emerald-500/15 px-5 py-2.5 font-semibold text-[var(--accent)] transition hover:bg-emerald-500/25 hover:text-white disabled:opacity-60"
        >
          {busy ? "Speichern…" : "Speichern"}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="rounded-[1.75rem] border border-[var(--accent)]/35 bg-red-500/12 px-4 py-2.5 text-sm text-[var(--accent)] transition hover:bg-red-500/20 hover:text-white disabled:opacity-60"
        >
          Löschen
        </button>
      </div>
    </form>
  );
}
