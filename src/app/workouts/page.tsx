"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { BodyState, MuscleId } from "body-muscles";
import { BodyMap } from "@/components/BodyMap";
import { SessionSlotPlanner } from "@/components/SessionSlotPlanner";
import { SwipeDeleteRow } from "@/components/SwipeDeleteRow";
import {
  GROUP_LABELS,
  GROUP_VIEW,
  TRAINING_GROUPS,
  bodyStateForGroupOnly,
  bodyStateFromGroupCounts,
  groupPath,
  resolveGroupFromMuscleId,
  type MuscleGroupKey,
} from "@/lib/muscles";
import {
  parsePlanExercises,
  type SessionPlanRow,
  type WeekMode,
} from "@/lib/session-schedule";
import { formatDays } from "@/lib/supplements";

type LoggedExercise = {
  id: string;
  name: string;
  muscle_group: string | null;
  date: string;
  set_count: number;
  volume: number;
  workout_id: string;
  workout_name: string | null;
};

type GroupPayload = {
  key: MuscleGroupKey;
  label: string;
  setCount: number;
  volume: number;
  intensity: number;
  exercises: LoggedExercise[];
  suggestions: string[];
};

type WeekPayload = {
  weekStart: string;
  weekEnd: string;
  bodyState: BodyState;
  groups: GroupPayload[];
  totalSets: number;
};

