import type { BodyState } from "body-muscles";

export type MuscleGroupKey =
  | "Shoulders"
  | "Arms"
  | "Chest"
  | "Back"
  | "Abdominals"
  | "Legs";

export const TRAINING_GROUPS: MuscleGroupKey[] = [
  "Chest",
  "Shoulders",
  "Arms",
  "Back",
  "Abdominals",
  "Legs",
];

export const GROUP_LABELS: Record<MuscleGroupKey, string> = {
  Chest: "Brust",
  Shoulders: "Schultern",
  Arms: "Arme",
  Back: "Rücken",
  Abdominals: "Bauch",
  Legs: "Beine",
};

export const GROUP_SLUGS: Record<MuscleGroupKey, string> = {
  Chest: "brust",
  Shoulders: "schultern",
  Arms: "arme",
  Back: "ruecken",
  Abdominals: "bauch",
  Legs: "beine",
};

export function groupPath(group: MuscleGroupKey) {
  return `/workouts/groups/${GROUP_SLUGS[group]}`;
}

export function parseGroupParam(raw: string | null | undefined): MuscleGroupKey | null {
  if (!raw) return null;
  const slug = decodeURIComponent(raw).trim().toLowerCase();
  if (!slug) return null;
  const fromSlug = TRAINING_GROUPS.find((g) => GROUP_SLUGS[g] === slug);
  if (fromSlug) return fromSlug;
  return resolveMuscleGroup(slug);
}

/** Short tags for week strip / today preview */
export const GROUP_ABBR: Record<MuscleGroupKey, string> = {
  Chest: "Br",
  Shoulders: "Sch",
  Arms: "Ar",
  Back: "Rü",
  Abdominals: "Ba",
  Legs: "Be",
};

export const GROUP_VIEW: Record<MuscleGroupKey, "FRONT" | "BACK"> = {
  Chest: "FRONT",
  Shoulders: "FRONT",
  Arms: "FRONT",
  Back: "BACK",
  Abdominals: "FRONT",
  Legs: "FRONT",
};

/** IDs mirrored from body-muscles MUSCLE_GROUPS (avoids static CJS/ESM issues). */
export const GROUP_MUSCLE_IDS: Record<MuscleGroupKey, string[]> = {
  Shoulders: [
    "shoulder-front-left",
    "shoulder-front-right",
    "shoulder-side-left",
    "shoulder-side-right",
    "deltoid-rear-left",
    "deltoid-rear-right",
    "traps-upper-left",
    "traps-mid-left",
    "traps-lower-left",
    "traps-upper-right",
    "traps-mid-right",
    "traps-lower-right",
  ],
  Arms: [
    "biceps-left",
    "biceps-right",
    "triceps-long-left",
    "triceps-lateral-left",
    "triceps-long-right",
    "triceps-lateral-right",
    "forearm-left",
    "forearm-right",
    "forearm-flexors-left",
    "forearm-extensors-left",
    "forearm-flexors-right",
    "forearm-extensors-right",
    "elbow-left",
    "elbow-right",
  ],
  Chest: ["chest-upper-left", "chest-upper-right", "chest-lower-left", "chest-lower-right"],
  Back: [
    "lats-upper-left",
    "lats-mid-left",
    "lats-lower-left",
    "lats-upper-right",
    "lats-mid-right",
    "lats-lower-right",
    "lower-back-erectors-left",
    "lower-back-ql-left",
    "lower-back-erectors-right",
    "lower-back-ql-right",
    "spine",
    "gluteus-medius-left",
    "gluteus-maximus-left",
    "gluteus-medius-right",
    "gluteus-maximus-right",
  ],
  Abdominals: [
    "abs-upper-left",
    "abs-upper-right",
    "abs-lower-left",
    "abs-lower-right",
    "serratus-anterior-left",
    "serratus-anterior-right",
    "obliques-left",
    "obliques-right",
  ],
  Legs: [
    "quads-left",
    "quads-right",
    "hamstrings-medial-left",
    "hamstrings-lateral-left",
    "hamstrings-medial-right",
    "hamstrings-lateral-right",
    "adductors-left",
    "adductors-right",
    "tibialis-anterior-left",
    "tibialis-anterior-right",
    "calves-gastroc-medial-left",
    "calves-gastroc-lateral-left",
    "calves-soleus-left",
    "calves-gastroc-medial-right",
    "calves-gastroc-lateral-right",
    "calves-soleus-right",
    "knee-left",
    "knee-right",
    "knee-back-left",
    "knee-back-right",
    "hip-flexor-left",
    "hip-flexor-right",
  ],
};

