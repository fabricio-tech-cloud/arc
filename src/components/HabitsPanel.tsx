"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SwipeDeleteRow } from "@/components/SwipeDeleteRow";
import { useIsExtendedViewport } from "@/components/ViewportDensity";
import {
  HABIT_COLORS,
  HABIT_ICONS,
  heatmapDates,
  type HabitIcon,
} from "@/lib/habits";

type HabitCard = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: HabitIcon;
  targetPerWeek: number;
  streak: number;
  weekCount: number;
  doneToday: boolean;
  completedDates: string[];
};

function HabitGlyph({ icon, color }: { icon: HabitIcon; color: string }) {
  const stroke = color;
  const common = {
    viewBox: "0 0 24 24",
    className: "h-4 w-4",
    fill: "none",
    stroke,
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (icon) {
    case "sport":
      return (
        <svg {...common}>
          <path d="M6.5 7.5 4 10l2.5 2.5M17.5 7.5 20 10l-2.5 2.5M8 10h8M9 14l3 5 3-5" />
        </svg>
      );
    case "read":
      return (
        <svg {...common}>
          <path d="M4 5h7a3 3 0 0 1 3 3v11a3 3 0 0 0-3-3H4V5Zm16 0h-7a3 3 0 0 0-3 3v11a3 3 0 0 1 3-3h7V5Z" />
        </svg>
      );
    case "music":
      return (
        <svg {...common}>
          <path d="M9 18V6l10-2v12" />
          <circle cx="7" cy="18" r="2.5" />
          <circle cx="17" cy="16" r="2.5" />
        </svg>
      );
    case "water":
      return (
        <svg {...common}>
          <path d="M12 3s6 7 6 11a6 6 0 1 1-12 0c0-4 6-11 6-11Z" />
        </svg>
      );
    case "sleep":
      return (
        <svg {...common}>
          <path d="M12 4a7 7 0 1 0 8 9.5A7.5 7.5 0 0 1 12 4Z" />
        </svg>
      );
    case "walk":
      return (
        <svg {...common}>
          <circle cx="13" cy="5" r="2" />
          <path d="m8 21 3-7 2 2 3 5M11 14l-2-3 4-3 3 2" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" fill={stroke} stroke="none" />
        </svg>
      );
  }
}

function FlameIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill={color} aria-hidden>
      <path d="M12 2c1.5 3.5-1 5-1 8 0 1.5.8 2.8 2 3.5C11.5 15 10 17 10 19a4 4 0 0 0 8 0c0-4-4-6.5-4-10 0-2.5 1.5-4.5 2.5-6C14.5 4 13 2.5 12 2Z" />
    </svg>
  );
}

