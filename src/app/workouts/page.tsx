"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { BodyState, MuscleId } from "body-muscles";
import { BodyMap } from "@/components/BodyMap";
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
  every: "jede Woche",
  A: "Woche A",
  B: "Woche B",
  interval: "Intervall",
};

const DAY_LABELS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

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
    return `alle ${plan.interval_weeks} Wochen`;
  }
  return WEEK_MODE_LABEL[plan.week_mode] ?? plan.week_mode;
}

export default function WorkoutsPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<SessionPlanRow[]>([]);
  const [week, setWeek] = useState<WeekPayload | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
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

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, name: name.trim() || null, notes: notes || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setName("");
      setNotes("");
      router.push(`/workouts/${json.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

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
    <div className="animate-rise space-y-8">
      <section className="p-0 sm:p-0">
        <BodyMap bodyState={mapState} size="lg" showHint onMuscleClick={onMuscleClick} />
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
          <span>Intensität Mo–So · ausgeführte Sets (+ Volumen)</span>
          <span className="h-2 w-16 rounded-full bg-gradient-to-r from-[#f5f3ff] via-[#a78bfa] to-[#4c2a82]" />
        </div>

        {selectedPayload && (
          <div className="mt-4 space-y-3 rounded-[1.75rem] bg-[var(--bg-elevated)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p
                  className="text-lg font-normal text-[var(--text)]"
                  style={{ fontFamily: '"Times New Roman", Times, serif' }}
                >
                  {selectedPayload.label}
                </p>
                <p className="mt-0.5 text-sm tabular-nums text-[var(--muted)]">
                  Intensität {selectedPayload.intensity}/10
                  {" · "}
                  {selectedPayload.setCount} Sets
                  {selectedPayload.volume > 0
                    ? ` · ${selectedPayload.volume.toLocaleString("de-DE")} kg`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGroup(null)}
                className="text-sm text-[var(--muted)] hover:text-[var(--text)]"
              >
                Schließen
              </button>
            </div>

            {exercisesByDay.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                Diese Woche noch keine ausgeführten Einheiten für {selectedPayload.label}.
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
                          className="flex items-center justify-between gap-3 rounded-[1.25rem] bg-[var(--bg)] px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm text-[var(--text)]">{ex.name}</p>
                            {ex.workout_name ? (
                              <p className="truncate text-xs text-[var(--muted)]">{ex.workout_name}</p>
                            ) : null}
                          </div>
                          <span className="shrink-0 text-xs tabular-nums text-[var(--accent)]">
                            {ex.set_count} Sets
                            {ex.volume > 0 ? ` · ${ex.volume.toLocaleString("de-DE")} kg` : ""}
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
              Übungen planen →
            </Link>
          </div>
        )}
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
          className="grid gap-3 rounded-[1.75rem] bg-[var(--bg-elevated)] p-4 sm:grid-cols-[1fr_1.4fr_1.4fr_auto]"
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
            <span className="mb-1 block text-[var(--muted)]">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Push A…"
              className="w-full rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Notiz</span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Gute Energie…"
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

        <ul className="overflow-hidden rounded-[1.75rem] bg-[var(--bg-elevated)]">
          {plans.length === 0 && (
            <li className="px-4 py-6 text-[var(--muted)]">
              Noch keine Sessions — über Muskelgruppen Übungen sammeln und speichern.
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
                  actionLabel={confirming ? (deleting ? "…" : "Entfernen") : "Löschen"}
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
                    <p className="text-sm text-white/70">Session wirklich entfernen?</p>
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
                        {plan.exercises.length} Übungen
                      </span>
                    </div>
                  )}
                </SwipeDeleteRow>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
