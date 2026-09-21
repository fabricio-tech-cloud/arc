"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BodyMap } from "@/components/BodyMap";
import {
  GROUP_VIEW,
  TRAINING_FOCUSES,
  bodyStateForGroupOnly,
  muscleIdsForGroup,
  type MuscleGroupKey,
  type TrainingFocus,
} from "@/lib/muscles";

type CatalogExercise = {
  name: string;
  focus: TrainingFocus;
  fromCatalog: boolean;
  times: number;
  lastDate: string | null;
  lastWorkoutId: string | null;
};

type GroupPayload = {
  key: MuscleGroupKey;
  label: string;
  slug: string;
  exercises: CatalogExercise[];
};

export default function MuscleGroupExercises({ groupKey }: { groupKey: MuscleGroupKey }) {
  const [data, setData] = useState<GroupPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetch(`/api/exercises?group=${encodeURIComponent(groupKey)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed");
        if (!cancelled) setData(json as GroupPayload);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed");
      });
    return () => {
      cancelled = true;
    };
  }, [groupKey]);

  const miniState = useMemo(
    () => bodyStateForGroupOnly(groupKey, 7, true),
    [groupKey],
  );

  const label = data?.label;
  const exercises = data?.exercises ?? [];

  const byFocus = useMemo(() => {
    const map: Record<TrainingFocus, CatalogExercise[]> = {
      Hypertrophy: [],
      Strength: [],
      Explosiveness: [],
    };
    for (const ex of exercises) {
      map[ex.focus].push(ex);
    }
    return map;
  }, [exercises]);

  return (
    <div className="animate-rise space-y-8">
      <div>
        <Link href="/workouts" className="text-sm text-[var(--muted)] hover:text-[var(--accent)]">
          ← Workouts
        </Link>
        <div className="mt-4 flex items-center gap-4">
          <div className="w-[7.5rem] shrink-0 rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)]/60 p-2">
            <BodyMap
              bodyState={miniState}
              view={GROUP_VIEW[groupKey]}
              size="sm"
              showToggle={false}
              interactive={false}
              focusIds={muscleIdsForGroup(groupKey)}
            />
          </div>
          <div>
            <h1
              className="text-3xl font-normal text-[var(--text)]"
              style={{ fontFamily: '"Times New Roman", Times, serif' }}
            >
              {label ?? "…"}
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {data
                ? `${exercises.length} ${exercises.length === 1 ? "exercise" : "exercises"}`
                : "Loading…"}
            </p>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      {!data && !error && (
        <p className="rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)]/60 px-4 py-6 text-[var(--muted)]">
          Loading exercises…
        </p>
      )}

      {data && exercises.length === 0 && (
        <p className="rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)]/60 px-4 py-6 text-[var(--muted)]">
          No exercises for this group.
        </p>
      )}

      {TRAINING_FOCUSES.map((focus) => {
        const items = byFocus[focus];
        if (!data || items.length === 0) return null;
        return (
          <section key={focus} className="space-y-3">
            <h2
              className="text-lg font-normal tracking-wide text-[var(--text)]"
              style={{ fontFamily: '"Times New Roman", Times, serif' }}
            >
              {focus}
            </h2>
            <ul className="divide-y divide-[var(--line)] rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)]/60">
              {items.map((ex) => (
                <li key={ex.name} className="flex items-center justify-between gap-3 px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="font-medium">{ex.name}</p>
                    <p className="text-xs tabular-nums text-[var(--muted)]">
                      {ex.times > 0
                        ? `${ex.times}× logged${ex.lastDate ? ` · last ${ex.lastDate}` : ""}`
                        : "Not logged yet"}
                    </p>
                  </div>
                  {ex.lastWorkoutId ? (
                    <Link
                      href={`/workouts/${ex.lastWorkoutId}`}
                      className="shrink-0 text-xs text-[var(--muted)] hover:text-[var(--accent)]"
                    >
                      Session →
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
