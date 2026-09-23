"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { GROUP_LABELS, TRAINING_GROUPS } from "@/lib/muscles";

type SetRow = { id: string; reps: number | null; weight: number | null; rir: number | null };
type Exercise = {
  id: string;
  name: string;
  muscle_group: string | null;
  sets: SetRow[];
};
type WorkoutDetail = {
  id: string;
  date: string;
  name: string | null;
  notes: string | null;
  exercises: Exercise[];
};

function formatWorkoutDate(raw: string) {
  return raw.slice(0, 10);
}

export default function WorkoutDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exName, setExName] = useState("");
  const [muscle, setMuscle] = useState<string>("Chest");
  const [setDraft, setSetDraft] = useState<Record<string, { reps: string; weight: string; rir: string }>>({});
  const [titleDraft, setTitleDraft] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/workouts/${id}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed");
        setWorkout(json);
        setTitleDraft(json.name ?? "");
      })
      .catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveTitle() {
    if (!workout || savingTitle) return;
    const next = titleDraft.trim();
    const current = (workout.name ?? "").trim();
    if (next === current) return;
    setSavingTitle(true);
    setError(null);
    try {
      const res = await fetch(`/api/workouts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: next || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setWorkout((prev) => (prev ? { ...prev, name: json.name ?? null } : prev));
      setTitleDraft(json.name ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setTitleDraft(workout.name ?? "");
    } finally {
      setSavingTitle(false);
    }
  }

  async function addExercise(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/exercises", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workout_id: id, name: exName, muscle_group: muscle || null }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Failed");
      return;
    }
    setExName("");
    setMuscle("Chest");
    load();
  }

  async function addSet(exerciseId: string) {
    const draft = setDraft[exerciseId] || { reps: "", weight: "", rir: "" };
    const res = await fetch("/api/sets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exercise_id: exerciseId,
        reps: draft.reps ? Number(draft.reps) : null,
        weight: draft.weight ? Number(draft.weight) : null,
        rir: draft.rir ? Number(draft.rir) : null,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Failed");
      return;
    }
    setSetDraft((prev) => ({ ...prev, [exerciseId]: { reps: "", weight: "", rir: "" } }));
    load();
  }

  async function removeSet(setId: string) {
    setError(null);
    const res = await fetch(`/api/sets/${setId}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || "Failed");
      return;
    }
    load();
  }

  async function removeWorkout() {
    if (!confirm("Workout löschen?")) return;
    await fetch(`/api/workouts/${id}`, { method: "DELETE" });
    router.push("/workouts");
  }

  if (!workout && !error) {
    return <p className="text-[var(--muted)]">Laden…</p>;
  }

  if (!workout) {
    return <p className="text-[var(--danger)]">{error}</p>;
  }

  return (
    <div className="animate-rise space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/workouts" className="text-sm text-[var(--muted)] hover:text-[var(--accent)]">
            ← Workouts
          </Link>
          <input
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={() => void saveTitle()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
            placeholder="Workout-Name"
            aria-label="Workout-Name"
            disabled={savingTitle}
            className="mt-2 block w-full border-0 bg-transparent p-0 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:ring-0"
          />
          <p className="mt-1 text-sm tabular-nums text-[var(--muted)]">
            {formatWorkoutDate(workout.date)}
            {workout.notes ? ` · ${workout.notes}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={removeWorkout}
          className="rounded-[1.75rem] border border-[var(--danger)]/40 px-3 py-1.5 text-sm text-[var(--danger)] hover:bg-[var(--danger)]/10"
        >
          Löschen
        </button>
      </div>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      <form
        onSubmit={addExercise}
        className="grid gap-3 rounded-[1.75rem] bg-[var(--bg-elevated)] p-4 sm:grid-cols-[2fr_1fr_auto]"
      >
        <input
          value={exName}
          onChange={(e) => setExName(e.target.value)}
          placeholder="Übung (z.B. Bankdrücken)"
          required
          className="rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]"
        />
        <select
          value={muscle}
          onChange={(e) => setMuscle(e.target.value)}
          className="rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]"
        >
          {TRAINING_GROUPS.map((g) => (
            <option key={g} value={g}>
              {GROUP_LABELS[g]}
            </option>
          ))}
        </select>
        <button type="submit" className="arc-chrome rounded-[1.75rem] px-4 py-2 font-semibold">
          + Übung
        </button>
      </form>

      <div className="space-y-4">
        {workout.exercises.length === 0 && (
          <p className="text-[var(--muted)]">Noch keine Übungen in diesem Workout.</p>
        )}
        {workout.exercises.map((ex) => {
          const draft = setDraft[ex.id] || { reps: "", weight: "", rir: "" };
          return (
            <article
              key={ex.id}
              className="rounded-[1.75rem] bg-[var(--bg-elevated)] p-4"
            >
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">{ex.name}</h2>
                {ex.muscle_group && (
                  <span className="text-xs tracking-wide text-[var(--muted)] uppercase">
                    {ex.muscle_group}
                  </span>
                )}
              </div>
              <ul className="mb-3 space-y-1 text-sm">
                {ex.sets.map((s, i) => (
                  <li
                    key={s.id}
                    className="flex items-center gap-4 tabular-nums text-[var(--muted)]"
                  >
                    <span className="w-8 text-[var(--text)]">#{i + 1}</span>
                    <span>
                      {s.rir === 0
                        ? s.reps != null
                          ? `${s.reps} → Fail`
                          : "Fail"
                        : `${s.reps ?? "—"} reps`}
                    </span>
                    <span>{s.weight ?? "—"} kg</span>
                    <span>{s.rir === 0 ? "RIR 0" : `RIR ${s.rir ?? "—"}`}</span>
                    <button
                      type="button"
                      onClick={() => removeSet(s.id)}
                      aria-label={`Set ${i + 1} entfernen`}
                      className="ml-auto shrink-0 rounded-full px-2 py-0.5 text-[var(--muted)] transition hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <input
                  type="number"
                  placeholder="Reps"
                  value={draft.reps}
                  onChange={(e) =>
                    setSetDraft((p) => ({ ...p, [ex.id]: { ...draft, reps: e.target.value } }))
                  }
                  className="rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)] px-2 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
                />
                <input
                  type="number"
                  step="0.5"
                  placeholder="kg"
                  value={draft.weight}
                  onChange={(e) =>
                    setSetDraft((p) => ({ ...p, [ex.id]: { ...draft, weight: e.target.value } }))
                  }
                  className="rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)] px-2 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
                />
                <input
                  type="number"
                  placeholder="RIR"
                  value={draft.rir}
                  onChange={(e) =>
                    setSetDraft((p) => ({ ...p, [ex.id]: { ...draft, rir: e.target.value } }))
                  }
                  className="rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)] px-2 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="button"
                  onClick={() => addSet(ex.id)}
                  className="rounded-[1.75rem] border border-[var(--accent)]/40 px-2 py-1.5 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10"
                >
                  + Set
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
