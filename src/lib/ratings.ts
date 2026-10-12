/**
 * Rating engine: maps strength lifts and athletic results to a 0–100 score.
 *
 * Strength: est. 1RM (Epley, reps clamped to 12) relative to body weight,
 * compared against 5 tiers (beginner → elite) per lift family.
 * Athletics: raw result compared against 5 tiers per discipline.
 *
 * Tier steps: 20 / 40 / 60 / 80 / 100. Values below tier 1 scale linearly to 0.
 */
import { EXERCISE_CATALOG, TRAINING_GROUPS, resolveMuscleGroup, type MuscleGroupKey } from "@/lib/muscles";

export type Sex = "male" | "female";

export type RadarAxis = "Push" | "Pull" | "Legs" | "Speed" | "Jump" | "Endurance";
export const RADAR_AXES: RadarAxis[] = ["Push", "Pull", "Legs", "Speed", "Jump", "Endurance"];

export type TierKey = "einsteiger" | "anfaenger" | "fortgeschritten" | "stark" | "elite";
export type Tier = { key: TierKey; label: string; min: number };

export const TIERS: Tier[] = [
  { key: "einsteiger", label: "Beginner", min: 0 },
  { key: "anfaenger", label: "Novice", min: 20 },
  { key: "fortgeschritten", label: "Intermediate", min: 40 },
  { key: "stark", label: "Advanced", min: 60 },
  { key: "elite", label: "Elite", min: 80 },
];

export function tierFor(rating: number): Tier {
  let current = TIERS[0]!;
  for (const t of TIERS) if (rating >= t.min) current = t;
  return current;
}

const STEPS = [20, 40, 60, 80, 100];
type Standards = [number, number, number, number, number];

function clampRating(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Higher value = better (weights, jumps, reps, distances). */
export function rateHigherBetter(value: number, s: Standards): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value < s[0]) return clampRating((value / s[0]) * STEPS[0]!);
  for (let i = 0; i < 4; i++) {
    const lo = s[i]!;
    const hi = s[i + 1]!;
    if (value <= hi) {
      return clampRating(STEPS[i]! + ((value - lo) / (hi - lo)) * 20);
    }
  }
  return 100;
}

/** Lower value = better (times). Standards descending. */
export function rateLowerBetter(value: number, s: Standards): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value > s[0]) {
    // 0 at 1.5× the beginner standard
    const over = (value - s[0]) / (s[0] * 0.5);
    return clampRating(STEPS[0]! * Math.max(0, 1 - over));
  }
  for (let i = 0; i < 4; i++) {
    const lo = s[i]!; // slower
    const hi = s[i + 1]!; // faster
    if (value >= hi) {
      return clampRating(STEPS[i]! + ((lo - value) / (lo - hi)) * 20);
    }
  }
  return 100;
}

/* ------------------------------------------------------------------ */
/* Strength                                                             */
/* ------------------------------------------------------------------ */

/** Epley, reps clamped to 1–12 to avoid runaway estimates. */
export function estimate1RM(weight: number, reps: number) {
  if (!Number.isFinite(weight) || weight <= 0) return 0;
  const r = Math.max(1, Math.min(12, Math.round(reps || 1)));
  if (r === 1) return weight;
  return weight * (1 + r / 30);
}

type LoadMode =
  | "load" // barbell / machine load
  | "per_hand" // dumbbell per hand
  | "added"; // bodyweight movement with added load (pull-up, dip)

type LiftFamily = {
  key: string;
  label: string;
  pattern: RegExp;
  exclude?: RegExp;
  mode: LoadMode;
  /** 1RM / bodyweight ratios for tiers 1–5 (male). */
  ratios: Standards;
  axis: RadarAxis;
};

/**
 * Ordered by specificity. Ratios approximate widely used strength standards
 * (male, 1RM relative to body weight). Female standards are scaled below.
 */
