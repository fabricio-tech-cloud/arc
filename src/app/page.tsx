"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  OverviewCardMenu,
  OverviewHeatmap,
  ProgressRing,
  ThisWeekStrip,
  TodayCard,
  type CalendarDayInfo,
  type TodayPlan,
  type WeekDay,
} from "@/components/OverviewWidgets";
import { supplementImageSrc } from "@/lib/supplements";

type RecentWorkout = {
  id: string;
  date: string;
  notes: string | null;
  title: string;
  weekday: string;
  exercise_count: number;
  index: number;
};

type ActiveSession = {
  id: string;
  date: string;
  name: string | null;
  title: string;
  exerciseCount: number;
  doneSets: number;
  totalSets: number;
};

type Overview = {
  stats: {
    workouts: number;
    exercises: number;
    sets: number;
    journal_entries: number;
    supplements: number;
  };
  recent: RecentWorkout[];
  heatMap: Record<string, number>;
  calendarDays?: Record<string, CalendarDayInfo>;
  volume7d: number;
  latestJournal: {
    date: string;
    mood: number | null;
    sleep_hours: number | null;
    energy: number | null;
  } | null;
  thisWeek: WeekDay[];
  today: WeekDay | null;
  todayPlan: TodayPlan | null;
  activeSession?: ActiveSession | null;
};

function formatVolume(n: number) {
  return n.toLocaleString("en-US");
}