const ALIASES: Record<string, MuscleGroupKey> = {
  chest: "Chest",
  brust: "Chest",
  pec: "Chest",
  pecs: "Chest",
  pectoral: "Chest",
  shoulders: "Shoulders",
  shoulder: "Shoulders",
  schultern: "Shoulders",
  schulter: "Shoulders",
  delts: "Shoulders",
  deltoid: "Shoulders",
  arms: "Arms",
  arme: "Arms",
  arm: "Arms",
  biceps: "Arms",
  triceps: "Arms",
  forearm: "Arms",
  unterarm: "Arms",
  back: "Back",
  rücken: "Back",
  rucken: "Back",
  ruecken: "Back",
  lats: "Back",
  lat: "Back",
  traps: "Back",
  glutes: "Back",
  glute: "Back",
  po: "Back",
  abs: "Abdominals",
  ab: "Abdominals",
  bauch: "Abdominals",
  core: "Abdominals",
  obliques: "Abdominals",
  legs: "Legs",
  beine: "Legs",
  bein: "Legs",
  quads: "Legs",
  quadriceps: "Legs",
  hamstrings: "Legs",
  calves: "Legs",
  waden: "Legs",
};

export function resolveMuscleGroup(raw: string | null | undefined): MuscleGroupKey | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  if (!key) return null;
  if (ALIASES[key]) return ALIASES[key];
  for (const [alias, group] of Object.entries(ALIASES)) {
    if (key.includes(alias)) return group;
  }
  const titled = TRAINING_GROUPS.find((g) => g.toLowerCase() === key);
  return titled ?? null;
}

export function muscleIdsForGroup(group: MuscleGroupKey): string[] {
  return GROUP_MUSCLE_IDS[group] ?? [];
}

export function resolveGroupFromMuscleId(id: string): MuscleGroupKey | null {
  for (const group of TRAINING_GROUPS) {
    if (GROUP_MUSCLE_IDS[group].includes(id)) return group;
  }
  return null;
}

export function bodyStateFromGroupCounts(
  counts: Partial<Record<MuscleGroupKey, number>>,
  selectedGroup?: MuscleGroupKey | null,
): BodyState {
  const state: BodyState = {};
  for (const group of TRAINING_GROUPS) {
    const sets = counts[group] ?? 0;
    const intensity = Math.min(10, sets);
    if (intensity <= 0 && selectedGroup !== group) continue;
    for (const id of muscleIdsForGroup(group)) {
      state[id] = {
        intensity: intensity > 0 ? intensity : 0,
        selected: selectedGroup === group,
      };
    }
  }
  return state;
}

export function bodyStateForGroupOnly(
  group: MuscleGroupKey,
  intensity: number,
  selected = false,
): BodyState {
  const state: BodyState = {};
  const value = Math.min(10, Math.max(0, intensity));
  for (const id of muscleIdsForGroup(group)) {
    state[id] = { intensity: value || 1, selected };
  }
  return state;
}

export type TrainingFocus = "Hypertrophy" | "Strength" | "Explosiveness";

export const TRAINING_FOCUSES: TrainingFocus[] = [
  "Hypertrophy",
  "Strength",
  "Explosiveness",
];

export type CatalogEntry = {
  name: string;
  focus: TrainingFocus;
};