export const LIFT_FAMILIES: LiftFamily[] = [
  { key: "deadlift", label: "Deadlift", pattern: /deadlift/i, exclude: /romanian|stiff|rdl|single-leg/i, mode: "load", ratios: [1.0, 1.5, 2.0, 2.5, 3.0], axis: "Legs" },
  { key: "rdl", label: "Romanian Deadlift", pattern: /romanian|stiff|rdl/i, mode: "load", ratios: [0.75, 1.1, 1.5, 1.9, 2.3], axis: "Legs" },
  { key: "front_squat", label: "Front Squat", pattern: /front squat/i, mode: "load", ratios: [0.6, 1.0, 1.4, 1.8, 2.2], axis: "Legs" },
  { key: "squat", label: "Back Squat", pattern: /squat/i, exclude: /hack|split|bulgarian|goblet|pistol|sissy|belt|jump/i, mode: "load", ratios: [0.75, 1.25, 1.75, 2.25, 2.75], axis: "Legs" },
  { key: "hack_legpress", label: "Hack Squat / Leg Press", pattern: /hack squat|leg press/i, mode: "load", ratios: [1.0, 1.75, 2.5, 3.25, 4.0], axis: "Legs" },
  { key: "hip_thrust", label: "Hip Thrust", pattern: /hip thrust|glute bridge/i, mode: "load", ratios: [1.0, 1.5, 2.25, 3.0, 3.75], axis: "Legs" },
  { key: "lunge", label: "Lunge / Split Squat", pattern: /lunge|split squat|bulgarian|step-up/i, mode: "load", ratios: [0.4, 0.65, 0.9, 1.2, 1.5], axis: "Legs" },
  { key: "leg_iso", label: "Leg Extension / Curl", pattern: /leg extension|leg curl/i, mode: "load", ratios: [0.5, 0.8, 1.1, 1.4, 1.7], axis: "Legs" },
  { key: "calf", label: "Calf Raise", pattern: /calf/i, mode: "load", ratios: [1.0, 1.5, 2.0, 2.5, 3.0], axis: "Legs" },

  { key: "incline_bench", label: "Incline Bench", pattern: /incline.*(bench|barbell|smith|press)/i, exclude: /dumbbell|cable/i, mode: "load", ratios: [0.45, 0.75, 1.1, 1.45, 1.8], axis: "Push" },
  { key: "decline_bench", label: "Decline Bench", pattern: /decline.*(bench|barbell|smith|press)/i, exclude: /dumbbell|cable/i, mode: "load", ratios: [0.55, 0.9, 1.3, 1.7, 2.05], axis: "Push" },
  { key: "close_grip", label: "Close-Grip Bench", pattern: /close-grip/i, mode: "load", ratios: [0.45, 0.8, 1.15, 1.5, 1.85], axis: "Push" },
  { key: "db_press", label: "Dumbbell Press", pattern: /dumbbell.*(press|bench)|flat dumbbell/i, exclude: /shoulder|overhead|arnold/i, mode: "per_hand", ratios: [0.2, 0.35, 0.5, 0.65, 0.8], axis: "Push" },
  { key: "bench", label: "Bench Press", pattern: /bench press|floor press|pin press|board press|spoto|smith machine bench|chest press/i, mode: "load", ratios: [0.5, 0.85, 1.25, 1.65, 2.0], axis: "Push" },
  { key: "dips", label: "Weighted Dips", pattern: /dip/i, mode: "added", ratios: [1.0, 1.2, 1.45, 1.7, 2.0], axis: "Push" },
  { key: "flyes", label: "Flyes / Pec Deck", pattern: /fly|pec deck|crossover/i, mode: "load", ratios: [0.3, 0.45, 0.6, 0.8, 1.0], axis: "Push" },

  { key: "ohp_db", label: "Dumbbell Shoulder Press", pattern: /dumbbell.*(shoulder|overhead|press)|arnold/i, mode: "per_hand", ratios: [0.15, 0.25, 0.35, 0.45, 0.55], axis: "Push" },
  { key: "ohp", label: "Overhead Press", pattern: /overhead press|military|ohp|shoulder press|standing press|push press|strict press/i, mode: "load", ratios: [0.35, 0.55, 0.8, 1.05, 1.3], axis: "Push" },
  { key: "lateral_raise", label: "Lateral Raise", pattern: /lateral raise|side raise/i, mode: "per_hand", ratios: [0.06, 0.1, 0.15, 0.2, 0.26], axis: "Push" },
  { key: "rear_delt", label: "Rear Delt / Face Pull", pattern: /face pull|rear delt|reverse fly/i, mode: "load", ratios: [0.25, 0.4, 0.55, 0.7, 0.85], axis: "Pull" },
  { key: "shrug", label: "Shrug", pattern: /shrug/i, mode: "load", ratios: [0.75, 1.1, 1.5, 1.9, 2.3], axis: "Pull" },

  { key: "pullup", label: "Weighted Pull-Up", pattern: /pull-up|pullup|chin-up|chinup/i, mode: "added", ratios: [1.0, 1.15, 1.35, 1.6, 1.85], axis: "Pull" },
  { key: "bb_row", label: "Barbell Row", pattern: /barbell row|bent-over row|pendlay|t-bar/i, mode: "load", ratios: [0.5, 0.75, 1.05, 1.35, 1.65], axis: "Pull" },
  { key: "pulldown", label: "Lat Pulldown", pattern: /pulldown|pull-down/i, mode: "load", ratios: [0.5, 0.75, 1.0, 1.3, 1.6], axis: "Pull" },
  { key: "row", label: "Row", pattern: /row/i, exclude: /dumbbell/i, mode: "load", ratios: [0.5, 0.8, 1.1, 1.4, 1.7], axis: "Pull" },
  { key: "db_row", label: "Dumbbell Row", pattern: /dumbbell.*row/i, mode: "per_hand", ratios: [0.25, 0.4, 0.55, 0.7, 0.85], axis: "Pull" },

  { key: "bb_curl", label: "Barbell Curl", pattern: /barbell curl|ez.*curl|ez-bar/i, mode: "load", ratios: [0.25, 0.4, 0.55, 0.7, 0.85], axis: "Pull" },
  { key: "db_curl", label: "Dumbbell Curl", pattern: /curl/i, exclude: /leg|cable|machine|preacher/i, mode: "per_hand", ratios: [0.1, 0.17, 0.25, 0.33, 0.42], axis: "Pull" },
  { key: "curl_machine", label: "Cable / Machine Curl", pattern: /curl/i, mode: "load", ratios: [0.25, 0.4, 0.55, 0.7, 0.85], axis: "Pull" },
  { key: "triceps", label: "Triceps", pattern: /skull|triceps|pushdown|french press|kickback/i, mode: "load", ratios: [0.3, 0.45, 0.6, 0.8, 1.0], axis: "Push" },
];