const WEEK_MODE_LABEL: Record<WeekMode, string> = {
  every: "every week",
  A: "week A",
  B: "week B",
  interval: "interval",
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function weekdayLabel(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return DAY_LABELS[d.getDay()] ?? dateStr;
}

function formatShortDate(dateStr: string) {
  const [, m, day] = dateStr.split("-");
  return `${day}.${m}.`;
}

function weekModeLabel(plan: SessionPlanRow) {
  if (plan.week_mode === "interval" && plan.interval_weeks) {
    return `every ${plan.interval_weeks} weeks`;
  }
  return WEEK_MODE_LABEL[plan.week_mode] ?? plan.week_mode;
}

export default function WorkoutsPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<SessionPlanRow[]>([]);
  const [week, setWeek] = useState<WeekPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [swipeOpenId, setSwipeOpenId] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<MuscleGroupKey | null>(null);

  const load = useCallback(() => {
    Promise.all([
      fetch("/api/session-plans").then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed");
        return (json as SessionPlanRow[]).map((row) => ({
          ...row,
          exercises: parsePlanExercises(row.exercises),
        }));
      }),
      fetch("/api/muscles/week").then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed");
        return json as WeekPayload;
      }),
    ])
      .then(([p, m]) => {
        setPlans(p);
        setWeek(m);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const intensityCounts = useMemo(() => {
    const c: Partial<Record<MuscleGroupKey, number>> = {};
    week?.groups.forEach((g) => {
      c[g.key] = g.intensity;
    });
    return c;
  }, [week]);

  const mapState = useMemo(
    () => bodyStateFromGroupCounts(intensityCounts, selectedGroup),
    [intensityCounts, selectedGroup],
  );

  const groupCards = week?.groups ??
    TRAINING_GROUPS.map((key) => ({
      key,
      label: GROUP_LABELS[key],
      setCount: 0,
      volume: 0,
      intensity: 0,
      exercises: [] as LoggedExercise[],
      suggestions: [] as string[],
    }));

  const selectedPayload = selectedGroup
    ? groupCards.find((g) => g.key === selectedGroup) ?? null
    : null;

  const exercisesByDay = useMemo(() => {
    if (!selectedPayload) return [] as { date: string; items: LoggedExercise[] }[];
    const map = new Map<string, LoggedExercise[]>();
    for (const ex of selectedPayload.exercises) {
      const list = map.get(ex.date) ?? [];
      list.push(ex);
      map.set(ex.date, list);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([d, items]) => ({ date: d, items }));
  }, [selectedPayload]);

  async function removePlan(id: string) {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/session-plans/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed");
      setConfirmId(null);
      setSwipeOpenId(null);
      setPlans((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setDeleting(false);
    }
  }

  function onMuscleClick(id: MuscleId) {
    const group = resolveGroupFromMuscleId(id);
    if (!group) return;
    setSelectedGroup((prev) => (prev === group ? null : group));
  }

  return (
    <div className="animate-rise mx-auto max-w-5xl space-y-8">
      {/* Body map alone under logo — no card, only the figure */}
      <section className="mx-auto w-full max-w-md lg:mt-4">
        <BodyMap bodyState={mapState} size="lg" showHint onMuscleClick={onMuscleClick} />
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs text-[var(--muted)] lg:hidden">
          <span>Intensity Mon-Sun · completed sets (+ volume)</span>
          <span className="h-2 w-16 rounded-full bg-gradient-to-r from-[#f5f3ff] via-[#a78bfa] to-[#4c2a82]" />
        </div>
        <div className="mt-3 hidden flex-wrap items-center justify-center gap-3 text-xs text-white/80 lg:flex">
          <span>Intensity Mon–Sun · white → dark lilac</span>
          <span className="h-2 w-16 rounded-full bg-gradient-to-r from-white via-[#a78bfa] to-[#2e184d]" />
        </div>

        {selectedPayload && (
          <div className="mt-4 space-y-3 rounded-[1.35rem] border border-white/[0.06] bg-black/50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p
                  className="text-lg font-normal text-[var(--text)]"
                  style={{ fontFamily: '"Times New Roman", Times, serif' }}
                >
                  {selectedPayload.label}
                </p>
                <p className="mt-0.5 text-sm tabular-nums text-[var(--muted)]">
                  Intensity {selectedPayload.intensity}/10
                  {" · "}
                  {selectedPayload.setCount} Sets
                  {selectedPayload.volume > 0
                    ? ` · ${selectedPayload.volume.toLocaleString("en-US")} kg`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGroup(null)}
                className="text-sm text-[var(--muted)] hover:text-[var(--text)]"
              >
                Close
              </button>
            </div>

            {exercisesByDay.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                No completed sessions for {selectedPayload.label} this week yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {exercisesByDay.map(({ date: day, items }) => (
                  <li key={day}>
                    <p className="mb-1.5 text-xs font-medium tracking-wide text-[var(--muted)] uppercase">
                      {weekdayLabel(day)} · {formatShortDate(day)}
                    </p>
                    <ul className="space-y-1.5">
                      {items.map((ex) => (
                        <li
                          key={ex.id}
                          className="flex items-center justify-between gap-3 rounded-[1.25rem] bg-black/40 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm text-[var(--text)]">{ex.name}</p>
                            {ex.workout_name ? (
                              <p className="truncate text-xs text-[var(--muted)]">{ex.workout_name}</p>
                            ) : null}
                          </div>
                          <span className="shrink-0 text-xs tabular-nums text-[var(--accent)]">
                            {ex.set_count} Sets
                            {ex.volume > 0 ? ` · ${ex.volume.toLocaleString("en-US")} kg` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}

            <Link
              href={groupPath(selectedPayload.key)}
              className="inline-block text-sm text-[var(--accent)] hover:text-white"
            >
              {"Plan exercises ->"}
            </Link>
          </div>
        )}
      </section>

      <section>
        <h2
          className="mb-3 text-center text-xl font-normal"
          style={{ fontFamily: '"Times New Roman", Times, serif' }}
        >
          Muscle groups
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          {groupCards.map((g) => {
            const miniState = bodyStateForGroupOnly(g.key, g.intensity > 0 ? g.intensity : 2);
            return (
              <div
                key={g.key}
                className="relative rounded-[1.75rem] bg-[var(--bg-elevated)] p-3 text-center transition hover:bg-[var(--bg-soft)] lg:border lg:border-white/10 lg:bg-black/50 lg:hover:bg-black/60"
              >
                <Link
                  href={groupPath(g.key)}
                  className="absolute inset-0 z-10 rounded-[1.75rem]"
                  aria-label={`${g.label} exercises`}
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
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

        <ul className="overflow-hidden rounded-[1.75rem] bg-[var(--bg-elevated)] lg:border lg:border-white/10 lg:bg-black/50">
          {plans.length === 0 && (
            <li className="px-4 py-6 text-[var(--muted)]">
              No sessions yet - collect exercises from muscle groups and save.
            </li>
          )}
          {plans.map((plan) => {
            const confirming = confirmId === plan.id;
            const title = plan.name?.trim() || formatDays(plan.days) || "Session";
            return (
              <li key={plan.id} className="border-b border-white/8 last:border-b-0">
                <SwipeDeleteRow
                  open={swipeOpenId === plan.id || confirming}
                  onOpenChange={(open) => {
                    if (!open) {
                      setSwipeOpenId(null);
                      setConfirmId(null);
                      return;
                    }
                    setSwipeOpenId(plan.id);
                  }}
                  actionLabel={confirming ? (deleting ? "..." : "Remove") : "Delete"}
                  onDelete={() => {
                    if (confirming) {
                      if (!deleting) removePlan(plan.id);
                      return;
                    }
                    setConfirmId(plan.id);
                    setSwipeOpenId(plan.id);
                  }}
                  onTap={
                    confirming
                      ? undefined
                      : () => router.push(`/workouts/session/${plan.id}`)
                  }
                >
                  {confirming ? (
                    <p className="text-sm text-white/70">Remove this session?</p>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold">{title}</p>
                        <p className="truncate text-sm tabular-nums text-[var(--muted)]">
                          {formatDays(plan.days)}
                          {" · "}
                          {weekModeLabel(plan)}
                          {plan.notes ? ` · ${plan.notes}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-[var(--bg-soft)] px-2.5 py-1 text-xs text-[var(--accent)]">
                        {plan.exercises.length} exercises
                      </span>
                    </div>
                  )}
                </SwipeDeleteRow>
              </li>
            );
          })}
        </ul>

        <SessionSlotPlanner onSaved={load} />
      </section>
    </div>
  );
}
