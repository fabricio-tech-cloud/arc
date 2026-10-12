export type HabitIcon = "sport" | "read" | "music" | "water" | "sleep" | "walk" | "dot";

export type HabitRow = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: HabitIcon;
  target_per_week: number;
  created_at?: string;
};

export const HABIT_COLORS = [
  "#c8ced6",
  "#7dd3c0",
  "#ffb454",
  "#8ec5ff",
  "#ff8fab",
  "#b8f27a",
] as const;

export const HABIT_ICONS: HabitIcon[] = [
  "sport",
  "read",
  "music",
  "water",
  "sleep",
  "walk",
  "dot",
];

export function toISODateLocal(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday of the week containing `d`. */
export function startOfWeekMonday(d = new Date()) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(d.getDate() + diff);
  return monday;
}

export function addDaysISO(dateStr: string, n: number) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return toISODateLocal(d);
}

/** Build Mon→Sun × weeks grid ending this week. */
export function heatmapDates(weeks = 20) {
  const thisMon = startOfWeekMonday();
  const start = new Date(thisMon);
  start.setDate(thisMon.getDate() - (weeks - 1) * 7);
  const cols: string[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: string[] = [];
    for (let r = 0; r < 7; r++) {
      const d = new Date(start);
      d.setDate(start.getDate() + w * 7 + r);
      col.push(toISODateLocal(d));
    }
    cols.push(col);
  }
  return cols;
}

export function countThisWeek(dates: Set<string>, today = new Date()) {
  const mon = startOfWeekMonday(today);
  let n = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    if (dates.has(toISODateLocal(d))) n += 1;
  }
  return n;
}

/** Consecutive days ending today (or yesterday if today not logged). */
export function computeStreak(dates: Set<string>, today = new Date()) {
  let cursor = toISODateLocal(today);
  if (!dates.has(cursor)) {
    cursor = addDaysISO(cursor, -1);
    if (!dates.has(cursor)) return 0;
  }
  let streak = 0;
  while (dates.has(cursor)) {
    streak += 1;
    cursor = addDaysISO(cursor, -1);
  }
  return streak;
}

export function parseHabitIcon(raw: unknown): HabitIcon {
  if (typeof raw === "string" && HABIT_ICONS.includes(raw as HabitIcon)) {
    return raw as HabitIcon;
  }
  return "dot";
}