const GROUP_FALLBACK: Record<MuscleGroupKey, { ratios: Standards; axis: RadarAxis }> = {
  Legs: { ratios: [0.6, 1.0, 1.4, 1.8, 2.2], axis: "Legs" },
  Chest: { ratios: [0.4, 0.65, 0.95, 1.25, 1.55], axis: "Push" },
  Shoulders: { ratios: [0.25, 0.4, 0.6, 0.8, 1.0], axis: "Push" },
  Back: { ratios: [0.4, 0.65, 0.95, 1.25, 1.55], axis: "Pull" },
  Arms: { ratios: [0.2, 0.35, 0.5, 0.65, 0.8], axis: "Push" },
  Abdominals: { ratios: [0.3, 0.5, 0.7, 0.9, 1.1], axis: "Endurance" },
  Field: { ratios: [0.4, 0.65, 0.95, 1.25, 1.55], axis: "Speed" },
};

export function groupForExerciseName(name: string): MuscleGroupKey | null {
  const key = name.trim().toLowerCase();
  for (const g of TRAINING_GROUPS) {
    if (EXERCISE_CATALOG[g].some((e) => e.name.toLowerCase() === key)) return g;
  }
  return null;
}

export function liftFamilyFor(exerciseName: string, muscleGroup?: string | null): LiftFamily {
  for (const fam of LIFT_FAMILIES) {
    if (!fam.pattern.test(exerciseName)) continue;
    if (fam.exclude && fam.exclude.test(exerciseName)) continue;
    return fam;
  }
  const group = resolveMuscleGroup(muscleGroup) ?? groupForExerciseName(exerciseName) ?? "Chest";
  const fb = GROUP_FALLBACK[group];
  return {
    key: `group_${group.toLowerCase()}`,
    label: group,
    pattern: /.*/,
    mode: "load",
    ratios: fb.ratios,
    axis: fb.axis,
  };
}

function femaleRatios(fam: LiftFamily): Standards {
  if (fam.mode === "added") {
    // ratio is (BW + load) / BW → scale only the added part
    return fam.ratios.map((r) => 1 + (r - 1) * 0.6) as Standards;
  }
  const lower = fam.axis === "Legs" ? 0.78 : 0.7;
  return fam.ratios.map((r) => r * lower) as Standards;
}