export const EXERCISE_CATALOG: Record<MuscleGroupKey, CatalogEntry[]> = {
  Chest: [
    { name: "Incline Dumbbell Press", focus: "Hypertrophy" },
    { name: "Cable Flys", focus: "Hypertrophy" },
    { name: "Pec Deck", focus: "Hypertrophy" },
    { name: "Incline Cable Flys", focus: "Hypertrophy" },
    { name: "Dumbbell Flys", focus: "Hypertrophy" },
    { name: "Push-Ups", focus: "Hypertrophy" },
    { name: "Machine Chest Press", focus: "Hypertrophy" },
    { name: "Barbell Bench Press", focus: "Strength" },
    { name: "Incline Barbell Press", focus: "Strength" },
    { name: "Decline Bench Press", focus: "Strength" },
    { name: "Dumbbell Bench Press", focus: "Strength" },
    { name: "Chest Dips", focus: "Strength" },
    { name: "Floor Press", focus: "Strength" },
    { name: "Clap Push-Ups", focus: "Explosiveness" },
    { name: "Medicine Ball Chest Pass", focus: "Explosiveness" },
    { name: "Plyometric Push-Ups", focus: "Explosiveness" },
  ],
  Shoulders: [
    { name: "Lateral Raises", focus: "Hypertrophy" },
    { name: "Cable Lateral Raises", focus: "Hypertrophy" },
    { name: "Front Raises", focus: "Hypertrophy" },
    { name: "Rear Delt Flys", focus: "Hypertrophy" },
    { name: "Face Pulls", focus: "Hypertrophy" },
    { name: "Arnold Press", focus: "Hypertrophy" },
    { name: "Reverse Pec Deck", focus: "Hypertrophy" },
    { name: "Overhead Press", focus: "Strength" },
    { name: "Dumbbell Shoulder Press", focus: "Strength" },
    { name: "Machine Shoulder Press", focus: "Strength" },
    { name: "Push Press", focus: "Strength" },
    { name: "Shrugs", focus: "Strength" },
    { name: "Medicine Ball Slam", focus: "Explosiveness" },
    { name: "Kettlebell Snatch", focus: "Explosiveness" },
    { name: "Landmine Push Press", focus: "Explosiveness" },
  ],
  Arms: [
    { name: "Biceps Curls", focus: "Hypertrophy" },
    { name: "Hammer Curls", focus: "Hypertrophy" },
    { name: "Concentration Curls", focus: "Hypertrophy" },
    { name: "Preacher Curls", focus: "Hypertrophy" },
    { name: "Cable Curls", focus: "Hypertrophy" },
    { name: "Incline Curls", focus: "Hypertrophy" },
    { name: "Triceps Pushdowns", focus: "Hypertrophy" },
    { name: "Skull Crushers", focus: "Hypertrophy" },
    { name: "Overhead Extension", focus: "Hypertrophy" },
    { name: "Kickbacks", focus: "Hypertrophy" },
    { name: "Close-Grip Bench Press", focus: "Strength" },
    { name: "Weighted Chin-Ups", focus: "Strength" },
    { name: "Triceps Dips", focus: "Strength" },
    { name: "Barbell Curls", focus: "Strength" },
    { name: "Medicine Ball Slam", focus: "Explosiveness" },
    { name: "Battle Rope Waves", focus: "Explosiveness" },
  ],
  Back: [
    { name: "Lat Pulldown", focus: "Hypertrophy" },
    { name: "Seated Cable Row", focus: "Hypertrophy" },
    { name: "Chest-Supported Row", focus: "Hypertrophy" },
    { name: "Straight-Arm Pulldown", focus: "Hypertrophy" },
    { name: "Dumbbell Row", focus: "Hypertrophy" },
    { name: "Hyperextensions", focus: "Hypertrophy" },
    { name: "Pull-Ups", focus: "Strength" },
    { name: "Barbell Row", focus: "Strength" },
    { name: "T-Bar Row", focus: "Strength" },
    { name: "Deadlift", focus: "Strength" },
    { name: "Rack Pulls", focus: "Strength" },
    { name: "Good Mornings", focus: "Strength" },
    { name: "Kettlebell Swing", focus: "Explosiveness" },
    { name: "Medicine Ball Slam", focus: "Explosiveness" },
    { name: "Power Clean", focus: "Explosiveness" },
  ],
  Abdominals: [
    { name: "Cable Crunch", focus: "Hypertrophy" },
    { name: "Crunches", focus: "Hypertrophy" },
    { name: "Hanging Leg Raises", focus: "Hypertrophy" },
    { name: "Lying Leg Raises", focus: "Hypertrophy" },
    { name: "Bicycle Crunches", focus: "Hypertrophy" },
    { name: "Ab Wheel", focus: "Hypertrophy" },
    { name: "Plank", focus: "Strength" },
    { name: "Side Plank", focus: "Strength" },
    { name: "Pallof Press", focus: "Strength" },
    { name: "Dead Bug", focus: "Strength" },
    { name: "Weighted Sit-Ups", focus: "Strength" },
    { name: "Medicine Ball Rotational Throw", focus: "Explosiveness" },
    { name: "Woodchoppers", focus: "Explosiveness" },
    { name: "Russian Twists", focus: "Explosiveness" },
    { name: "V-Ups", focus: "Explosiveness" },
  ],
  Legs: [
    { name: "Leg Press", focus: "Hypertrophy" },
    { name: "Hack Squat", focus: "Hypertrophy" },
    { name: "Bulgarian Split Squat", focus: "Hypertrophy" },
    { name: "Lunges", focus: "Hypertrophy" },
    { name: "Leg Extensions", focus: "Hypertrophy" },
    { name: "Leg Curls", focus: "Hypertrophy" },
    { name: "Hip Thrust", focus: "Hypertrophy" },
    { name: "Calf Raises", focus: "Hypertrophy" },
    { name: "Seated Calf Raises", focus: "Hypertrophy" },
    { name: "Back Squat", focus: "Strength" },
    { name: "Front Squat", focus: "Strength" },
    { name: "Romanian Deadlift", focus: "Strength" },
    { name: "Goblet Squat", focus: "Strength" },
    { name: "Box Squats", focus: "Strength" },
    { name: "Jump Squats", focus: "Explosiveness" },
    { name: "Box Jumps", focus: "Explosiveness" },
    { name: "Broad Jumps", focus: "Explosiveness" },
    { name: "Kettlebell Swing", focus: "Explosiveness" },
  ],
};

