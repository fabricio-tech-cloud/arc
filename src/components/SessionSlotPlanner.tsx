"use client";

import { useMemo, useState } from "react";
import {
  EXERCISE_CATALOG,
  GROUP_LABELS,
  TRAINING_GROUPS,
  type MuscleGroupKey,
} from "@/lib/muscles";
import {
  SLOT_DEFAULT_TIME,
  slotLabel,
  type SessionSlot,
} from "@/lib/session-schedule";
import { WeekdayToggle } from "@/components/WeekdayToggle";
import { todayIsoWeekday } from "@/lib/supplements";

type DraftExercise = {
  name: string;
  muscleGroup: MuscleGroupKey;
};

function resolveGroupFromName(name: string): MuscleGroupKey | null {
  const n = name.trim().toLowerCase();
  if (!n) return null;
  for (const g of TRAINING_GROUPS) {
    if (EXERCISE_CATALOG[g].some((e) => e.name.toLowerCase() === n)) return g;
  }
  for (const g of TRAINING_GROUPS) {
    if (
      EXERCISE_CATALOG[g].some(
        (e) => e.name.toLowerCase().includes(n) || n.includes(e.name.toLowerCase()),
      )
    ) {
      return g;
    }
  }
  return null;
}

const SLOT_BAR: Record<SessionSlot, string> = {
  morning: "bg-[var(--accent)]",
  noon: "bg-[var(--warn)]",
};

