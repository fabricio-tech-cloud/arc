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

export const SUGGESTED_EXERCISES: Record<MuscleGroupKey, string[]> = {
  Chest: ["Bankdrücken", "Schrägbankdrücken", "Liegestütze", "Cable Flys"],
  Shoulders: ["Schulterdrücken", "Lateral Raises", "Face Pulls", "Front Raises"],
  Arms: ["Bizeps Curls", "Hammer Curls", "Trizeps Pushdowns", "Skull Crushers"],
  Back: ["Klimmzüge", "Rudern", "Lat Pulldown", "Deadlift"],
  Abdominals: ["Crunches", "Hanging Leg Raises", "Plank", "Cable Crunch"],
  Legs: ["Kniebeugen", "Beinpresse", "Romanian Deadlift", "Wadenheben"],
};