export function catalogFocusForName(
  group: MuscleGroupKey,
  name: string,
): TrainingFocus {
  const key = name.trim().toLowerCase();
  const match = EXERCISE_CATALOG[group].find((e) => e.name.toLowerCase() === key);
  return match?.focus ?? "Hypertrophy";
}

export const SUGGESTED_EXERCISES: Record<MuscleGroupKey, string[]> = {
  Chest: EXERCISE_CATALOG.Chest.filter((e) => e.focus === "Hypertrophy")
    .slice(0, 4)
    .map((e) => e.name),
  Shoulders: EXERCISE_CATALOG.Shoulders.filter((e) => e.focus === "Hypertrophy")
    .slice(0, 4)
    .map((e) => e.name),
  Arms: EXERCISE_CATALOG.Arms.filter((e) => e.focus === "Hypertrophy")
    .slice(0, 4)
    .map((e) => e.name),
  Back: EXERCISE_CATALOG.Back.filter((e) => e.focus === "Hypertrophy")
    .slice(0, 4)
    .map((e) => e.name),
  Abdominals: EXERCISE_CATALOG.Abdominals.filter((e) => e.focus === "Hypertrophy")
    .slice(0, 4)
    .map((e) => e.name),
  Legs: EXERCISE_CATALOG.Legs.filter((e) => e.focus === "Hypertrophy")
    .slice(0, 4)
    .map((e) => e.name),
};