export function SessionSlotPlanner({
  onSaved,
}: {
  onSaved?: () => void;
}) {
  const [days, setDays] = useState<number[]>(() => [todayIsoWeekday()]);
  const [morning, setMorning] = useState<DraftExercise[]>([]);
  const [noon, setNoon] = useState<DraftExercise[]>([]);
  const [draftSlot, setDraftSlot] = useState<SessionSlot>("morning");
  const [draftName, setDraftName] = useState("");
  const [draftGroup, setDraftGroup] = useState<MuscleGroupKey>("Chest");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const suggestions = useMemo(() => {
    const q = draftName.trim().toLowerCase();
    if (q.length < 2) return [] as string[];
    const out: string[] = [];
    for (const g of TRAINING_GROUPS) {
      for (const e of EXERCISE_CATALOG[g]) {
        if (e.name.toLowerCase().includes(q) && !out.includes(e.name)) {
          out.push(e.name);
          if (out.length >= 6) return out;
        }
      }
    }
    return out;
  }, [draftName]);

  function toggleDay(day: number) {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b),
    );
  }

  function addExercise(nameOverride?: string, groupOverride?: MuscleGroupKey) {
    const name = (nameOverride ?? draftName).trim();
    if (!name) return;
    const muscleGroup =
      groupOverride ?? resolveGroupFromName(name) ?? draftGroup;
    const target = draftSlot === "morning" ? morning : noon;
    if (target.some((e) => e.name.toLowerCase() === name.toLowerCase())) {
      setDraftName("");
      return;
    }
    const next = [...target, { name, muscleGroup }];
    if (draftSlot === "morning") setMorning(next);
    else setNoon(next);
    setDraftName("");
    setDraftGroup(muscleGroup);
    setOk(null);
    setError(null);
  }

  function removeExercise(slot: SessionSlot, name: string) {
    if (slot === "morning") {
      setMorning((prev) => prev.filter((e) => e.name !== name));
    } else {
      setNoon((prev) => prev.filter((e) => e.name !== name));
    }
  }

  async function save() {
    if (busy) return;
    if (days.length === 0) {
      setError("Pick at least one weekday");
      return;
    }
    if (morning.length === 0 && noon.length === 0) {
      setError("Add at least one exercise to Morning or Noon");
      return;
    }

    setBusy(true);
    setError(null);
    setOk(null);

    const payloads: { slot: SessionSlot; exercises: DraftExercise[] }[] = [];
    if (morning.length) payloads.push({ slot: "morning", exercises: morning });
    if (noon.length) payloads.push({ slot: "noon", exercises: noon });

    try {
      for (const payload of payloads) {
        const res = await fetch("/api/session-plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: null,
            notes: null,
            days,
            week_mode: "every",
            interval_weeks: null,
            time_of_day: SLOT_DEFAULT_TIME[payload.slot],
            exercises: payload.exercises.map((ex) => ({
              name: ex.name,
              muscle_group: ex.muscleGroup,
              sets: [{ reps: "", weight: "", rir: "", failure: false }],
            })),
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to save");
      }
      setMorning([]);
      setNoon([]);
      setOk(
        payloads.length === 2
          ? "Morning + Noon sessions saved"
          : `${slotLabel(payloads[0]!.slot)} saved`,
      );
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const slots: { key: SessionSlot; items: DraftExercise[] }[] = [
    { key: "morning", items: morning },
    { key: "noon", items: noon },
  ];

  return (
    <div className="rounded-[1.75rem] bg-[var(--bg-elevated)] p-4">
      <div className="mb-4">
        <p className="text-[15px] font-medium text-white">Plan sessions</p>
        <p className="mt-0.5 text-[12px] text-white/40">
          Organize exercises for morning and noon by weekday.
        </p>
      </div>

      <div className="mb-4">
        <p className="mb-2 text-[12px] text-white/45">Weekdays</p>
        <WeekdayToggle days={days} onToggle={toggleDay} />
      </div>

      <div className="mb-4 space-y-4">
        {slots.map((slot) => (
          <section key={slot.key}>
            <button
              type="button"
              onClick={() => setDraftSlot(slot.key)}
              className={`mb-2 flex w-full items-baseline justify-between gap-2 text-left ${
                draftSlot === slot.key ? "opacity-100" : "opacity-70"
              }`}
            >
              <p className="text-[12px] font-medium tracking-wide text-white/55 uppercase">
                {slotLabel(slot.key)}
              </p>
              <span className="text-[11px] tabular-nums text-white/35">
                {SLOT_DEFAULT_TIME[slot.key]}
                {draftSlot === slot.key ? " · editing" : ""}
              </span>
            </button>

            <div className="flex min-h-[4.5rem] gap-3">
              <span
                aria-hidden
                className={`w-[3px] shrink-0 self-stretch rounded-full ${SLOT_BAR[slot.key]} ${
                  slot.items.length === 0 ? "opacity-25" : "opacity-85"
                }`}
              />
              <div className="min-w-0 flex-1 space-y-1.5">
                {slot.items.length === 0 ? (
                  <p className="text-[13px] text-white/30">Open — add exercises below</p>
                ) : (
                  slot.items.map((ex) => (
                    <div
                      key={ex.name}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] text-white/80">{ex.name}</p>
                        <p className="text-[11px] text-white/35">
                          {GROUP_LABELS[ex.muscleGroup]}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeExercise(slot.key, ex.name)}
                        className="shrink-0 text-[12px] text-white/35 hover:text-[var(--danger)]"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        ))}
      </div>

      <div className="space-y-3 border-t border-white/8 pt-4">
        <div className="flex items-center gap-4">
          {(["morning", "noon"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setDraftSlot(s)}
              aria-pressed={draftSlot === s}
              className={`relative pb-1 text-[12px] tracking-wide transition ${
                draftSlot === s
                  ? "text-white"
                  : "text-white/35 hover:text-white/60"
              }`}
            >
              {s === "morning" ? "Morning" : "Noon"}
              <span
                aria-hidden
                className={`absolute inset-x-0 -bottom-0.5 h-px rounded-full transition ${
                  draftSlot === s
                    ? s === "morning"
                      ? "bg-[var(--accent)]"
                      : "bg-[var(--warn)]"
                    : "bg-transparent"
                }`}
              />
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {TRAINING_GROUPS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setDraftGroup(g)}
              aria-pressed={draftGroup === g}
              className={`rounded-full px-2.5 py-1 text-[11px] transition ${
                draftGroup === g
                  ? "bg-white/14 text-white"
                  : "bg-white/[0.04] text-white/40 hover:text-white/70"
              }`}
            >
              {GROUP_LABELS[g]}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={draftName}
            onChange={(e) => {
              setDraftName(e.target.value);
              const g = resolveGroupFromName(e.target.value);
              if (g) setDraftGroup(g);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addExercise();
              }
            }}
            placeholder="Exercise name…"
            className="min-w-0 flex-1 rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
          <button
            type="button"
            onClick={() => addExercise()}
            className="shrink-0 rounded-[1.75rem] border border-[var(--line)] px-4 py-2 text-sm text-white/70 hover:bg-white/6 hover:text-white"
          >
            Add
          </button>
        </div>

        {suggestions.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {suggestions.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  const g = resolveGroupFromName(name) ?? draftGroup;
                  addExercise(name, g);
                }}
                className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] text-white/55 hover:bg-white/10 hover:text-white/80"
              >
                {name}
              </button>
            ))}
          </ul>
        ) : null}

        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        {ok ? <p className="text-sm text-[var(--accent)]">{ok}</p> : null}

        <button
          type="button"
          onClick={save}
          disabled={busy || (morning.length === 0 && noon.length === 0)}
          className="arc-chrome w-full rounded-[1.75rem] px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save session plans"}
        </button>
      </div>
    </div>
  );
}