export type StrengthRating = {
  est1rm: number;
  ratio: number;
  rating: number;
  tier: Tier;
  family: string;
  axis: RadarAxis;
  mode: LoadMode;
};

export function rateStrength(input: {
  exerciseName: string;
  muscleGroup?: string | null;
  weight: number;
  reps: number;
  bodyWeight: number;
  sex: Sex;
}): StrengthRating {
  const fam = liftFamilyFor(input.exerciseName, input.muscleGroup);
  const bw = input.bodyWeight > 0 ? input.bodyWeight : 80;
  const standards = input.sex === "female" ? femaleRatios(fam) : fam.ratios;

  let est1rm: number;
  let ratio: number;
  if (fam.mode === "added") {
    // weight = added load; 1RM estimated on total load (BW + added)
    const total1rm = estimate1RM(bw + input.weight, input.reps);
    est1rm = Math.max(0, total1rm - bw);
    ratio = total1rm / bw;
  } else {
    est1rm = estimate1RM(input.weight, input.reps);
    ratio = est1rm / bw;
  }

  const rating = rateHigherBetter(ratio, standards);
  return {
    est1rm: Math.round(est1rm * 10) / 10,
    ratio: Math.round(ratio * 100) / 100,
    rating,
    tier: tierFor(rating),
    family: fam.label,
    axis: fam.axis,
    mode: fam.mode,
  };
}

/* ------------------------------------------------------------------ */
/* Athletics                                                            */
/* ------------------------------------------------------------------ */

export type AthleticUnit = "s" | "cm" | "m" | "reps" | "level";

export type AthleticDiscipline = {
  key: string;
  label: string;
  category: "Sprint" | "Run" | "Jump" | "Agility" | "Calisthenics" | "Endurance";
  unit: AthleticUnit;
  better: "lower" | "higher";
  axis: RadarAxis;
  /** Male standards tiers 1–5. */
  standards: Standards;
  /** Multiplier applied to standards for female athletes. */
  femaleFactor: number;
  input: "time" | "number";
  hint?: string;
};

