"use client";

import Link from "next/link";
import { useState } from "react";

function Ring({ value, max = 4 }: { value: number; max?: number }) {
  const size = 44;
  const stroke = 3.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, value / max));
  const offset = c * (1 - pct);

  return (
    <div className="relative h-11 w-11 shrink-0">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#fff"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums text-white">
        {value}
      </span>
    </div>
  );
}

function CardMenu() {
  return (
    <button
      type="button"
      aria-label="Optionen"
      className="flex h-7 w-7 items-center justify-center rounded-full text-white/45 transition hover:bg-white/8 hover:text-white/80"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 8h16M4 12h12M4 16h8" strokeLinecap="round" />
      </svg>
    </button>
  );
}

export type WeekDay = {
  label: string;
  date: string;
  isToday: boolean;
  abbr: string[];
  planned?: boolean;
  workoutId: string | null;
  title: string | null;
};

export function ThisWeekStrip({
  days,
  today,
}: {
  days: WeekDay[];
  today: WeekDay | null;
}) {
  const todayTags = today?.abbr ?? [];
  const todayLabel =
    todayTags.length === 0
      ? "Heute: Ruhe / offen"
      : today?.planned
        ? `Heute geplant: ${todayTags.join(" · ")}`
        : `Heute: ${todayTags.join(" · ")}`;

  return (
    <div className="rounded-[1.75rem] bg-[var(--bg-elevated)] p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <p className="text-[15px] font-medium text-white">This week</p>
        <p className="text-[12px] text-white/40">{todayLabel}</p>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => (
          <div
            key={day.date}
            className={`flex min-h-[4.25rem] flex-col items-center rounded-[1.75rem] px-1 py-2 text-center transition ${
              day.isToday ? "bg-white/12 ring-1 ring-white/20" : "bg-white/[0.04]"
            }`}
          >
            <span
              className={`text-[10px] font-medium ${
                day.isToday ? "text-white" : "text-white/40"
              }`}
            >
              {day.label}
            </span>
            <div className="mt-1.5 flex flex-1 flex-col items-center justify-center gap-0.5">
              {day.abbr.length > 0 ? (
                day.abbr.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className={`text-[11px] font-semibold leading-tight ${
                      day.isToday ? "text-white" : "text-white/70"
                    }`}
                  >
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-white/25">—</span>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] leading-relaxed text-white/30">
        Kürzel: Br Brust · Sch Schultern · Ar Arme · Rü Rücken · Ba Bauch · Be Beine
      </p>
    </div>
  );
}

export type TodayPlan = {
  date: string;
  workout: {
    title: string | null;
    abbr: string[];
    planned: boolean;
    workoutId: string | null;
    status: "logged" | "planned" | "rest";
    groups: { key: string; label: string; abbr: string }[];
    suggestedExercises: { name: string; focus: string; group: string }[];
  } | null;
  supplementsDue: {
    id: string;
    name: string;
    dose: string | null;
    timeOfDay: string;
    notes: string | null;
    logged: boolean;
    imageFile: string | null;
  }[];
  supplementsLogged: {
    id: string;
    name: string;
    dose: string | null;
    time: string | null;
    notes: string | null;
  }[];
  journal: {
    mood: number | null;
    sleep_hours: number | null;
    energy: number | null;
    notes: string | null;
  } | null;
};

function workoutStatusLabel(status: "logged" | "planned" | "rest") {
  if (status === "logged") return "Logged";
  if (status === "planned") return "Planned";
  return "Rest day";
}

export function TodayCard({
  plan,
  supplementImageSrc,
}: {
  plan: TodayPlan | null;
  supplementImageSrc?: (file: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const workout = plan?.workout ?? null;
  const due = plan?.supplementsDue ?? [];
  const loggedCount = due.filter((s) => s.logged).length;

  const preview =
    workout?.status === "rest"
      ? due.length
        ? `${due.length} supplements scheduled`
        : "Rest / open"
      : workout?.title ??
        (workout?.abbr.length ? workout.abbr.join(" · ") : "Open session");

  return (
    <div className="overflow-hidden rounded-[1.75rem] bg-[var(--bg-elevated)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-5 text-left transition hover:bg-[var(--bg-soft)]"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <p className="text-[15px] font-medium text-white">Today</p>
          <p className="mt-0.5 truncate text-[13px] text-white/40">{preview}</p>
        </div>
        <span
          className={`shrink-0 text-white/35 transition-transform duration-200 ${
            open ? "rotate-90" : ""
          }`}
          aria-hidden
        >
          ›
        </span>
      </button>

      {open && (
        <div className="space-y-5 border-t border-white/8 px-5 pb-5 pt-4">
          <section>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <p className="text-[12px] font-medium tracking-wide text-white/45 uppercase">
                Workout
              </p>
              {workout && (
                <span className="text-[11px] text-white/35">
                  {workoutStatusLabel(workout.status)}
                  {workout.planned ? " · inferred" : ""}
                </span>
              )}
            </div>
            {workout?.status === "rest" ? (
              <p className="text-[14px] text-white/55">No session planned — rest or open day.</p>
            ) : (
              <div className="space-y-3">
                <p className="text-[15px] font-medium text-white">
                  {workout?.title ?? "Workout"}
                </p>
                {workout?.groups.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {workout.groups.map((g) => (
                      <span
                        key={g.key}
                        className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] text-white/70"
                      >
                        {g.label}
                      </span>
                    ))}
                  </div>
                ) : null}
                {workout?.suggestedExercises.length ? (
                  <ul className="space-y-1.5">
                    {workout.suggestedExercises.slice(0, 6).map((ex) => (
                      <li
                        key={`${ex.group}-${ex.name}`}
                        className="flex items-baseline justify-between gap-3 text-[13px]"
                      >
                        <span className="text-white/80">{ex.name}</span>
                        <span className="shrink-0 text-[11px] text-white/35">
                          {ex.focus}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <Link
                  href={workout?.workoutId ? `/workouts/${workout.workoutId}` : "/workouts"}
                  className="inline-flex text-[13px] text-white/55 underline-offset-2 hover:text-white hover:underline"
                >
                  {workout?.workoutId ? "Open session →" : "Start workout →"}
                </Link>
              </div>
            )}
          </section>

          <section>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <p className="text-[12px] font-medium tracking-wide text-white/45 uppercase">
                Supplements
              </p>
              {due.length > 0 && (
                <span className="text-[11px] tabular-nums text-white/35">
                  {loggedCount}/{due.length} taken
                </span>
              )}
            </div>
            {due.length === 0 ? (
              <p className="text-[14px] text-white/55">
                Nothing scheduled.{" "}
                <Link href="/supplements" className="underline-offset-2 hover:underline">
                  Set times →
                </Link>
              </p>
            ) : (
              <ul className="space-y-2.5">
                {due.map((s) => (
                  <li key={s.id} className="flex items-center gap-3">
                    {s.imageFile && supplementImageSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={supplementImageSrc(s.imageFile)}
                        alt=""
                        width={32}
                        height={32}
                        className="h-10 w-14 shrink-0 rounded-[1.75rem] object-cover bg-white/8"
                      />
                    ) : (
                      <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-[1.75rem] bg-white/8 text-[10px] text-white/35">
                        —
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] text-white">{s.name}</p>
                      <p className="text-[12px] text-white/40">
                        {s.timeOfDay}
                        {s.dose ? ` · ${s.dose}` : ""}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-[11px] ${
                        s.logged ? "text-white/70" : "text-white/30"
                      }`}
                    >
                      {s.logged ? "Done" : "Due"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {plan?.journal && (
            <section>
              <p className="mb-2 text-[12px] font-medium tracking-wide text-white/45 uppercase">
                Journal
              </p>
              <p className="text-[14px] text-white/70">
                {[
                  plan.journal.sleep_hours != null ? `${plan.journal.sleep_hours}h sleep` : null,
                  plan.journal.mood != null ? `mood ${plan.journal.mood}` : null,
                  plan.journal.energy != null ? `energy ${plan.journal.energy}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Logged today"}
              </p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function localTodayISO() {
  const local = new Date();
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`;
}

function monthGrid(year: number, monthIndex: number, heatMap: Record<string, number>) {
  const first = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const startPad = (first.getDay() + 6) % 7; // Monday start
  const cells: { key: string; active: boolean; empty?: boolean; isToday?: boolean }[] = [];
  for (let i = 0; i < startPad; i++) cells.push({ key: `pad-${i}`, active: false, empty: true });

  const todayISO = localTodayISO();

  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({
      key: date,
      active: (heatMap[date] ?? 0) > 0,
      isToday: date === todayISO,
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ key: `trail-${cells.length}`, active: false, empty: true });
  }
  return cells;
}

const MONTHS = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];
const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export function OverviewHeatmap({ heatMap }: { heatMap: Record<string, number> }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const cells = monthGrid(year, month, heatMap);
  const atCurrent =
    year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth());

  function goPrev() {
    setMonth((m) => {
      if (m === 0) {
        setYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }

  function goNext() {
    if (atCurrent) return;
    setMonth((m) => {
      if (m === 11) {
        setYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }

  return (
    <div className="w-full">
      <p className="mb-2 text-center text-[13px] font-medium text-white/70">
        {MONTHS[month]} <span className="text-white/35">{year}</span>
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Vorheriger Monat"
          onClick={goPrev}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/45 transition hover:bg-white/10 hover:text-white"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M15 6 9 12l6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="min-w-0 flex-1">
          <div className="mb-1 grid grid-cols-7 gap-px">
            {WEEKDAYS.map((day) => (
              <span key={day} className="text-center text-[8px] leading-none text-white/30">
                {day}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px">
            {cells.map((cell) => (
              <div key={cell.key} className="flex items-center justify-center py-[2px]">
                {cell.empty ? (
                  <span className="h-1.5 w-1.5" aria-hidden />
                ) : (
                  <span
                    title={cell.key}
                    className={`h-1.5 w-1.5 rounded-full ${
                      cell.active
                        ? "bg-white"
                        : cell.isToday
                          ? "bg-white/50"
                          : "bg-white/15"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          aria-label="Nächster Monat"
          disabled={atCurrent}
          onClick={goNext}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/45 transition hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-25"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function ProgressRing(props: { value: number; max?: number }) {
  return <Ring {...props} />;
}

export function OverviewCardMenu() {
  return <CardMenu />;
}