function Heatmap({
  completed,
  color,
}: {
  completed: Set<string>;
  color: string;
}) {
  const extended = useIsExtendedViewport();
  const weeks = extended ? 32 : 20;
  const cols = useMemo(() => heatmapDates(weeks), [weeks]);
  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  return (
    <div
      className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:gap-2"
      aria-hidden
    >
      {cols.map((col, ci) => (
        <div key={ci} className="flex shrink-0 flex-col gap-[3px] lg:gap-1">
          {col.map((date) => {
            const on = completed.has(date);
            const future = date > today;
            return (
              <span
                key={date}
                className="h-[9px] w-[9px] rounded-[2px] lg:h-[14px] lg:w-[14px] lg:rounded-[3px]"
                style={{
                  backgroundColor: on
                    ? color
                    : future
                      ? "transparent"
                      : "rgba(255,255,255,0.08)",
                  opacity: on ? 1 : future ? 0 : 1,
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function HabitsPanel() {
  const [habits, setHabits] = useState<HabitCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<string>(HABIT_COLORS[0]);
  const [icon, setIcon] = useState<HabitIcon>("sport");
  const [target, setTarget] = useState(4);
  const [saving, setSaving] = useState(false);
  const [swipeOpenId, setSwipeOpenId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    fetch("/api/habits")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed");
        setHabits(json.habits ?? []);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(habit: HabitCard) {
    if (busyId) return;
    setBusyId(habit.id);
    setError(null);
    // Optimistic
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habit.id) return h;
        const today = new Date();
        const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const nextDone = !h.doneToday;
        const dates = new Set(h.completedDates);
        if (nextDone) dates.add(iso);
        else dates.delete(iso);
        const weekCount = nextDone
          ? Math.min(7, h.weekCount + (h.doneToday ? 0 : 1))
          : Math.max(0, h.weekCount - (h.doneToday ? 1 : 0));
        return {
          ...h,
          doneToday: nextDone,
          completedDates: [...dates].sort(),
          weekCount,
          streak: nextDone ? h.streak + (h.doneToday ? 0 : 1) : Math.max(0, h.streak - 1),
        };
      }),
    );
    try {
      const res = await fetch(`/api/habits/${habit.id}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      load();
    } finally {
      setBusyId(null);
    }
  }

  async function createHabit() {
    if (saving || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          color,
          icon,
          target_per_week: target,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setName("");
      setDescription("");
      setShowAdd(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function removeHabit(id: string) {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/habits/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed");
      setConfirmId(null);
      setSwipeOpenId(null);
      setHabits((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <h2
          className="text-lg font-semibold"
          style={{ fontFamily: '"Times New Roman", Times, serif' }}
        >
          Habits
        </h2>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="text-[12px] text-white/45 hover:text-white/75"
        >
          {showAdd ? "Close" : "+ Add"}
        </button>
      </div>

      {showAdd ? (
        <div className="space-y-3 rounded-[1.75rem] bg-[var(--bg-elevated)] p-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Habit name"
            className="w-full rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description"
            className="w-full rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
          <div className="flex flex-wrap gap-2">
            {HABIT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                className={`h-7 w-7 rounded-[0.65rem] transition ${
                  color === c ? "ring-2 ring-white/50 ring-offset-2 ring-offset-black" : ""
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {HABIT_ICONS.map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => setIcon(ic)}
                className={`flex h-9 w-9 items-center justify-center rounded-[0.85rem] transition ${
                  icon === ic ? "bg-white/12" : "bg-white/[0.04] hover:bg-white/[0.07]"
                }`}
              >
                <HabitGlyph icon={ic} color={color} />
              </button>
            ))}
          </div>
          <label className="flex items-center justify-between gap-3 text-sm text-white/50">
            <span>Per week</span>
            <input
              type="number"
              min={1}
              max={7}
              value={target}
              onChange={(e) => setTarget(Math.min(7, Math.max(1, Number(e.target.value) || 1)))}
              className="w-16 rounded-[1.25rem] border border-[var(--line)] bg-[var(--bg)] px-2 py-1.5 text-center text-sm tabular-nums outline-none focus:border-[var(--accent)]"
            />
          </label>
          <button
            type="button"
            disabled={saving || !name.trim()}
            onClick={createHabit}
            className="arc-chrome w-full rounded-[1.75rem] px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {saving ? "Saving…" : "Create habit"}
          </button>
        </div>
      ) : null}

      {error ? <p className="px-1 text-sm text-[var(--danger)]">{error}</p> : null}

      {habits.length === 0 && !showAdd ? (
        <div className="rounded-[1.75rem] bg-[var(--bg-elevated)] px-4 py-6 text-sm text-[var(--muted)]">
          No habits yet — track daily routines like sleep, walk, or reading.
        </div>
      ) : (
        <ul className="space-y-3">
          {habits.map((habit) => {
            const completed = new Set(habit.completedDates);
            const confirming = confirmId === habit.id;
            return (
              <li key={habit.id} className="overflow-hidden rounded-[1.75rem]">
                <SwipeDeleteRow
                  open={swipeOpenId === habit.id || confirming}
                  onOpenChange={(open) => {
                    if (!open) {
                      setSwipeOpenId(null);
                      setConfirmId(null);
                      return;
                    }
                    setSwipeOpenId(habit.id);
                  }}
                  actionLabel={confirming ? (deleting ? "..." : "Remove") : "Delete"}
                  onDelete={() => {
                    if (confirming) {
                      if (!deleting) void removeHabit(habit.id);
                      return;
                    }
                    setConfirmId(habit.id);
                    setSwipeOpenId(habit.id);
                  }}
                >
                  {confirming ? (
                    <p className="text-sm text-white/70">Remove this habit?</p>
                  ) : (
                    <div>
                      <div className="mb-3 flex items-start gap-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.85rem]"
                          style={{ backgroundColor: `${habit.color}22` }}
                        >
                          <HabitGlyph icon={habit.icon} color={habit.color} />
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <p className="truncate text-[15px] font-semibold text-white">
                            {habit.name}
                          </p>
                          <p className="truncate text-[12px] text-white/40">
                            {habit.description || `${habit.targetPerWeek} / week`}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={busyId === habit.id}
                          onClick={() => toggle(habit)}
                          aria-label={habit.doneToday ? "Undo today" : "Mark done today"}
                          aria-pressed={habit.doneToday}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.85rem] transition disabled:opacity-60"
                          style={{
                            backgroundColor: habit.doneToday
                              ? habit.color
                              : "rgba(255,255,255,0.06)",
                            color: habit.doneToday
                              ? "#0a0a0a"
                              : "rgba(255,255,255,0.35)",
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.4"
                          >
                            <path
                              d="m5 12 5 5L20 7"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      </div>

                      <Heatmap completed={completed} color={habit.color} />

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5 text-[12px] tabular-nums text-white/55">
                          <FlameIcon color={habit.color} />
                          <span>{habit.streak}</span>
                        </div>
                        <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] text-white/50">
                          {habit.weekCount} of {habit.targetPerWeek} this week
                        </span>
                      </div>
                    </div>
                  )}
                </SwipeDeleteRow>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