export const ATHLETIC_DISCIPLINES: AthleticDiscipline[] = [
  // Sprint (seconds, lower better)
  { key: "sprint_40yd", label: "40-yard dash", category: "Sprint", unit: "s", better: "lower", axis: "Speed", standards: [6.0, 5.5, 5.0, 4.6, 4.3], femaleFactor: 1.12, input: "time", hint: "e.g. 4.85" },
  { key: "sprint_60m", label: "60 m Sprint", category: "Sprint", unit: "s", better: "lower", axis: "Speed", standards: [10.5, 9.4, 8.4, 7.6, 6.9], femaleFactor: 1.12, input: "time" },
  { key: "sprint_100m", label: "100 m Sprint", category: "Sprint", unit: "s", better: "lower", axis: "Speed", standards: [16.0, 14.0, 12.5, 11.3, 10.3], femaleFactor: 1.12, input: "time", hint: "e.g. 12.4" },
  { key: "sprint_200m", label: "200 m Sprint", category: "Sprint", unit: "s", better: "lower", axis: "Speed", standards: [34, 30, 26, 23.2, 21.0], femaleFactor: 1.12, input: "time" },
  { key: "sprint_400m", label: "400 m", category: "Sprint", unit: "s", better: "lower", axis: "Speed", standards: [80, 70, 60, 52.5, 47.0], femaleFactor: 1.12, input: "time", hint: "e.g. 1:02.5" },

  // Runs (seconds, lower better)
  { key: "run_800m", label: "800 m", category: "Run", unit: "s", better: "lower", axis: "Endurance", standards: [210, 180, 150, 128, 112], femaleFactor: 1.12, input: "time", hint: "mm:ss" },
  { key: "run_1500m", label: "1500 m", category: "Run", unit: "s", better: "lower", axis: "Endurance", standards: [450, 390, 330, 280, 235], femaleFactor: 1.12, input: "time", hint: "mm:ss" },
  { key: "run_1mile", label: "1 mile", category: "Run", unit: "s", better: "lower", axis: "Endurance", standards: [480, 420, 360, 300, 255], femaleFactor: 1.12, input: "time", hint: "mm:ss" },
  { key: "run_3000m", label: "3000 m", category: "Run", unit: "s", better: "lower", axis: "Endurance", standards: [960, 840, 720, 620, 530], femaleFactor: 1.12, input: "time", hint: "mm:ss" },
  { key: "run_5k", label: "5 km", category: "Run", unit: "s", better: "lower", axis: "Endurance", standards: [2100, 1800, 1500, 1230, 960], femaleFactor: 1.12, input: "time", hint: "mm:ss" },
  { key: "run_10k", label: "10 km", category: "Run", unit: "s", better: "lower", axis: "Endurance", standards: [4200, 3600, 3000, 2550, 2000], femaleFactor: 1.12, input: "time", hint: "h:mm:ss or mm:ss" },
  { key: "cooper_12min", label: "Cooper test (12 min)", category: "Endurance", unit: "m", better: "higher", axis: "Endurance", standards: [1800, 2200, 2600, 3000, 3400], femaleFactor: 0.85, input: "number", hint: "meters" },
  { key: "beep_test", label: "Beep-Test", category: "Endurance", unit: "level", better: "higher", axis: "Endurance", standards: [7, 9, 11, 13, 15], femaleFactor: 0.85, input: "number", hint: "Level" },
  { key: "row_2k", label: "Row 2000 m", category: "Endurance", unit: "s", better: "lower", axis: "Endurance", standards: [540, 480, 430, 400, 370], femaleFactor: 1.12, input: "time", hint: "mm:ss" },
  { key: "swim_100m", label: "Swim 100 m", category: "Endurance", unit: "s", better: "lower", axis: "Endurance", standards: [150, 120, 95, 75, 60], femaleFactor: 1.1, input: "time", hint: "mm:ss" },

  // Jumps (cm, higher better)
  { key: "vertical_jump", label: "Vertical Jump", category: "Jump", unit: "cm", better: "higher", axis: "Jump", standards: [35, 45, 55, 65, 80], femaleFactor: 0.8, input: "number", hint: "cm" },
  { key: "broad_jump", label: "Standing long jump", category: "Jump", unit: "cm", better: "higher", axis: "Jump", standards: [180, 210, 240, 270, 310], femaleFactor: 0.8, input: "number", hint: "cm" },
  { key: "box_jump", label: "Box jump (max height)", category: "Jump", unit: "cm", better: "higher", axis: "Jump", standards: [50, 70, 90, 110, 130], femaleFactor: 0.8, input: "number", hint: "cm" },

  // Agility (seconds, lower better)
  { key: "pro_agility", label: "5-10-5 Pro Agility", category: "Agility", unit: "s", better: "lower", axis: "Speed", standards: [5.6, 5.2, 4.8, 4.5, 4.2], femaleFactor: 1.1, input: "time" },
  { key: "t_test", label: "T-Test", category: "Agility", unit: "s", better: "lower", axis: "Speed", standards: [12.5, 11.5, 10.5, 9.8, 9.0], femaleFactor: 1.1, input: "time" },

  // Calisthenics (reps / hold)
  { key: "pullups_max", label: "Pull-ups (max)", category: "Calisthenics", unit: "reps", better: "higher", axis: "Pull", standards: [3, 8, 14, 20, 28], femaleFactor: 0.5, input: "number" },
  { key: "pushups_max", label: "Push-ups (max)", category: "Calisthenics", unit: "reps", better: "higher", axis: "Push", standards: [15, 30, 45, 60, 80], femaleFactor: 0.65, input: "number" },
  { key: "dips_max", label: "Dips (max)", category: "Calisthenics", unit: "reps", better: "higher", axis: "Push", standards: [5, 12, 20, 30, 40], femaleFactor: 0.6, input: "number" },
  { key: "plank_hold", label: "Plank Hold", category: "Calisthenics", unit: "s", better: "higher", axis: "Endurance", standards: [60, 120, 180, 240, 360], femaleFactor: 0.9, input: "time", hint: "mm:ss" },
  { key: "dead_hang", label: "Dead Hang", category: "Calisthenics", unit: "s", better: "higher", axis: "Pull", standards: [30, 60, 90, 120, 180], femaleFactor: 0.85, input: "time", hint: "mm:ss" },
];

