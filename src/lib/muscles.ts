import type { BodyState } from "body-muscles";

export type MuscleGroupKey =
  | "Shoulders"
  | "Arms"
  | "Chest"
  | "Back"
  | "Abdominals"
  | "Legs"
  | "Field";

export const TRAINING_GROUPS: MuscleGroupKey[] = [
  "Chest",
  "Shoulders",
  "Arms",
  "Back",
  "Abdominals",
  "Legs",
  "Field",
];

export const GROUP_LABELS: Record<MuscleGroupKey, string> = {
  Chest: "Chest",
  Shoulders: "Shoulders",
  Arms: "Arms",
  Back: "Back",
  Abdominals: "Abs",
  Legs: "Legs",
  Field: "Field",
};

export const GROUP_SLUGS: Record<MuscleGroupKey, string> = {
  Chest: "brust",
  Shoulders: "schultern",
  Arms: "arme",
  Back: "ruecken",
  Abdominals: "bauch",
  Legs: "beine",
  Field: "field",
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
  Chest: "Ch",
  Shoulders: "Sh",
  Arms: "Ar",
  Back: "Bk",
  Abdominals: "Ab",
  Legs: "Lg",
  Field: "Fd",
};

export const GROUP_VIEW: Record<MuscleGroupKey, "FRONT" | "BACK"> = {
  Chest: "FRONT",
  Shoulders: "FRONT",
  Arms: "FRONT",
  Back: "BACK",
  Abdominals: "FRONT",
  Legs: "FRONT",
  Field: "FRONT",
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
    "traps-upper-left",
    "traps-mid-left",
    "traps-lower-left",
    "traps-upper-right",
    "traps-mid-right",
    "traps-lower-right",
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
    "gluteus-medius-left",
    "gluteus-maximus-left",
    "gluteus-medius-right",
    "gluteus-maximus-right",
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
  /** Athletics / field work — highlight lower body + core on the map */
  Field: [
    "quads-left",
    "quads-right",
    "hamstrings-medial-left",
    "hamstrings-lateral-left",
    "hamstrings-medial-right",
    "hamstrings-lateral-right",
    "gluteus-maximus-left",
    "gluteus-maximus-right",
    "calves-gastroc-medial-left",
    "calves-gastroc-lateral-left",
    "calves-gastroc-medial-right",
    "calves-gastroc-lateral-right",
    "hip-flexor-left",
    "hip-flexor-right",
    "abs-upper-left",
    "abs-upper-right",
    "abs-lower-left",
    "abs-lower-right",
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
  glutes: "Legs",
  glute: "Legs",
  po: "Legs",
  gesaess: "Legs",
  gesäß: "Legs",
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
  field: "Field",
  athletics: "Field",
  athletic: "Field",
  sprint: "Field",
  running: "Field",
  cardio: "Field",
  conditioning: "Field",
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

export type Equipment =
  | "Barbell"
  | "Dumbbell"
  | "Machine"
  | "Cable"
  | "Bodyweight"
  | "Other";

export const EQUIPMENT_TYPES: Equipment[] = [
  "Barbell",
  "Dumbbell",
  "Machine",
  "Cable",
  "Bodyweight",
];

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  Barbell: "Barbell",
  Dumbbell: "Dumbbell",
  Machine: "Machine",
  Cable: "Cable",
  Bodyweight: "Bodyweight",
  Other: "Other",
};

/** Anatomical / activation region within a muscle group (Chest uses these). */
export type ExerciseRegion = "Upper" | "Mid" | "Lower" | "Full";

export const EXERCISE_REGIONS: ExerciseRegion[] = ["Upper", "Mid", "Lower", "Full"];

export const REGION_LABELS: Record<ExerciseRegion, string> = {
  Upper: "Upper chest",
  Mid: "Mid chest",
  Lower: "Lower chest",
  Full: "Full chest",
};

export const FOCUS_LABELS: Record<TrainingFocus, string> = {
  Hypertrophy: "Hypertrophy",
  Strength: "Strength",
  Explosiveness: "Explosiveness",
};

export type CatalogEntry = {
  name: string;
  focus: TrainingFocus;
  equipment?: Equipment;
  region?: ExerciseRegion;
};

export const EXERCISE_CATALOG: Record<MuscleGroupKey, CatalogEntry[]> = {
  Chest: [
    // 1) Obere Brust
    { name: "Incline Barbell Bench Press", focus: "Strength", equipment: "Barbell", region: "Upper" },
    { name: "Reverse-Grip Bench Press", focus: "Hypertrophy", equipment: "Barbell", region: "Upper" },
    { name: "Incline Close-Grip Bench Press", focus: "Hypertrophy", equipment: "Barbell", region: "Upper" },
    { name: "Incline Barbell Floor Press", focus: "Strength", equipment: "Barbell", region: "Upper" },
    { name: "Incline Dumbbell Press", focus: "Hypertrophy", equipment: "Dumbbell", region: "Upper" },
    { name: "Incline Dumbbell Flyes", focus: "Hypertrophy", equipment: "Dumbbell", region: "Upper" },
    { name: "Incline Dumbbell Neutral-Grip Press", focus: "Hypertrophy", equipment: "Dumbbell", region: "Upper" },
    { name: "Incline Dumbbell Around-the-World", focus: "Hypertrophy", equipment: "Dumbbell", region: "Upper" },
    { name: "Incline Chest Press Machine", focus: "Hypertrophy", equipment: "Machine", region: "Upper" },
    { name: "Incline Smith Machine Press", focus: "Strength", equipment: "Machine", region: "Upper" },
    { name: "Incline Hammer Strength Press", focus: "Strength", equipment: "Machine", region: "Upper" },
    { name: "Incline Cable Press", focus: "Hypertrophy", equipment: "Cable", region: "Upper" },
    { name: "Single-Arm Incline Cable Press", focus: "Hypertrophy", equipment: "Cable", region: "Upper" },
    { name: "Cable Upper Chest Raise", focus: "Hypertrophy", equipment: "Cable", region: "Upper" },
    { name: "Decline Push-Ups (feet elevated)", focus: "Hypertrophy", equipment: "Bodyweight", region: "Upper" },
    { name: "Pike Push-Ups", focus: "Hypertrophy", equipment: "Bodyweight", region: "Upper" },

    // 2) Mittlere Brust
    { name: "Barbell Bench Press", focus: "Strength", equipment: "Barbell", region: "Mid" },
    { name: "Close-Grip Bench Press", focus: "Strength", equipment: "Barbell", region: "Mid" },
    { name: "Wide-Grip Bench Press", focus: "Strength", equipment: "Barbell", region: "Mid" },
    { name: "Spoto Press", focus: "Strength", equipment: "Barbell", region: "Mid" },
    { name: "Flat Dumbbell Press", focus: "Strength", equipment: "Dumbbell", region: "Mid" },
    { name: "Dumbbell Flyes", focus: "Hypertrophy", equipment: "Dumbbell", region: "Mid" },
    { name: "Dumbbell Squeeze Press", focus: "Hypertrophy", equipment: "Dumbbell", region: "Mid" },
    { name: "Dumbbell Around-the-World", focus: "Hypertrophy", equipment: "Dumbbell", region: "Mid" },
    { name: "Dumbbell Hex Press", focus: "Hypertrophy", equipment: "Dumbbell", region: "Mid" },
    { name: "Chest Press Machine", focus: "Hypertrophy", equipment: "Machine", region: "Mid" },
    { name: "Hammer Strength Flat Press", focus: "Strength", equipment: "Machine", region: "Mid" },
    { name: "Smith Machine Bench Press", focus: "Strength", equipment: "Machine", region: "Mid" },
    { name: "Pec Deck", focus: "Hypertrophy", equipment: "Machine", region: "Mid" },
    { name: "Cable Fly", focus: "Hypertrophy", equipment: "Cable", region: "Mid" },
    { name: "Cable Press", focus: "Hypertrophy", equipment: "Cable", region: "Mid" },
    { name: "Cable Squeeze Press", focus: "Hypertrophy", equipment: "Cable", region: "Mid" },
    { name: "Single-Arm Cable Fly", focus: "Hypertrophy", equipment: "Cable", region: "Mid" },
    { name: "Push-Ups", focus: "Hypertrophy", equipment: "Bodyweight", region: "Mid" },
    { name: "Weighted Push-Ups", focus: "Strength", equipment: "Bodyweight", region: "Mid" },
    { name: "Ring Push-Ups", focus: "Hypertrophy", equipment: "Bodyweight", region: "Mid" },
    { name: "Ring Flyes", focus: "Hypertrophy", equipment: "Bodyweight", region: "Mid" },

    // 3) Untere Brust
    { name: "Decline Barbell Bench Press", focus: "Strength", equipment: "Barbell", region: "Lower" },
    { name: "Decline Close-Grip Bench Press", focus: "Strength", equipment: "Barbell", region: "Lower" },
    { name: "Decline Smith Machine Press", focus: "Strength", equipment: "Machine", region: "Lower" },
    { name: "Decline Dumbbell Press", focus: "Hypertrophy", equipment: "Dumbbell", region: "Lower" },
    { name: "Decline Dumbbell Flyes", focus: "Hypertrophy", equipment: "Dumbbell", region: "Lower" },
    { name: "Dumbbell Pullover", focus: "Hypertrophy", equipment: "Dumbbell", region: "Lower" },
    { name: "Decline Chest Press Machine", focus: "Hypertrophy", equipment: "Machine", region: "Lower" },
    { name: "Hammer Strength Decline Press", focus: "Strength", equipment: "Machine", region: "Lower" },
    { name: "Decline Cable Press", focus: "Hypertrophy", equipment: "Cable", region: "Lower" },
    { name: "High-to-Low Cable Fly", focus: "Hypertrophy", equipment: "Cable", region: "Lower" },
    { name: "Single-Arm Downward Cable Press", focus: "Hypertrophy", equipment: "Cable", region: "Lower" },
    { name: "Dips (chest focus)", focus: "Strength", equipment: "Bodyweight", region: "Lower" },
    { name: "Weighted Dips", focus: "Strength", equipment: "Bodyweight", region: "Lower" },
    { name: "Decline Push-Ups", focus: "Hypertrophy", equipment: "Bodyweight", region: "Lower" },

    // 4) Ganze Brust (+ explosiveness from Ziel)
    { name: "Floor Press", focus: "Strength", equipment: "Barbell", region: "Full" },
    { name: "Pin Press", focus: "Strength", equipment: "Barbell", region: "Full" },
    { name: "Board Press", focus: "Strength", equipment: "Barbell", region: "Full" },
    { name: "Dumbbell Bench Press", focus: "Strength", equipment: "Dumbbell", region: "Full" },
    { name: "Cable Crossover", focus: "Hypertrophy", equipment: "Cable", region: "Full" },
    { name: "Cable Crossover (low to high)", focus: "Hypertrophy", equipment: "Cable", region: "Full" },
    { name: "Hammer Strength Iso-Lateral Press", focus: "Strength", equipment: "Machine", region: "Full" },
    { name: "Archer Push-Ups", focus: "Hypertrophy", equipment: "Bodyweight", region: "Full" },
    { name: "Speed Bench Press", focus: "Explosiveness", equipment: "Barbell", region: "Full" },
    { name: "Plyo Push-Ups", focus: "Explosiveness", equipment: "Bodyweight", region: "Full" },
    { name: "Clap Push-Ups", focus: "Explosiveness", equipment: "Bodyweight", region: "Full" },
    { name: "Medicine Ball Chest Throws", focus: "Explosiveness", equipment: "Other", region: "Full" },
    { name: "Explosive Smith Machine Press", focus: "Explosiveness", equipment: "Machine", region: "Full" },
    { name: "Dynamic Effort Bench", focus: "Explosiveness", equipment: "Barbell", region: "Full" },
  ],
  Shoulders: [
    { name: "Lateral Raises", focus: "Hypertrophy", equipment: "Dumbbell" },
    { name: "Cable Lateral Raises", focus: "Hypertrophy", equipment: "Cable" },
    { name: "Front Raises", focus: "Hypertrophy", equipment: "Dumbbell" },
    { name: "Rear Delt Flys", focus: "Hypertrophy", equipment: "Dumbbell" },
    { name: "Face Pulls", focus: "Hypertrophy", equipment: "Cable" },
    { name: "Arnold Press", focus: "Hypertrophy", equipment: "Dumbbell" },
    { name: "Reverse Pec Deck", focus: "Hypertrophy", equipment: "Machine" },
    { name: "Overhead Press", focus: "Strength", equipment: "Barbell" },
    { name: "Dumbbell Shoulder Press", focus: "Strength", equipment: "Dumbbell" },
    { name: "Machine Shoulder Press", focus: "Strength", equipment: "Machine" },
    { name: "Push Press", focus: "Strength", equipment: "Barbell" },
    { name: "Shrugs", focus: "Strength", equipment: "Barbell" },
    { name: "Medicine Ball Slam", focus: "Explosiveness", equipment: "Other" },
    { name: "Kettlebell Snatch", focus: "Explosiveness", equipment: "Other" },
    { name: "Landmine Push Press", focus: "Explosiveness", equipment: "Barbell" },
  ],
  Arms: [
    { name: "Biceps Curls", focus: "Hypertrophy", equipment: "Dumbbell" },
    { name: "Hammer Curls", focus: "Hypertrophy", equipment: "Dumbbell" },
    { name: "Concentration Curls", focus: "Hypertrophy", equipment: "Dumbbell" },
    { name: "Preacher Curls", focus: "Hypertrophy", equipment: "Barbell" },
    { name: "Cable Curls", focus: "Hypertrophy", equipment: "Cable" },
    { name: "Incline Curls", focus: "Hypertrophy", equipment: "Dumbbell" },
    { name: "Triceps Pushdowns", focus: "Hypertrophy", equipment: "Cable" },
    { name: "Skull Crushers", focus: "Hypertrophy", equipment: "Barbell" },
    { name: "Overhead Extension", focus: "Hypertrophy", equipment: "Dumbbell" },
    { name: "Kickbacks", focus: "Hypertrophy", equipment: "Dumbbell" },
    { name: "Close-Grip Bench Press", focus: "Strength", equipment: "Barbell" },
    { name: "Weighted Chin-Ups", focus: "Strength", equipment: "Bodyweight" },
    { name: "Triceps Dips", focus: "Strength", equipment: "Bodyweight" },
    { name: "Barbell Curls", focus: "Strength", equipment: "Barbell" },
    { name: "Medicine Ball Slam", focus: "Explosiveness", equipment: "Other" },
    { name: "Battle Rope Waves", focus: "Explosiveness", equipment: "Other" },
  ],
  Back: [
    { name: "Lat Pulldown", focus: "Hypertrophy", equipment: "Cable" },
    { name: "Seated Cable Row", focus: "Hypertrophy", equipment: "Cable" },
    { name: "Chest-Supported Row", focus: "Hypertrophy", equipment: "Dumbbell" },
    { name: "Straight-Arm Pulldown", focus: "Hypertrophy", equipment: "Cable" },
    { name: "Dumbbell Row", focus: "Hypertrophy", equipment: "Dumbbell" },
    { name: "Hyperextensions", focus: "Hypertrophy", equipment: "Bodyweight" },
    { name: "Pull-Ups", focus: "Strength", equipment: "Bodyweight" },
    { name: "Barbell Row", focus: "Strength", equipment: "Barbell" },
    { name: "T-Bar Row", focus: "Strength", equipment: "Barbell" },
    { name: "Deadlift", focus: "Strength", equipment: "Barbell" },
    { name: "Rack Pulls", focus: "Strength", equipment: "Barbell" },
    { name: "Good Mornings", focus: "Strength", equipment: "Barbell" },
    { name: "Kettlebell Swing", focus: "Explosiveness", equipment: "Other" },
    { name: "Medicine Ball Slam", focus: "Explosiveness", equipment: "Other" },
    { name: "Power Clean", focus: "Explosiveness", equipment: "Barbell" },
  ],
  Abdominals: [
    { name: "Cable Crunch", focus: "Hypertrophy", equipment: "Cable" },
    { name: "Crunches", focus: "Hypertrophy", equipment: "Bodyweight" },
    { name: "Hanging Leg Raises", focus: "Hypertrophy", equipment: "Bodyweight" },
    { name: "Lying Leg Raises", focus: "Hypertrophy", equipment: "Bodyweight" },
    { name: "Bicycle Crunches", focus: "Hypertrophy", equipment: "Bodyweight" },
    { name: "Ab Wheel", focus: "Hypertrophy", equipment: "Other" },
    { name: "Plank", focus: "Strength", equipment: "Bodyweight" },
    { name: "Side Plank", focus: "Strength", equipment: "Bodyweight" },
    { name: "Pallof Press", focus: "Strength", equipment: "Cable" },
    { name: "Dead Bug", focus: "Strength", equipment: "Bodyweight" },
    { name: "Weighted Sit-Ups", focus: "Strength", equipment: "Dumbbell" },
    { name: "Medicine Ball Rotational Throw", focus: "Explosiveness", equipment: "Other" },
    { name: "Woodchoppers", focus: "Explosiveness", equipment: "Cable" },
    { name: "Russian Twists", focus: "Explosiveness", equipment: "Bodyweight" },
    { name: "V-Ups", focus: "Explosiveness", equipment: "Bodyweight" },
  ],
  Legs: [
    { name: "Leg Press", focus: "Hypertrophy", equipment: "Machine" },
    { name: "Hack Squat", focus: "Hypertrophy", equipment: "Machine" },
    { name: "Bulgarian Split Squat", focus: "Hypertrophy", equipment: "Dumbbell" },
    { name: "Lunges", focus: "Hypertrophy", equipment: "Dumbbell" },
    { name: "Leg Extensions", focus: "Hypertrophy", equipment: "Machine" },
    { name: "Leg Curls", focus: "Hypertrophy", equipment: "Machine" },
    { name: "Hip Thrust", focus: "Hypertrophy", equipment: "Barbell" },
    { name: "Calf Raises", focus: "Hypertrophy", equipment: "Machine" },
    { name: "Seated Calf Raises", focus: "Hypertrophy", equipment: "Machine" },
    { name: "Back Squat", focus: "Strength", equipment: "Barbell" },
    { name: "Front Squat", focus: "Strength", equipment: "Barbell" },
    { name: "Romanian Deadlift", focus: "Strength", equipment: "Barbell" },
    { name: "Goblet Squat", focus: "Strength", equipment: "Dumbbell" },
    { name: "Box Squats", focus: "Strength", equipment: "Barbell" },
    { name: "Jump Squats", focus: "Explosiveness", equipment: "Bodyweight" },
    { name: "Box Jumps", focus: "Explosiveness", equipment: "Bodyweight" },
    { name: "Broad Jumps", focus: "Explosiveness", equipment: "Bodyweight" },
    { name: "Kettlebell Swing", focus: "Explosiveness", equipment: "Other" },
  ],
  Field: [
    { name: "40-yard dash", focus: "Explosiveness", equipment: "Bodyweight" },
    { name: "60 m Sprint", focus: "Explosiveness", equipment: "Bodyweight" },
    { name: "100 m Sprint", focus: "Explosiveness", equipment: "Bodyweight" },
    { name: "200 m Sprint", focus: "Explosiveness", equipment: "Bodyweight" },
    { name: "400 m", focus: "Explosiveness", equipment: "Bodyweight" },
    { name: "800 m", focus: "Hypertrophy", equipment: "Bodyweight" },
    { name: "1500 m", focus: "Hypertrophy", equipment: "Bodyweight" },
    { name: "5 km Run", focus: "Hypertrophy", equipment: "Bodyweight" },
    { name: "10 km Run", focus: "Hypertrophy", equipment: "Bodyweight" },
    { name: "Cooper Test", focus: "Hypertrophy", equipment: "Bodyweight" },
    { name: "Beep Test", focus: "Hypertrophy", equipment: "Bodyweight" },
    { name: "Pro Agility (5-10-5)", focus: "Explosiveness", equipment: "Bodyweight" },
    { name: "T-Test", focus: "Explosiveness", equipment: "Bodyweight" },
    { name: "Vertical Jump", focus: "Explosiveness", equipment: "Bodyweight" },
    { name: "Standing Long Jump", focus: "Explosiveness", equipment: "Bodyweight" },
    { name: "Box Jump", focus: "Explosiveness", equipment: "Bodyweight" },
    { name: "Hill Sprints", focus: "Explosiveness", equipment: "Bodyweight" },
    { name: "Shuttle Runs", focus: "Explosiveness", equipment: "Bodyweight" },
    { name: "Sled Push", focus: "Strength", equipment: "Other" },
    { name: "Sled Pull", focus: "Strength", equipment: "Other" },
    { name: "Farmer Carry", focus: "Strength", equipment: "Dumbbell" },
    { name: "Battle Ropes", focus: "Explosiveness", equipment: "Other" },
    { name: "Row 2000 m", focus: "Hypertrophy", equipment: "Machine" },
    { name: "Assault Bike Intervals", focus: "Explosiveness", equipment: "Machine" },
  ],
};

export function catalogEntryForName(
  group: MuscleGroupKey,
  name: string,
): CatalogEntry | undefined {
  const key = name.trim().toLowerCase();
  return EXERCISE_CATALOG[group].find((e) => e.name.toLowerCase() === key);
}

export function catalogFocusForName(
  group: MuscleGroupKey,
  name: string,
): TrainingFocus {
  return catalogEntryForName(group, name)?.focus ?? "Hypertrophy";
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
  Field: EXERCISE_CATALOG.Field.filter((e) => e.focus === "Explosiveness")
    .slice(0, 4)
    .map((e) => e.name),
};
