"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  OverviewCardMenu,
  OverviewHeatmap,
  ProgressRing,
  ThisWeekStrip,
  TodayCard,
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
};

function formatVolume(n: number) {
  return n.toLocaleString("de-DE");
}

function relativeJournal(date: string | undefined) {
  if (!date) return "Noch keine Daten";
  const then = new Date(date + "T12:00:00").getTime();
  const days = Math.round((Date.now() - then) / 86400000);
  if (days <= 0) return "Heute";
  if (days === 1) return "Gestern";
  return `vor ${days} Tagen`;
}

/** App entry at `/` — Overview is the start page. */
export default function OverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  // #region agent log
  useEffect(() => {
    fetch("http://127.0.0.1:7581/ingest/071442a9-190c-4bcb-8cac-9d7d41291d6c", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "15a754" },
      body: JSON.stringify({
        sessionId: "15a754",
        runId: "post-fix",
        hypothesisId: "A",
        location: "page.tsx:OverviewPage",
        message: "Overview start page mounted at /",
        data: { path: window.location.pathname },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }, []);
  // #endregion

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
  const weekSessions = Object.entries(data?.heatMap ?? {}).filter(([date]) => {
    const d = new Date(date + "T12:00:00");
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    start.setHours(0, 0, 0, 0);
    return d >= start;
  }).length;

  return (
    <div className="animate-rise mx-auto max-w-lg space-y-3">
      {error && (
        <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-[var(--danger)]">{error}</p>
      )}

      <ThisWeekStrip days={data?.thisWeek ?? []} today={data?.today ?? null} />

      <TodayCard plan={data?.todayPlan ?? null} supplementImageSrc={supplementImageSrc} />

      <div className="grid grid-cols-2 gap-3">
        <Link
          href={primary ? `/workouts/${primary.id}` : "/workouts"}
          className="flex min-h-[11.5rem] flex-col justify-between rounded-[1.75rem] bg-[#1c1c1e] p-4 transition hover:bg-[#222224]"
        >
          <div className="flex items-start justify-between">
            <ProgressRing value={primary?.index ?? (weekSessions || 0)} max={Math.max(4, data?.stats.workouts || 4)} />
            <OverviewCardMenu />
          </div>
          <div>
            <p className="text-[15px] font-medium leading-snug text-white">
              {primary?.title ?? "Noch kein Workout"}
            </p>
            <p className="mt-1 text-[13px] text-white/40">
              {primary?.weekday ?? "Tippe zum Starten"}
            </p>
          </div>
        </Link>

        <Link
          href="/journal"
          className="flex min-h-[11.5rem] flex-col justify-between rounded-[1.75rem] bg-[#1c1c1e] p-4 transition hover:bg-[#222224]"
        >
          <div className="flex items-start justify-between">
            <p className="text-[1.75rem] font-semibold leading-none tracking-tight text-white">
              {data?.latestJournal?.sleep_hours != null ? (
                <>
                  {data.latestJournal.sleep_hours}
                  <span className="ml-1 text-base font-normal text-white/50">h</span>
                </>
              ) : (
                <span className="text-white/35">—</span>
              )}
            </p>
            <OverviewCardMenu />
          </div>
          <div>
            <p className="text-[15px] font-medium text-white">Schlaf</p>
            <p className="mt-1 text-[13px] text-white/40">
              {relativeJournal(data?.latestJournal?.date)}
            </p>
          </div>
        </Link>
      </div>

      <div className="rounded-[1.75rem] bg-[#1c1c1e] p-4">
        <OverviewHeatmap heatMap={data?.heatMap ?? {}} />
        <div className="mt-5 flex items-center gap-3 border-t border-white/8 pt-4">
          <ProgressRing
            value={secondary?.index ?? (primary ? 2 : 0)}
            max={Math.max(4, data?.stats.workouts || 4)}
          />
          <Link href={secondary ? `/workouts/${secondary.id}` : "/workouts"} className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-medium text-white">
              {secondary?.title ?? "Nächstes Workout planen"}
            </p>
            <p className="mt-0.5 text-[13px] text-white/40">
              {secondary?.weekday ?? "Noch keine zweite Session"}
            </p>
          </Link>
          <OverviewCardMenu />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-[1.75rem] bg-[#1c1c1e] px-5 py-5">
        <div>
          <p className="text-[15px] font-medium text-white">Volume lifted</p>
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
        className="flex min-h-[4.5rem] items-center justify-center rounded-[1.75rem] bg-[#1c1c1e] text-3xl text-white/35 transition hover:bg-[#222224] hover:text-white/60"
        aria-label="Neues Workout"
      >
        +
      </Link>
    </div>
  );
}