function relativeJournal(date: string | undefined) {
  if (!date) return "No data yet";
  const then = new Date(date + "T12:00:00").getTime();
  const days = Math.round((Date.now() - then) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

/** App entry at `/` — Overview is the start page. */
export default function OverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/overview")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed");
        setData(json);
      })
      .catch((err) => setError(err.message));
  }, []);

  const primary = data?.recent[0] ?? null;
  const secondary = data?.recent[1] ?? null;
  const active = data?.activeSession ?? null;
  const todayWorkout = data?.todayPlan?.workout ?? null;
  const weekSessions = Object.entries(data?.heatMap ?? {}).filter(([date]) => {
    const d = new Date(date + "T12:00:00");
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    start.setHours(0, 0, 0, 0);
    return d >= start;
  }).length;

  const activePct =
    active && active.totalSets > 0
      ? Math.round((active.doneSets / active.totalSets) * 100)
      : 0;

  /** Day progress: one entered session done → full ring (not 1/4 of a weekly default). */
  const dayRing =
    todayWorkout && todayWorkout.status !== "rest"
      ? {
          value: todayWorkout.status === "logged" ? 1 : 0,
          max: 1,
        }
      : {
          value: primary?.index ?? (weekSessions || 0),
          max: Math.max(1, weekSessions || primary?.index || 1),
        };

  const workoutRing = active
    ? { value: active.doneSets, max: Math.max(1, active.totalSets) }
    : dayRing;

  return (
    <div className="animate-rise mx-auto max-w-lg space-y-3 lg:mx-auto lg:grid lg:max-w-5xl lg:grid-cols-12 lg:gap-6 lg:space-y-0">
      {error && (
        <p className="rounded-[1.75rem] bg-red-500/10 px-4 py-3 text-sm text-[var(--danger)] lg:col-span-12">
          {error}
        </p>
      )}

      <div className="lg:col-span-12 lg:mt-10 lg:mb-2">
        <ThisWeekStrip days={data?.thisWeek ?? []} today={data?.today ?? null} />
      </div>

      <div className="lg:col-span-12 lg:mb-2">
        <TodayCard plan={data?.todayPlan ?? null} supplementImageSrc={supplementImageSrc} />
      </div>

      <div className="space-y-3 lg:col-span-12 lg:space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:gap-4">
          <Link
            href={active ? `/workouts/${active.id}/live` : primary ? `/workouts/${primary.id}` : "/workouts"}
            className="relative flex min-h-[11.5rem] flex-col justify-between overflow-hidden rounded-[1.75rem] bg-[var(--bg-elevated)] p-4 transition hover:bg-[var(--bg-soft)] lg:min-h-[13rem] lg:border lg:border-white/10 lg:bg-black/50 lg:p-5 lg:hover:bg-black/60"
          >
            {active ? (
              <span
                className="pointer-events-none absolute right-1 top-1/2 z-0 -translate-y-1/2 select-none text-[1.65rem] font-normal leading-none tracking-wide text-white/[0.08]"
                style={{ fontFamily: '"Times New Roman", Times, serif' }}
                aria-hidden
              >
                Active
              </span>
            ) : null}
            <div className="relative z-10 flex items-start justify-between">
              <ProgressRing value={workoutRing.value} max={workoutRing.max} />
              <OverviewCardMenu />
            </div>
            <div className="relative z-10 pr-2">
              <p className="text-[15px] font-medium leading-snug text-white">
                {active
                  ? active.title
                  : primary?.title ?? "No workout yet"}
              </p>
              <p className="mt-1 text-[13px] text-white/40">
                {active
                  ? `${active.doneSets}/${active.totalSets} Sets · ${activePct}%`
                  : primary?.weekday ?? "Tap to start"}
              </p>
            </div>
          </Link>

          <Link
            href="/journal"
            className="relative flex min-h-[11.5rem] flex-col overflow-hidden rounded-[1.75rem] bg-[var(--bg-elevated)] p-4 transition hover:bg-[var(--bg-soft)] lg:min-h-[13rem] lg:border lg:border-white/10 lg:bg-black/50 lg:p-5 lg:hover:bg-black/60"
          >
            <span
              className="pointer-events-none absolute bottom-3 right-2 z-0 select-none text-[2.4rem] font-normal leading-none tracking-wide text-white/[0.08]"
              style={{ fontFamily: '"Times New Roman", Times, serif' }}
              aria-hidden
            >
              Sleep
            </span>
            <div className="relative z-10 flex items-start justify-between">
              <p
                className="text-[2rem] font-normal leading-none tracking-tight text-white"
                style={{ fontFamily: '"Times New Roman", Times, serif' }}
              >
                {data?.latestJournal?.sleep_hours != null ? (
                  <>
                    {data.latestJournal.sleep_hours}
                    <span className="ml-1 text-base font-normal text-white/45">h</span>
                  </>
                ) : (
                  <span className="text-white/35">—</span>
                )}
              </p>
              <OverviewCardMenu />
            </div>
            <p className="relative z-10 mt-2 pr-10 text-[13px] text-white/40">
              {relativeJournal(data?.latestJournal?.date)}
            </p>
          </Link>
        </div>

        <div className="rounded-[1.75rem] bg-[var(--bg-elevated)] p-4 lg:border lg:border-white/10 lg:bg-black/50 lg:p-5">
          <OverviewHeatmap
            heatMap={data?.heatMap ?? {}}
            calendarDays={data?.calendarDays ?? {}}
          />
          <div className="mt-5 flex items-center gap-3 border-t border-white/8 pt-4">
            <ProgressRing
              value={secondary?.index ?? (primary ? 2 : 0)}
              max={Math.max(4, data?.stats.workouts || 4)}
            />
            <Link href={secondary ? `/workouts/${secondary.id}` : "/workouts"} className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-medium text-white">
                {secondary?.title ?? "Plan next workout"}
              </p>
              <p className="mt-0.5 text-[13px] text-white/40">
                {secondary?.weekday ?? "No second session yet"}
              </p>
            </Link>
            <OverviewCardMenu />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-[1.75rem] bg-[var(--bg-elevated)] px-5 py-5 lg:border lg:border-white/10 lg:bg-black/50">
          <div>
            <p className="text-[15px] font-medium text-white">Volume</p>
            <p className="mt-0.5 text-[13px] text-white/40">Last 7 days</p>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-[1.65rem] font-semibold tabular-nums tracking-tight text-white">
              {formatVolume(data?.volume7d ?? 0)}
              <span className="ml-1 text-sm font-normal text-white/45">kg</span>
            </p>
            <OverviewCardMenu />
          </div>
        </div>

        <Link
          href="/workouts"
          className="flex min-h-[4.5rem] items-center justify-center rounded-[1.75rem] bg-[var(--bg-elevated)] text-3xl text-white/35 transition hover:bg-[var(--bg-soft)] hover:text-white/60 lg:border lg:border-white/10 lg:bg-black/50 lg:hover:bg-black/60"
          aria-label="New workout"
        >
          +
        </Link>
      </div>
    </div>
  );
}
