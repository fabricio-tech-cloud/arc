import type { MuscleGroupKey, TrainingFocus } from "@/lib/muscles";
import {
  EXERCISE_CATALOG,
  FOCUS_LABELS,
  GROUP_LABELS,
  TRAINING_FOCUSES,
  TRAINING_GROUPS,
  catalogEntryForName,
  resolveMuscleGroup,
} from "@/lib/muscles";

export type AchievementKind = "exercise" | "group" | "discipline";
export type AchievementMetric =
  | "max_weight"
  | "volume"
  | "sets"
  | "sessions"
  | "est_1rm";

export type AchievementRow = {
  id: string;
  kind: AchievementKind;
  title: string;
  exercise_name: string | null;
  muscle_group: string | null;
  focus: string | null;
  metric: AchievementMetric;
  target: number;
  created_at: string;
};

export type AchievementProgress = AchievementRow & {
  current: number;
  pct: number;
  unit: string;
  metricLabel: string;
  done: boolean;
};

export const METRIC_LABELS: Record<AchievementMetric, string> = {
  max_weight: "Max weight",
  volume: "Total volume",
  sets: "Sets",
  sessions: "Sessions",
  est_1rm: "Estimated 1RM",
};

export const METRIC_UNITS: Record<AchievementMetric, string> = {
  max_weight: "kg",
  volume: "kg",
  sets: "Sets",
  sessions: "×",
  est_1rm: "kg",
};

export const KIND_LABELS: Record<AchievementKind, string> = {
  exercise: "Exercise",
  group: "Muscle group",
  discipline: "Discipline",
};

export function allCatalogExerciseNames() {
  const names = new Set<string>();
  for (const group of TRAINING_GROUPS) {
    for (const entry of EXERCISE_CATALOG[group]) names.add(entry.name);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

export function estimated1rm(weight: number, reps: number | null) {
  if (!Number.isFinite(weight) || weight <= 0) return 0;
  if (reps == null || !Number.isFinite(reps) || reps <= 0) return weight;
  if (reps === 1) return weight;
  // Epley
  return weight * (1 + reps / 30);
}

export function setVolume(reps: number | null, weight: number | null, rir: number | null) {
  if (weight == null || !Number.isFinite(weight) || weight <= 0) return 0;
  if (rir === 0 && (reps == null || !Number.isFinite(reps))) return weight;
  if (reps == null || !Number.isFinite(reps) || reps <= 0) return 0;
  return reps * weight;
}

type LoggedSet = {
  exercise_name: string;
  muscle_group: string | null;
  workout_id: string;
  workout_completed: boolean;
  set_done: boolean;
  reps: number | null;
  weight: number | null;
  rir: number | null;
};

function matchesAchievement(a: AchievementRow, row: LoggedSet) {
  if (a.kind === "exercise") {
    if (!a.exercise_name) return false;
    return row.exercise_name.trim().toLowerCase() === a.exercise_name.trim().toLowerCase();
  }
  if (a.kind === "group") {
    const g = resolveMuscleGroup(row.muscle_group);
    return g != null && g === resolveMuscleGroup(a.muscle_group);
  }
  if (a.kind === "discipline") {
    const g = resolveMuscleGroup(row.muscle_group);
    if (!g || !a.focus) return false;
    const entry = catalogEntryForName(g, row.exercise_name);
    return entry?.focus === a.focus;
  }
  return false;
}

function executed(row: LoggedSet) {
  return row.workout_completed || row.set_done;
}

export function computeAchievementProgress(
  achievement: AchievementRow,
  rows: LoggedSet[],
): AchievementProgress {
  const matched = rows.filter((r) => matchesAchievement(achievement, r) && executed(r));
  let current = 0;

  switch (achievement.metric) {
    case "max_weight": {
      for (const r of matched) {
        if (r.weight != null && Number.isFinite(r.weight)) {
          current = Math.max(current, r.weight);
        }
      }
      break;
    }
    case "est_1rm": {
      for (const r of matched) {
        if (r.weight == null || !Number.isFinite(r.weight)) continue;
        current = Math.max(current, estimated1rm(r.weight, r.reps));
      }
      break;
    }
    case "volume": {
      for (const r of matched) {
        current += setVolume(r.reps, r.weight, r.rir);
      }
      break;
    }
    case "sets": {
      current = matched.length;
      break;
    }
    case "sessions": {
      current = new Set(matched.map((r) => r.workout_id)).size;
      break;
    }
  }

  current = Math.round(current * 10) / 10;
  const target = Number(achievement.target) || 1;
  const pct = Math.min(100, Math.round((current / target) * 100));

  return {
    ...achievement,
    current,
    pct,
    unit: METRIC_UNITS[achievement.metric],
    metricLabel: METRIC_LABELS[achievement.metric],
    done: current >= target,
  };
}

export function defaultTitle(input: {
  kind: AchievementKind;
  exercise_name?: string | null;
  muscle_group?: string | null;
  focus?: string | null;
  metric: AchievementMetric;
}) {
  const metric = METRIC_LABELS[input.metric];
  if (input.kind === "exercise" && input.exercise_name) {
    return `${input.exercise_name} · ${metric}`;
  }
  if (input.kind === "group") {
    const g = resolveMuscleGroup(input.muscle_group);
    const label = g ? GROUP_LABELS[g] : input.muscle_group || "Group";
    return `${label} · ${metric}`;
  }
  if (input.kind === "discipline" && input.focus) {
    const focus = FOCUS_LABELS[input.focus as TrainingFocus] ?? input.focus;
    return `${focus} · ${metric}`;
  }
  return metric;
}

export { TRAINING_GROUPS, TRAINING_FOCUSES, GROUP_LABELS, FOCUS_LABELS };
export type { MuscleGroupKey, TrainingFocus };
