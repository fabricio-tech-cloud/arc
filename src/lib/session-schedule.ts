/** ISO weekday helpers + A/B / interval matching for session plans. */

export type WeekMode = "every" | "A" | "B" | "interval";

export type SessionPlanExercise = {
  name: string;
  muscle_group: string | null;
  sets: {
    reps: number | null;
    weight: number | null;
    rir: number | null;
    failure?: boolean;
  }[];
};

export type SessionPlanRow = {
  id: string;
  name: string | null;
  notes: string | null;
  days: number[];
  week_mode: WeekMode;
  interval_weeks: number | null;
  anchor_date: string;
  exercises: SessionPlanExercise[];
};

export function startOfWeekMonday(d: Date) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(d.getDate() + diff);
  return monday;
}

export function toISODateLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isoWeekdayFromDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  const wd = d.getDay();
  return wd === 0 ? 7 : wd;
}

/** Whole weeks between Monday of anchor and Monday of date (can be negative). */
export function weeksSinceAnchor(dateStr: string, anchorStr: string) {
  const dateMon = startOfWeekMonday(new Date(dateStr + "T12:00:00"));
  const anchorMon = startOfWeekMonday(new Date(anchorStr + "T12:00:00"));
  const diffMs = dateMon.getTime() - anchorMon.getTime();
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
}

export function planMatchesDate(
  plan: Pick<SessionPlanRow, "days" | "week_mode" | "interval_weeks" | "anchor_date">,
  dateStr: string,
) {
  const wd = isoWeekdayFromDate(dateStr);
  if (!(plan.days ?? []).includes(wd)) return false;

  const weeks = weeksSinceAnchor(dateStr, plan.anchor_date);
  if (weeks < 0) return false;

  switch (plan.week_mode) {
    case "every":
      return true;
    case "A":
      return weeks % 2 === 0;
    case "B":
      return weeks % 2 === 1;
    case "interval": {
      const n = plan.interval_weeks && plan.interval_weeks >= 2 ? plan.interval_weeks : 2;
      return weeks % n === 0;
    }
    default:
      return true;
  }
}

export function parsePlanExercises(raw: unknown): SessionPlanExercise[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((ex) => ex && typeof ex.name === "string")
    .map((ex) => ({
      name: String(ex.name),
      muscle_group: ex.muscle_group != null ? String(ex.muscle_group) : null,
      sets: Array.isArray(ex.sets)
        ? ex.sets.map((s: Record<string, unknown>) => {
            const failure = Boolean(s.failure);
            const reps =
              s.reps === "" || s.reps == null || !Number.isFinite(Number(s.reps))
                ? null
                : Number(s.reps);
            const weight =
              s.weight === "" || s.weight == null || !Number.isFinite(Number(s.weight))
                ? null
                : Number(s.weight);
            const rir = failure
              ? 0
              : s.rir === "" || s.rir == null || !Number.isFinite(Number(s.rir))
                ? null
                : Number(s.rir);
            return { reps, weight, rir, failure };
          })
        : [],
    }));
}
