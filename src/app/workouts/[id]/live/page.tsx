"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { SwipeBack } from "@/components/SwipeBack";

type SetRow = {
  id: string;
  reps: number | null;
  weight: number | null;
  rir: number | null;
  done: boolean;
};

type Exercise = {
  id: string;
  name: string;
  muscle_group: string | null;
  sets: SetRow[];
};

type WorkoutLive = {
  id: string;
  date: string;
  name: string | null;
  completed: boolean;
  exercises: Exercise[];
};

function setVolume(s: Pick<SetRow, "reps" | "weight" | "rir">) {
  const weight = s.weight == null || !Number.isFinite(s.weight) ? 0 : s.weight;
  if (weight <= 0) return 0;
  // Failure-Sets ohne Reps: Gewicht einmal zählen
  if (s.rir === 0 && (s.reps == null || !Number.isFinite(s.reps))) {
    return weight;
  }
  const reps = s.reps == null || !Number.isFinite(s.reps) ? 0 : s.reps;
  return reps * weight;
}

export default function LiveSessionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [workout, setWorkout] = useState<WorkoutLive | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const workoutRef = useRef(workout);
  workoutRef.current = workout;

  const load = useCallback(() => {
    fetch(`/api/workouts/${id}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed");
        const exercises = (json.exercises ?? []).map((ex: Exercise) => ({
          ...ex,
          sets: (ex.sets ?? []).map((s: SetRow) => ({
            ...s,
            done: Boolean(s.done),
          })),
        }));
        setWorkout({ ...json, exercises });
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed"));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const progress = useMemo(() => {
    if (!workout) return { done: 0, total: 0, volume: 0 };
    let done = 0;
    let total = 0;
    let volume = 0;
    for (const ex of workout.exercises) {
      for (const s of ex.sets) {
        total += 1;
        if (s.done) done += 1;
        volume += setVolume(s);
      }
    }
    return { done, total, volume };
  }, [workout]);

  function patchLocal(setId: string, patch: Partial<SetRow>) {
    setWorkout((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((ex) => ({
          ...ex,
          sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
        })),
      };
    });
  }

  async function saveSet(
    setId: string,
    patch: { done?: boolean; reps?: number | null; weight?: number | null; rir?: number | null },
  ) {
    const res = await fetch(`/api/sets/${setId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error || "Set konnte nicht aktualisiert werden");
      load();
      return false;
    }
    return true;
  }

  async function toggleSet(setId: string, done: boolean) {
    patchLocal(setId, { done });
    await saveSet(setId, { done });
  }

  function onRepsChange(setId: string, raw: string) {
    const reps = raw === "" ? null : Number(raw);
    patchLocal(setId, { reps: reps != null && Number.isFinite(reps) ? reps : null });
  }

  function onWeightChange(setId: string, raw: string) {
    const weight = raw === "" ? null : Number(raw);
    patchLocal(setId, { weight: weight != null && Number.isFinite(weight) ? weight : null });
  }

  async function persistFields(setId: string) {
    const current = workoutRef.current;
    if (!current) return;
    const row = current.exercises.flatMap((ex) => ex.sets).find((s) => s.id === setId);
    if (!row) return;
    await saveSet(row.id, { reps: row.reps, weight: row.weight, rir: row.rir });
  }

  async function finishSession() {
    if (!workout || finishing) return;
    setFinishing(true);
    setError(null);
    try {
      // Letzte Werte vor dem Abschluss speichern
      await Promise.all(
        workout.exercises.flatMap((ex) =>
          ex.sets.map((s) => saveSet(s.id, { reps: s.reps, weight: s.weight, rir: s.rir, done: s.done })),
        ),
      );
      const res = await fetch(`/api/workouts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setFinishing(false);
    }
  }

  if (!workout && !error) {
    return <p className="text-[var(--muted)]">Laden…</p>;
  }

  if (!workout) {
    return <p className="text-[var(--danger)]">{error}</p>;
  }

  const title = workout.name?.trim() || "Session";
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="animate-rise space-y-8">
      <SwipeBack href="/" />
      <div className="text-center">
        <h1
          className="text-3xl font-normal text-[var(--text)]"
          style={{ fontFamily: '"Times New Roman", Times, serif' }}
        >
          {title}
        </h1>
        <p className="mt-1 text-sm tabular-nums text-[var(--muted)]">
          {progress.done}/{progress.total} Sets · {pct}%
          {progress.volume > 0
            ? ` · ${progress.volume.toLocaleString("de-DE")} kg Volumen`
            : ""}
        </p>
      </div>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      {workout.completed ? (
        <div className="rounded-[1.75rem] bg-[var(--bg-elevated)] px-4 py-6 text-center">
          <p className="text-[var(--text)]">Session bereits abgeschlossen.</p>
          <p className="mt-1 text-sm tabular-nums text-[var(--muted)]">
            {progress.volume.toLocaleString("de-DE")} kg Volumen
          </p>
          <Link href="/" className="mt-3 inline-block text-sm text-[var(--accent)]">
            Zur Overview →
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {workout.exercises.map((ex, exIdx) => {
              const exDone = ex.sets.length > 0 && ex.sets.every((s) => s.done);
              return (
                <article
                  key={ex.id}
                  className={`rounded-[1.75rem] bg-[var(--bg-elevated)] p-4 ${
                    exDone ? "opacity-60" : ""
                  }`}
                >
                  <div className="mb-3 flex items-baseline justify-between gap-2">
                    <h2 className="font-medium text-[var(--text)]">
                      <span className="mr-2 text-[var(--muted)]">{exIdx + 1}.</span>
                      {ex.name}
                    </h2>
                    {ex.muscle_group ? (
                      <span className="text-xs text-[var(--muted)]">{ex.muscle_group}</span>
                    ) : null}
                  </div>
                  <ul className="space-y-2">
                    {ex.sets.map((s, i) => (
                      <li
                        key={s.id}
                        className={`flex items-center gap-2 rounded-[1.25rem] border px-2.5 py-2 ${
                          s.done
                            ? "border-emerald-400/25 bg-emerald-500/10"
                            : "border-[var(--line)] bg-[var(--bg)]"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => void toggleSet(s.id, !s.done)}
                          aria-label={s.done ? `Set ${i + 1} zurücksetzen` : `Set ${i + 1} erledigt`}
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs ${
                            s.done
                              ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-200"
                              : "border-white/20 text-transparent"
                          }`}
                        >
                          ✓
                        </button>
                        <span className="w-6 shrink-0 text-xs tabular-nums text-[var(--muted)]">
                          #{i + 1}
                        </span>
                        {s.rir === 0 ? (
                          <span className="min-w-0 flex-1 rounded-[1rem] border border-[var(--line)]/50 px-2 py-1.5 text-center text-sm text-[var(--accent)]">
                            Fail
                          </span>
                        ) : (
                          <input
                            type="number"
                            inputMode="numeric"
                            placeholder="Reps"
                            value={s.reps ?? ""}
                            onChange={(e) => onRepsChange(s.id, e.target.value)}
                            onBlur={() => void persistFields(s.id)}
                            className="min-w-0 flex-1 rounded-[1rem] border border-[var(--line)] bg-transparent px-2 py-1.5 text-center text-sm outline-none focus:border-[var(--accent)]"
                          />
                        )}
                        <input
                          type="number"
                          step="0.5"
                          inputMode="decimal"
                          placeholder="kg"
                          value={s.weight ?? ""}
                          onChange={(e) => onWeightChange(s.id, e.target.value)}
                          onBlur={() => void persistFields(s.id)}
                          className="min-w-0 flex-1 rounded-[1rem] border border-[var(--line)] bg-transparent px-2 py-1.5 text-center text-sm outline-none focus:border-[var(--accent)]"
                        />
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>

          <div className="flex justify-center pb-4">
            <button
              type="button"
              onClick={() => void finishSession()}
              disabled={finishing}
              className="rounded-[1.75rem] border border-[var(--accent)]/35 bg-emerald-500/15 px-6 py-2.5 font-semibold text-[var(--accent)] transition hover:bg-emerald-500/25 hover:text-white disabled:opacity-60"
            >
              {finishing ? "Speichern…" : "Session beenden"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
