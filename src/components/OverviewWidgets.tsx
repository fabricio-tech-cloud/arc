"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { slotLabel, type SessionSlot } from "@/lib/session-schedule";

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
      aria-label="Options"
      className="flex h-7 w-7 items-center justify-center rounded-full text-white/45 transition hover:bg-white/8 hover:text-white/80"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 8h16M4 12h12M4 16h8" strokeLinecap="round" />
      </svg>
    </button>
  );
}

export type WeekDaySession = {
  planId: string | null;
  workoutId: string | null;
  title: string;
  abbr: string[];
  slot: SessionSlot;
  time: string | null;
  exerciseCount: number;
  exercises?: { name: string }[];
  status: "logged" | "planned" | "active";
};

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
  sessions?: WeekDaySession[];
};

function formatDayLong(date: string) {
  try {
    return new Date(date + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  } catch {
    return date;
  }
}

function hapticTick() {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(8);
    }
  } catch {
    /* ignore */
  }
}

export function ThisWeekStrip({
  days,
  today,
}: {
  days: WeekDay[];
  today: WeekDay | null;
}) {
  const todayIndex = Math.max(
    0,
    days.findIndex((d) => d.isToday),
  );
  const [expanded, setExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(todayIndex >= 0 ? todayIndex : 0);
  const [mouseDragging, setMouseDragging] = useState(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const skipScrollSync = useRef(false);
  const mouseDrag = useRef<{
    pointerId: number;
    startX: number;
    startScroll: number;
    moved: boolean;
    lastX: number;
    lastT: number;
    velocity: number;
  } | null>(null);

  const todayTags = today?.abbr ?? [];
  const todayLabel =
    todayTags.length === 0
      ? "Today: rest / open"
      : today?.scheduled
        ? `Today upcoming: ${today.title ?? todayTags.join(" · ")}`
        : today?.planned
          ? `Today planned: ${todayTags.join(" · ")}`
          : `Today: ${todayTags.join(" · ")}`;

  useEffect(() => {
    if (!expanded) return;
    const idx = days.findIndex((d) => d.isToday);
    const next = idx >= 0 ? idx : 0;
    setActiveIndex(next);
    skipScrollSync.current = true;
    requestAnimationFrame(() => {
      const el = scrollerRef.current;
      if (!el) return;
      const width = el.clientWidth;
      el.scrollTo({ left: next * width, behavior: "auto" });
      skipScrollSync.current = false;
    });
  }, [expanded, days]);

  function scrollToIndex(index: number, behavior: ScrollBehavior = "smooth") {
    const el = scrollerRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(days.length - 1, index));
    skipScrollSync.current = true;
    setActiveIndex(clamped);
    el.scrollTo({ left: clamped * el.clientWidth, behavior });
    window.setTimeout(() => {
      skipScrollSync.current = false;
    }, behavior === "smooth" ? 320 : 40);
  }

  function onScrollerScroll() {
    const el = scrollerRef.current;
    if (!el || skipScrollSync.current || !el.clientWidth) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    if (next !== activeIndex && next >= 0 && next < days.length) {
      setActiveIndex(next);
      hapticTick();
    }
  }

  function onMouseDragDown(e: ReactPointerEvent<HTMLDivElement>) {
    // Desktop mouse drag-to-swipe; touch keeps native scroll.
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const el = scrollerRef.current;
    if (!el) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest("button, a, input, textarea, select, label")) return;

    mouseDrag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      moved: false,
      lastX: e.clientX,
      lastT: performance.now(),
      velocity: 0,
    };
    setMouseDragging(true);
    el.classList.add("scroll-auto");
    el.classList.remove("scroll-smooth");
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function onMouseDragMove(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = mouseDrag.current;
    const el = scrollerRef.current;
    if (!drag || !el || e.pointerId !== drag.pointerId) return;

    const dx = e.clientX - drag.startX;
    if (!drag.moved && Math.abs(dx) < 4) return;
    drag.moved = true;

    const now = performance.now();
    const dt = Math.max(1, now - drag.lastT);
    drag.velocity = ((e.clientX - drag.lastX) / dt) * 1000;
    drag.lastX = e.clientX;
    drag.lastT = now;

    el.scrollLeft = drag.startScroll - dx;
    e.preventDefault();
  }

  function endMouseDrag(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = mouseDrag.current;
    const el = scrollerRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    mouseDrag.current = null;
    setMouseDragging(false);

    if (el) {
      el.classList.add("scroll-smooth");
      el.classList.remove("scroll-auto");
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }

      if (drag.moved && el.clientWidth) {
        const width = el.clientWidth;
        const projected = el.scrollLeft - drag.velocity * 0.18;
        let next = Math.round(projected / width);
        // Prefer direction of a clear flick
        if (Math.abs(drag.velocity) > 450) {
          next = drag.velocity < 0 ? activeIndex + 1 : activeIndex - 1;
        }
        scrollToIndex(next);
      }
    }
  }

  const activeDay = days[activeIndex] ?? null;

  return (
    <div
      className={`relative rounded-[1.75rem] bg-[var(--bg-elevated)] transition-[padding] duration-300 lg:border lg:border-white/10 lg:bg-black/50 ${
        expanded ? "p-4 sm:p-5" : "p-4"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mb-3 flex w-full items-baseline justify-between gap-2 text-left"
        aria-expanded={expanded}
      >
        <p className="text-[15px] font-medium text-white">This week</p>
        <span className="flex items-center gap-1.5 text-[12px] text-white/40">
          {todayLabel}
          <svg
            viewBox="0 0 24 24"
            className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
              expanded ? "rotate-90" : ""
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {!expanded ? (
        <>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="grid w-full grid-cols-7 gap-1.5"
            aria-label="Expand week schedule"
          >
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
                    <span className="text-[11px] text-white/25">-</span>
                  )}
                </div>
              </div>
            ))}
          </button>
          <p className="mt-3 text-[10px] leading-relaxed text-white/30">
            Keys: Ch Chest · Sh Shoulders · Ar Arms · Bk Back · Ab Abs · Lg Legs · Fd Field
            {days.some((d) => d.scheduled) ? " · Highlight = planned session" : ""}
            {" · Tap to expand"}
          </p>
        </>
      ) : (
        <div className="animate-rise space-y-3">
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {days.map((day, i) => (
              <button
                key={day.date}
                type="button"
                onClick={() => {
                  hapticTick();
                  scrollToIndex(i);
                }}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition ${
                  i === activeIndex
                    ? "bg-white/14 text-white ring-1 ring-white/20"
                    : day.isToday
                      ? "text-white/70"
                      : "text-white/40 hover:text-white/65"
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>

          <div
            ref={scrollerRef}
            onScroll={onScrollerScroll}
            onPointerDown={onMouseDragDown}
            onPointerMove={onMouseDragMove}
            onPointerUp={endMouseDrag}
            onPointerCancel={endMouseDrag}
            className={`flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] touch-pan-x select-none [&::-webkit-scrollbar]:hidden ${
              mouseDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {days.map((day) => {
              const sessions = day.sessions ?? [];
              const morning = sessions.filter((s) => s.slot === "morning");
              const noon = sessions.filter((s) => s.slot === "noon");
              const slots: { key: SessionSlot; label: string; items: WeekDaySession[] }[] = [
                { key: "morning", label: slotLabel("morning"), items: morning },
                { key: "noon", label: slotLabel("noon"), items: noon },
              ];

              return (
                <div
                  key={day.date}
                  className="w-full shrink-0 snap-center snap-always px-0.5"
                >
                  <div className="min-h-[13.5rem]">
                    <div className="mb-4 flex items-baseline justify-between gap-2">
                      <div>
                        <p className="text-[15px] font-medium text-white">
                          {formatDayLong(day.date)}
                        </p>
                        {day.isToday ? (
                          <p className="mt-0.5 text-[11px] text-[var(--accent)]">Today</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-5">
                      {slots.map((slot) => (
                        <section key={slot.key}>
                          <div className="mb-2 flex items-baseline justify-between gap-2">
                            <p className="text-[12px] font-medium tracking-wide text-white/55 uppercase">
                              {slot.label}
                            </p>
                            {slot.items[0]?.time ? (
                              <p className="text-[11px] tabular-nums text-white/35">
                                {slot.items[0].time}
                              </p>
                            ) : null}
                          </div>

                          <div className="flex min-h-[4.5rem] gap-3">
                            <span
                              aria-hidden
                              className={`w-[3px] shrink-0 self-stretch rounded-full ${
                                slot.key === "morning"
                                  ? "bg-[var(--accent)]"
                                  : "bg-[var(--warn)]"
                              } ${slot.items.length === 0 ? "opacity-25" : "opacity-85"}`}
                            />
                            <div className="min-w-0 flex-1 space-y-2">
                              {slot.items.length === 0 ? (
                                <p className="text-[13px] text-white/30">Open</p>
                              ) : (
                                slot.items.map((session, si) => {
                                  const exercises = session.exercises ?? [];
                                  return (
                                    <div
                                      key={`${session.planId ?? session.workoutId ?? "s"}-${si}`}
                                    >
                                      <div className="flex items-baseline justify-between gap-2">
                                        <p className="truncate text-[14px] font-medium text-white">
                                          {session.title}
                                        </p>
                                        <span className="shrink-0 text-[10px] capitalize text-white/40">
                                          {session.status}
                                        </span>
                                      </div>
                                      {session.abbr.length > 0 ? (
                                        <p className="mt-0.5 text-[12px] text-white/40">
                                          {session.abbr.join(" · ")}
                                        </p>
                                      ) : null}
                                      {exercises.length > 0 ? (
                                        <ul className="mt-2 space-y-1">
                                          {exercises.map((ex) => (
                                            <li
                                              key={ex.name}
                                              className="text-[13px] text-white/70"
                                            >
                                              {ex.name}
                                            </li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <p className="mt-2 text-[13px] text-white/30">
                                          No exercises listed
                                        </p>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </section>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-3 pt-0.5">
            <p className="text-[10px] text-white/30">Swipe or drag between days</p>
            <div className="flex items-center gap-1.5">
              {days.map((day, i) => (
                <span
                  key={day.date}
                  className={`h-1.5 rounded-full transition-all ${
                    i === activeIndex ? "w-4 bg-white/70" : "w-1.5 bg-white/20"
                  }`}
                />
              ))}
            </div>
            {activeDay ? (
              <p className="text-[10px] tabular-nums text-white/30">
                {activeIndex + 1}/{days.length}
              </p>
            ) : (
              <span />
            )}
          </div>
        </div>
      )}
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
    <div className="overflow-hidden rounded-[1.75rem] bg-[var(--bg-elevated)] lg:border lg:border-white/10 lg:bg-black/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex w-full items-center gap-3 overflow-hidden px-5 py-5 text-left transition hover:bg-[var(--bg-soft)] lg:hover:bg-white/[0.04]"
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
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
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
              <p className="text-[14px] text-white/55">No session planned - rest or open day.</p>
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
                    {"Open session ->"}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => void startSession()}
                    disabled={starting}
                    className="rounded-[1.25rem] border border-[var(--accent)]/35 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-[var(--accent)] transition hover:bg-emerald-500/25 hover:text-white disabled:opacity-60"
                  >
                    {starting
                      ? "..."
                      : workout?.status === "active"
                        ? "Continue session"
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
                  {"Set times ->"}
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
                        -
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
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const VISIBLE_WEEKS = 3;
/** 3 day-rows + 2 gaps (gap-1.5) - keeps vertical week slides clipped smoothly. */
const CAL_GRID_HEIGHT = "calc(3 * 4.75rem + 2 * 0.375rem)";

export type CalendarDayInfo = {
  logged: string[];
  planned: string[];
  labels?: string[];
};

function shortExercise(name: string) {
  const clean = name.trim();
  if (clean.length <= 8) return clean;
  return `${clean.slice(0, 7)}...`;
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
      label: `${MONTHS[startMonth]} - ${MONTHS[endMonth]}`,
      year: String(startYear),
    };
  }
  return {
    label: `${MONTHS[startMonth]} ${startYear} - ${MONTHS[endMonth]}`,
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
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const drag = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    axis: null as "x" | "y" | null,
    dx: 0,
    dy: 0,
    moved: false,
  });

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

  function setTrack(x: number, y: number, animate: boolean) {
    const el = trackRef.current;
    if (!el) return;
    el.style.transition = animate
      ? "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)"
      : "none";
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  function viewportSize() {
    const el = viewportRef.current;
    return {
      w: el?.clientWidth || 1,
      h: el?.clientHeight || 1,
    };
  }

  function navigate(
    next: Date,
    dir: "left" | "right" | "up" | "down",
    fromOffset = { x: 0, y: 0 },
  ) {
    if (busy.current) return;
    const clamped = next.getTime() > maxFuture.getTime() ? maxFuture : next;
    if (clamped.getTime() === viewMonday.getTime()) {
      setTrack(0, 0, true);
      return;
    }
    busy.current = true;
    setSelected(null);
    setSlide({
      from: viewMonday,
      to: clamped,
      dir,
      offsetX: fromOffset.x,
      offsetY: fromOffset.y,
    });
  }

  useLayoutEffect(() => {
    if (!slide) return;
    const { w, h } = viewportSize();
    const { dir, offsetX, offsetY } = slide;
    if (dir === "left") setTrack(offsetX, 0, false);
    else if (dir === "right") setTrack(-w + offsetX, 0, false);
    else if (dir === "up") setTrack(0, offsetY, false);
    else setTrack(0, -h + offsetY, false);

    const id = requestAnimationFrame(() => {
      if (dir === "left") setTrack(-w, 0, true);
      else if (dir === "right") setTrack(0, 0, true);
      else if (dir === "up") setTrack(0, -h, true);
      else setTrack(0, 0, true);
    });
    return () => cancelAnimationFrame(id);
  }, [slide]);

  function finishSlide() {
    if (!slide) return;
    const next = slide.to;
    setTrack(0, 0, false);
    setViewMonday(next);
    setSlide(null);
    busy.current = false;
  }

  function goPrevMonth(fromOffset = { x: 0, y: 0 }) {
    const mid = addDays(viewMonday, 7);
    const prevMonthFirst = new Date(mid.getFullYear(), mid.getMonth() - 1, 1);
    navigate(startOfWeekMonday(prevMonthFirst), "right", fromOffset);
  }

  function goNextMonth(fromOffset = { x: 0, y: 0 }) {
    if (atMaxFuture && fromOffset.x === 0 && fromOffset.y === 0) return;
    const mid = addDays(viewMonday, 7);
    const nextMonthFirst = new Date(mid.getFullYear(), mid.getMonth() + 1, 1);
    navigate(startOfWeekMonday(nextMonthFirst), "left", fromOffset);
  }

  function goPrevWeek(fromOffset = { x: 0, y: 0 }) {
    navigate(addDays(viewMonday, -7), "down", fromOffset);
  }

  function goNextWeek(fromOffset = { x: 0, y: 0 }) {
    if (atMaxFuture && fromOffset.x === 0 && fromOffset.y === 0) return;
    navigate(addDays(viewMonday, 7), "up", fromOffset);
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
      moved: false,
    };
    setTrack(0, 0, false);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (!drag.current.active || drag.current.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;
    if (!drag.current.axis) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      drag.current.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      drag.current.moved = true;
    }
    const { w, h } = viewportSize();
    if (drag.current.axis === "x") {
      let x = dx;
      if (atMaxFuture && x < 0) x = dx * 0.25;
      x = Math.max(-w * 0.92, Math.min(w * 0.92, x));
      drag.current.dx = x;
      drag.current.dy = 0;
      setTrack(x, 0, false);
    } else {
      let y = dy;
      if (atMaxFuture && y < 0) y = dy * 0.25;
      y = Math.max(-h * 0.92, Math.min(h * 0.92, y));
      drag.current.dx = 0;
      drag.current.dy = y;
      setTrack(0, y, false);
    }
  }

  function endDrag(e: ReactPointerEvent) {
    if (!drag.current.active || drag.current.pointerId !== e.pointerId) return;
    const { axis, dx, dy, moved } = drag.current;
    drag.current.active = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }

    const { w, h } = viewportSize();
    const commitX = Math.abs(dx) >= Math.min(56, w * 0.22);
    const commitY = Math.abs(dy) >= Math.min(48, h * 0.18);

    if (axis === "x" && commitX) {
      if (dx < 0) goNextMonth({ x: dx, y: 0 });
      else goPrevMonth({ x: dx, y: 0 });
      return;
    }
    if (axis === "y" && commitY) {
      if (dy < 0) goNextWeek({ x: 0, y: dy });
      else goPrevWeek({ x: 0, y: dy });
      return;
    }

    if (moved) setTrack(0, 0, true);
    else setTrack(0, 0, false);
    drag.current.dx = 0;
    drag.current.dy = 0;
  }

  const fromCells = weekGrid(slide?.from ?? viewMonday, VISIBLE_WEEKS, merged);
  const toCells = slide ? weekGrid(slide.to, VISIBLE_WEEKS, merged) : null;
  const horizontal = !slide || slide.dir === "left" || slide.dir === "right";
  const showDual = !!slide && !!toCells;

  return (
    <div className="w-full">
      <p className="mb-3 text-center text-[13px] font-medium text-white/70">
        {title.label} <span className="text-white/35">{title.year}</span>
      </p>

      <div className="mb-1.5 flex justify-center">
        <button
          type="button"
          aria-label="Previous week"
          onClick={() => goPrevWeek()}
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
          aria-label="Previous month"
          onClick={() => goPrevMonth()}
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
            ref={viewportRef}
            className="overflow-hidden"
            style={{ height: CAL_GRID_HEIGHT }}
          >
            <div
              ref={trackRef}
              className={
                showDual
                  ? horizontal
                    ? "flex will-change-transform"
                    : "flex flex-col will-change-transform"
                  : "will-change-transform"
              }
              style={
                showDual
                  ? horizontal
                    ? { width: "200%" }
                    : { width: "100%", height: `calc(${CAL_GRID_HEIGHT} * 2)` }
                  : { width: "100%" }
              }
              onTransitionEnd={(e) => {
                if (e.target !== e.currentTarget) return;
                if (e.propertyName !== "transform") return;
                if (slide) finishSlide();
              }}
            >
              {showDual && slide.dir === "right" ? (
                <>
                  <div className={horizontal ? "w-1/2 shrink-0" : "h-1/2 w-full shrink-0"}>
                    <DayGrid cells={toCells!} selected={selected} onSelect={setSelected} drag={drag} />
                  </div>
                  <div className={horizontal ? "w-1/2 shrink-0" : "h-1/2 w-full shrink-0"}>
                    <DayGrid cells={fromCells} selected={null} onSelect={() => {}} drag={drag} />
                  </div>
                </>
              ) : showDual && slide.dir === "down" ? (
                <>
                  <div className="h-1/2 w-full shrink-0">
                    <DayGrid cells={toCells!} selected={selected} onSelect={setSelected} drag={drag} />
                  </div>
                  <div className="h-1/2 w-full shrink-0">
                    <DayGrid cells={fromCells} selected={null} onSelect={() => {}} drag={drag} />
                  </div>
                </>
              ) : showDual ? (
                <>
                  <div className={horizontal ? "w-1/2 shrink-0" : "h-1/2 w-full shrink-0"}>
                    <DayGrid cells={fromCells} selected={null} onSelect={() => {}} drag={drag} />
                  </div>
                  <div className={horizontal ? "w-1/2 shrink-0" : "h-1/2 w-full shrink-0"}>
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
          aria-label="Next month"
          disabled={atMaxFuture}
          onClick={() => goNextMonth()}
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
          aria-label="Next week"
          disabled={atMaxFuture}
          onClick={() => goNextWeek()}
          className="flex h-7 w-7 items-center justify-center rounded-full text-white/45 transition duration-300 ease-out hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-25"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {selected && (
        <div className="mt-3 rounded-[1.25rem] bg-white/[0.04] px-3 py-2.5">
          <p className="text-[11px] text-white/40 tabular-nums">{selected}</p>
          {selectedLabels.length === 0 ? (
            <p className="mt-1 text-[13px] text-white/35">No exercises</p>
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
                    {item.kind === "planned" ? "planned" : "logged"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="mt-2 text-center text-[10px] text-white/25">
        Swipe left/right month · up/down week · white = logged · silver = planned
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
  drag: MutableRefObject<{ dx: number; dy: number; moved?: boolean }>;
}) {
  return (
    <div className="grid h-full grid-cols-7 gap-1.5" style={{ minHeight: CAL_GRID_HEIGHT }}>
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
            className={`flex min-h-[4.75rem] flex-col items-center rounded-[1rem] px-0.5 py-1.5 text-center transition-colors duration-200 ease-out ${
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
