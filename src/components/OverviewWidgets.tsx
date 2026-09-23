"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type MutableRefObject, type PointerEvent as ReactPointerEvent } from "react";

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
  scheduled?: boolean;
  workoutId: string | null;
  planId?: string | null;
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
      : today?.scheduled
        ? `Heute anstehend: ${today.title ?? todayTags.join(" · ")}`
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
              day.isToday
                ? "bg-white/12 ring-1 ring-white/20"
                : day.scheduled
                  ? "bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]/25"
                  : "bg-white/[0.04]"
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
                      day.scheduled && !day.workoutId
                        ? "text-[var(--accent)]"
                        : day.isToday
                          ? "text-white"
                          : "text-white/70"
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
        {days.some((d) => d.scheduled) ? " · Markiert = geplante Session" : ""}
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
    planId?: string | null;
    status: "logged" | "planned" | "rest" | "active";
    groups: { key: string; label: string; abbr: string }[];
    suggestedExercises: { name: string; focus: string; group: string }[];
    planExercises?: {
      name: string;
      muscle_group: string | null;
      sets: { reps: number | null; weight: number | null; rir: number | null; failure?: boolean }[];
    }[];
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

function workoutStatusLabel(status: "logged" | "planned" | "rest" | "active") {
  if (status === "logged") return "Logged";
  if (status === "planned") return "Planned";
  if (status === "active") return "Active";
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
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const router = useRouter();
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

  async function startSession() {
    if (starting) return;
    setStarting(true);
    setStartError(null);
    try {
      if (workout?.status === "active" && workout.workoutId) {
        router.push(`/workouts/${workout.workoutId}/live`);
        return;
      }
      const res = await fetch("/api/workouts/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id: workout?.planId ?? null,
          name: workout?.title ?? null,
          exercises:
            workout?.planExercises && workout.planExercises.length > 0
              ? workout.planExercises
              : (workout?.suggestedExercises ?? []).map((ex) => ({
                  name: ex.name,
                  muscle_group:
                    workout?.groups.find((g) => g.label === ex.group)?.key ?? null,
                  sets: [{ reps: null, weight: null, rir: null, failure: false }],
                })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      router.push(`/workouts/${json.id}/live`);
      router.refresh();
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Failed");
      setStarting(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-[1.75rem] bg-[var(--bg-elevated)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex w-full items-center gap-3 overflow-hidden px-5 py-5 text-left transition hover:bg-[var(--bg-soft)]"
        aria-expanded={open}
      >
        <span
          className="pointer-events-none absolute right-3 top-1/2 z-0 -translate-y-1/2 select-none text-[2.85rem] font-normal leading-none tracking-wide text-white/[0.08]"
          style={{ fontFamily: '"Times New Roman", Times, serif' }}
          aria-hidden
        >
          Today
        </span>
        <div className="relative z-10 min-w-0 flex-1 pr-16">
          <p
            className="truncate text-2xl font-normal leading-tight text-white"
            style={{ fontFamily: '"Times New Roman", Times, serif' }}
          >
            {preview}
          </p>
          {workout?.status && workout.status !== "rest" ? (
            <p className="mt-1 text-[12px] text-white/40">
              {workoutStatusLabel(workout.status)}
              {workout.abbr.length ? ` · ${workout.abbr.join(" · ")}` : ""}
            </p>
          ) : null}
        </div>
        <span
          className={`relative z-10 shrink-0 text-white/35 transition-transform duration-200 ${
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
                {startError && (
                  <p className="text-[12px] text-[var(--danger)]">{startError}</p>
                )}
                {workout?.status === "logged" ? (
                  <Link
                    href={workout.workoutId ? `/workouts/${workout.workoutId}` : "/workouts"}
                    className="inline-flex text-[13px] text-white/55 underline-offset-2 hover:text-white hover:underline"
                  >
                    Session öffnen →
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => void startSession()}
                    disabled={starting}
                    className="rounded-[1.25rem] border border-[var(--accent)]/35 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-[var(--accent)] transition hover:bg-emerald-500/25 hover:text-white disabled:opacity-60"
                  >
                    {starting
                      ? "…"
                      : workout?.status === "active"
                        ? "Session fortsetzen"
                        : "Start session"}
                  </button>
                )}
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

function startOfWeekMonday(d: Date) {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - day);
  return copy;
}

function addDays(d: Date, n: number) {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  copy.setDate(copy.getDate() + n);
  return copy;
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function weekGrid(
  monday: Date,
  weekCount: number,
  calendarDays: Record<string, CalendarDayInfo>,
) {
  const todayISO = localTodayISO();
  const cells: {
    key: string;
    day: number;
    isToday: boolean;
    logged: string[];
    planned: string[];
  }[] = [];

  for (let i = 0; i < weekCount * 7; i++) {
    const date = addDays(monday, i);
    const iso = toISODate(date);
    const info = calendarDays[iso];
    cells.push({
      key: iso,
      day: date.getDate(),
      isToday: iso === todayISO,
      logged: info?.logged ?? [],
      planned: info?.planned ?? [],
    });
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
const VISIBLE_WEEKS = 3;
/** 3 day-rows + 2 gaps (gap-1.5) — keeps vertical week slides clipped smoothly. */
const CAL_GRID_HEIGHT = "calc(3 * 4.75rem + 2 * 0.375rem)";

export type CalendarDayInfo = {
  logged: string[];
  planned: string[];
  labels?: string[];
};

function shortExercise(name: string) {
  const clean = name.trim();
  if (clean.length <= 8) return clean;
  return `${clean.slice(0, 7)}…`;
}

function monthTitle(monday: Date, weekCount: number) {
  const end = addDays(monday, weekCount * 7 - 1);
  const startMonth = monday.getMonth();
  const endMonth = end.getMonth();
  const startYear = monday.getFullYear();
  const endYear = end.getFullYear();
  if (startMonth === endMonth && startYear === endYear) {
    return { label: MONTHS[startMonth], year: String(startYear) };
  }
  if (startYear === endYear) {
    return {
      label: `${MONTHS[startMonth]} – ${MONTHS[endMonth]}`,
      year: String(startYear),
    };
  }
  return {
    label: `${MONTHS[startMonth]} ${startYear} – ${MONTHS[endMonth]}`,
    year: String(endYear),
  };
}

export function OverviewHeatmap({
  heatMap,
  calendarDays = {},
}: {
  heatMap: Record<string, number>;
  calendarDays?: Record<string, CalendarDayInfo>;
}) {
  const now = new Date();
  const [viewMonday, setViewMonday] = useState(() => startOfWeekMonday(now));
  const [selected, setSelected] = useState<string | null>(null);
  const [slide, setSlide] = useState<{
    from: Date;
    to: Date;
    dir: "left" | "right" | "up" | "down";
    on: boolean;
  } | null>(null);

  const drag = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    axis: null as "x" | "y" | null,
    dx: 0,
    dy: 0,
  });
  const [pull, setPull] = useState({ x: 0, y: 0 });
  const busy = useRef(false);

  const merged: Record<string, CalendarDayInfo> = { ...calendarDays };
  for (const [date, count] of Object.entries(heatMap)) {
    if (count > 0 && !merged[date]) {
      merged[date] = { logged: ["Workout"], planned: [] };
    }
  }

  const maxFuture = startOfWeekMonday(new Date(now.getFullYear(), now.getMonth() + 4, 1));
  const displayMonday = slide?.to ?? viewMonday;
  const atMaxFuture = displayMonday.getTime() >= maxFuture.getTime();
  const title = monthTitle(displayMonday, VISIBLE_WEEKS);

  const selectedInfo = selected ? merged[selected] : null;
  const selectedLabels = selectedInfo
    ? [
        ...selectedInfo.logged.map((n) => ({ name: n, kind: "logged" as const })),
        ...selectedInfo.planned.map((n) => ({ name: n, kind: "planned" as const })),
      ]
    : [];

  function navigate(next: Date, dir: "left" | "right" | "up" | "down") {
    if (busy.current || slide) return;
    const clamped =
      next.getTime() > maxFuture.getTime() ? maxFuture : next;
    if (clamped.getTime() === viewMonday.getTime()) return;
    busy.current = true;
    setSelected(null);
    setPull({ x: 0, y: 0 });
    setSlide({ from: viewMonday, to: clamped, dir, on: false });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setSlide((s) => (s ? { ...s, on: true } : null));
      });
    });
  }

  function finishSlide() {
    if (!slide?.on) return;
    setViewMonday(slide.to);
    setSlide(null);
    busy.current = false;
  }

  function goPrevMonth() {
    const mid = addDays(viewMonday, 7);
    const prevMonthFirst = new Date(mid.getFullYear(), mid.getMonth() - 1, 1);
    navigate(startOfWeekMonday(prevMonthFirst), "right");
  }

  function goNextMonth() {
    if (atMaxFuture) return;
    const mid = addDays(viewMonday, 7);
    const nextMonthFirst = new Date(mid.getFullYear(), mid.getMonth() + 1, 1);
    navigate(startOfWeekMonday(nextMonthFirst), "left");
  }

  function goPrevWeek() {
    navigate(addDays(viewMonday, -7), "down");
  }

  function goNextWeek() {
    if (atMaxFuture) return;
    navigate(addDays(viewMonday, 7), "up");
  }

  function onPointerDown(e: ReactPointerEvent) {
    if (busy.current || slide) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    drag.current = {
      active: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      axis: null,
      dx: 0,
      dy: 0,
    };
    setPull({ x: 0, y: 0 });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (!drag.current.active || drag.current.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;
    if (!drag.current.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      drag.current.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (drag.current.axis === "x") {
      const clamped = Math.max(-90, Math.min(90, dx));
      drag.current.dx = clamped;
      drag.current.dy = 0;
      setPull({ x: clamped, y: 0 });
    } else {
      const clamped = Math.max(-70, Math.min(70, dy));
      drag.current.dx = 0;
      drag.current.dy = clamped;
      setPull({ x: 0, y: clamped });
    }
  }

  function endDrag(e: ReactPointerEvent) {
    if (!drag.current.active || drag.current.pointerId !== e.pointerId) return;
    const { axis, dx, dy } = drag.current;
    drag.current.active = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    setPull({ x: 0, y: 0 });

    if (axis === "x" && Math.abs(dx) >= 48) {
      if (dx < 0) goNextMonth();
      else goPrevMonth();
      return;
    }
    if (axis === "y" && Math.abs(dy) >= 40) {
      if (dy < 0) goNextWeek();
      else goPrevWeek();
    }
  }

  const dragging = pull.x !== 0 || pull.y !== 0;
  const fromCells = weekGrid(slide?.from ?? viewMonday, VISIBLE_WEEKS, merged);
  const toCells = slide ? weekGrid(slide.to, VISIBLE_WEEKS, merged) : null;

  function trackTransform() {
    if (dragging) {
      return `translate(${pull.x * 0.35}px, ${pull.y * 0.35}px)`;
    }
    if (!slide) return "translate(0, 0)";
    const { dir, on } = slide;
    if (dir === "left") return on ? "translateX(-50%)" : "translateX(0)";
    if (dir === "right") return on ? "translateX(0)" : "translateX(-50%)";
    if (dir === "up") return on ? "translateY(-50%)" : "translateY(0)";
    return on ? "translateY(0)" : "translateY(-50%)";
  }

  const horizontal = !slide || slide.dir === "left" || slide.dir === "right";
  const showDual = !!slide && toCells;

  return (
    <div className="w-full">
      <p className="mb-3 text-center text-[13px] font-medium text-white/70 transition-opacity duration-300 ease-out">
        {title.label} <span className="text-white/35">{title.year}</span>
      </p>

      <div className="mb-1.5 flex justify-center">
        <button
          type="button"
          aria-label="Vorherige Woche"
          onClick={goPrevWeek}
          className="flex h-7 w-7 items-center justify-center rounded-full text-white/45 transition duration-300 ease-out hover:bg-white/10 hover:text-white"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="m6 15 6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Vorheriger Monat"
          onClick={goPrevMonth}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/45 transition duration-300 ease-out hover:bg-white/10 hover:text-white"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M15 6 9 12l6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div
          className="min-w-0 flex-1 touch-none select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="mb-2 grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((day) => (
              <span key={day} className="text-center text-[11px] leading-none text-white/35">
                {day}
              </span>
            ))}
          </div>

          <div
            className="overflow-hidden"
            style={showDual && !horizontal ? { height: CAL_GRID_HEIGHT } : undefined}
          >
            <div
              className={
                showDual
                  ? horizontal
                    ? "flex w-[200%] will-change-transform"
                    : "flex w-full flex-col will-change-transform"
                  : "w-full will-change-transform"
              }
              style={{
                transform: trackTransform(),
                transition: dragging ? "none" : "transform 300ms ease-out",
              }}
              onTransitionEnd={(e) => {
                if (e.propertyName !== "transform") return;
                finishSlide();
              }}
            >
              {showDual && slide.dir === "right" ? (
                <>
                  <div className={horizontal ? "w-1/2 shrink-0" : "w-full shrink-0"}>
                    <DayGrid cells={toCells!} selected={selected} onSelect={setSelected} drag={drag} />
                  </div>
                  <div className={horizontal ? "w-1/2 shrink-0" : "w-full shrink-0"}>
                    <DayGrid cells={fromCells} selected={null} onSelect={() => {}} drag={drag} />
                  </div>
                </>
              ) : showDual && slide.dir === "down" ? (
                <>
                  <div className="w-full shrink-0">
                    <DayGrid cells={toCells!} selected={selected} onSelect={setSelected} drag={drag} />
                  </div>
                  <div className="w-full shrink-0">
                    <DayGrid cells={fromCells} selected={null} onSelect={() => {}} drag={drag} />
                  </div>
                </>
              ) : showDual ? (
                <>
                  <div className={horizontal ? "w-1/2 shrink-0" : "w-full shrink-0"}>
                    <DayGrid cells={fromCells} selected={null} onSelect={() => {}} drag={drag} />
                  </div>
                  <div className={horizontal ? "w-1/2 shrink-0" : "w-full shrink-0"}>
                    <DayGrid cells={toCells!} selected={selected} onSelect={setSelected} drag={drag} />
                  </div>
                </>
              ) : (
                <DayGrid
                  cells={fromCells}
                  selected={selected}
                  onSelect={setSelected}
                  drag={drag}
                />
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          aria-label="Nächster Monat"
          disabled={atMaxFuture}
          onClick={goNextMonth}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/45 transition duration-300 ease-out hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-25"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="mt-1.5 flex justify-center">
        <button
          type="button"
          aria-label="Nächste Woche"
          disabled={atMaxFuture}
          onClick={goNextWeek}
          className="flex h-7 w-7 items-center justify-center rounded-full text-white/45 transition duration-300 ease-out hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-25"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {selected && (
        <div className="mt-3 rounded-[1.25rem] bg-white/[0.04] px-3 py-2.5 transition-opacity duration-300 ease-out">
          <p className="text-[11px] text-white/40 tabular-nums">{selected}</p>
          {selectedLabels.length === 0 ? (
            <p className="mt-1 text-[13px] text-white/35">Keine Übungen</p>
          ) : (
            <ul className="mt-1.5 space-y-1">
              {selectedLabels.map((item) => (
                <li
                  key={`${item.kind}-${item.name}`}
                  className="flex items-center justify-between gap-2 text-[13px]"
                >
                  <span className="min-w-0 truncate text-white/85">{item.name}</span>
                  <span
                    className={`shrink-0 text-[10px] ${
                      item.kind === "planned" ? "text-[var(--accent)]" : "text-white/40"
                    }`}
                  >
                    {item.kind === "planned" ? "geplant" : "geloggt"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="mt-2 text-center text-[10px] text-white/25">
        Swipe ←→ Monat · ↕ Woche · Weiß = geloggt · Silber = geplant
      </p>
    </div>
  );
}

function DayGrid({
  cells,
  selected,
  onSelect,
  drag,
}: {
  cells: ReturnType<typeof weekGrid>;
  selected: string | null;
  onSelect: (next: string | null) => void;
  drag: MutableRefObject<{ dx: number; dy: number }>;
}) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {cells.map((cell) => {
        const hasLogged = cell.logged.length > 0;
        const hasPlanned = cell.planned.length > 0;
        const preview = [...cell.logged, ...cell.planned].slice(0, 3);
        const isSelected = selected === cell.key;
        return (
          <button
            key={cell.key}
            type="button"
            onClick={() => {
              if (Math.abs(drag.current.dx) > 10 || Math.abs(drag.current.dy) > 10) return;
              onSelect(isSelected ? null : cell.key);
            }}
            title={cell.key}
            className={`flex min-h-[4.75rem] flex-col items-center rounded-[1rem] px-0.5 py-1.5 text-center transition-colors duration-300 ease-out ${
              isSelected
                ? "bg-white/16 ring-1 ring-white/25"
                : cell.isToday
                  ? "bg-white/10 ring-1 ring-white/15"
                  : hasLogged || hasPlanned
                    ? "bg-white/[0.05] hover:bg-white/[0.09]"
                    : "hover:bg-white/[0.04]"
            }`}
          >
            <span
              className={`text-[13px] font-medium tabular-nums leading-none ${
                cell.isToday ? "text-white" : "text-white/55"
              }`}
            >
              {cell.day}
            </span>
            <div className="mt-1 flex w-full flex-1 flex-col items-center justify-start gap-0.5 overflow-hidden">
              {preview.length > 0 ? (
                preview.map((name, i) => {
                  const planned = i >= cell.logged.length;
                  return (
                    <span
                      key={`${name}-${i}`}
                      className={`w-full truncate text-[8px] leading-tight ${
                        planned ? "text-[var(--accent)]/80" : "text-white/70"
                      }`}
                    >
                      {shortExercise(name)}
                    </span>
                  );
                })
              ) : (
                <span className="mt-1.5 h-1 w-1 rounded-full bg-white/10" aria-hidden />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function ProgressRing(props: { value: number; max?: number }) {
  return <Ring {...props} />;
}

export function OverviewCardMenu() {
  return <CardMenu />;
}