export const ATHLETIC_BY_KEY: Record<string, AthleticDiscipline> = Object.fromEntries(
  ATHLETIC_DISCIPLINES.map((d) => [d.key, d]),
);

export type AthleticRating = {
  rating: number;
  tier: Tier;
  axis: RadarAxis;
};

export function rateAthletic(disciplineKey: string, value: number, sex: Sex): AthleticRating | null {
  const d = ATHLETIC_BY_KEY[disciplineKey];
  if (!d) return null;
  const standards =
    sex === "female" ? (d.standards.map((s) => s * d.femaleFactor) as Standards) : d.standards;
  const rating =
    d.better === "lower" ? rateLowerBetter(value, standards) : rateHigherBetter(value, standards);
  return { rating, tier: tierFor(rating), axis: d.axis };
}

/* ------------------------------------------------------------------ */
/* API payload shapes (shared by /api/ratings and the UI)              */
/* ------------------------------------------------------------------ */

export type StrengthEntry = {
  key: string;
  exerciseName: string;
  muscleGroup: string | null;
  weight: number;
  reps: number;
  est1rm: number;
  ratio: number;
  rating: number;
  tier: string;
  family: string;
  axis: RadarAxis;
  mode: LoadMode;
  source: "record" | "log";
  recordId: string | null;
  recordedAt: string | null;
};

export type AthleticEntry = {
  key: string;
  label: string;
  category: AthleticDiscipline["category"];
  value: number;
  formatted: string;
  unit: AthleticUnit;
  rating: number;
  tier: string;
  axis: RadarAxis;
  recordId: string;
  recordedAt: string;
  history: { id: string; value: number; formatted: string; recordedAt: string; rating: number }[];
};

/* ------------------------------------------------------------------ */
/* Radar aggregation                                                    */
/* ------------------------------------------------------------------ */

export type RadarPoint = { axis: RadarAxis; value: number; count: number };

/** Axis score = mean of the top 3 ratings mapped to that axis. */
export function aggregateRadar(items: { axis: RadarAxis; rating: number }[]): {
  axes: RadarPoint[];
  overall: number;
  populated: number;
} {
  const byAxis = new Map<RadarAxis, number[]>();
  for (const it of items) {
    const list = byAxis.get(it.axis) ?? [];
    list.push(it.rating);
    byAxis.set(it.axis, list);
  }
  const axes: RadarPoint[] = RADAR_AXES.map((axis) => {
    const list = (byAxis.get(axis) ?? []).sort((a, b) => b - a).slice(0, 3);
    const value = list.length ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : 0;
    return { axis, value, count: byAxis.get(axis)?.length ?? 0 };
  });
  const populated = axes.filter((a) => a.count > 0);
  const overall = populated.length
    ? Math.round(populated.reduce((a, b) => a + b.value, 0) / populated.length)
    : 0;
  return { axes, overall, populated: populated.length };
}

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                   */
/* ------------------------------------------------------------------ */

/** Accepts "12.4", "1:02.5", "45:30", "1:05:00" → seconds. */
export function parseTimeInput(raw: string): number | null {
  const s = raw.trim().replace(",", ".");
  if (!s) return null;
  if (!s.includes(":")) {
    const n = Number(s);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  const parts = s.split(":").map((p) => Number(p));
  if (parts.some((p) => !Number.isFinite(p) || p < 0)) return null;
  let total = 0;
  for (const p of parts) total = total * 60 + p;
  return total > 0 ? total : null;
}

export function formatSeconds(sec: number): string {
  if (!Number.isFinite(sec)) return "—";
  if (sec < 60) return `${(Math.round(sec * 100) / 100).toString().replace(".", ",")} s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const sStr = s < 10 ? `0${s.toFixed(s % 1 ? 1 : 0)}` : s.toFixed(s % 1 ? 1 : 0);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${sStr}`;
  return `${m}:${sStr}`;
}

export function formatAthleticValue(d: AthleticDiscipline, value: number): string {
  if (d.unit === "s") return formatSeconds(value);
  const n = Math.round(value * 10) / 10;
  const num = n.toLocaleString("en-US");
  switch (d.unit) {
    case "cm":
      return `${num} cm`;
    case "m":
      return `${num} m`;
    case "reps":
      return `${num} Wdh.`;
    case "level":
      return `Level ${num}`;
  }
}
