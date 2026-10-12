import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import {
  computeAchievementProgress,
  defaultTitle,
  type AchievementKind,
  type AchievementMetric,
  type AchievementRow,
} from "@/lib/achievements";
import {
  TRAINING_FOCUSES,
  TRAINING_GROUPS,
  resolveMuscleGroup,
  type TrainingFocus,
} from "@/lib/muscles";

const KINDS: AchievementKind[] = ["exercise", "group", "discipline"];
const METRICS: AchievementMetric[] = [
  "max_weight",
  "volume",
  "sets",
  "sessions",
  "est_1rm",
];

async function loadLoggedSets(db: ReturnType<typeof sql>) {
  return db`
    SELECT
      e.name AS exercise_name,
      e.muscle_group,
      w.id AS workout_id,
      w.completed AS workout_completed,
      coalesce(s.done, false) AS set_done,
      s.reps,
      s.weight,
      s.rir
    FROM sets s
    JOIN exercises e ON e.id = s.exercise_id
    JOIN workouts w ON w.id = e.workout_id
  `;
}

function mapRow(row: Record<string, unknown>): AchievementRow {
  return {
    id: String(row.id),
    kind: row.kind as AchievementKind,
    title: String(row.title),
    exercise_name: (row.exercise_name as string | null) ?? null,
    muscle_group: (row.muscle_group as string | null) ?? null,
    focus: (row.focus as string | null) ?? null,
    metric: row.metric as AchievementMetric,
    target: Number(row.target),
    created_at: String(row.created_at),
  };
}

export async function GET() {
  try {
    const db = sql();
    const [rows, logged] = await Promise.all([
      db`SELECT * FROM achievements ORDER BY created_at DESC`,
      loadLoggedSets(db),
    ]);

    const loggedMapped = logged.map((r) => ({
      exercise_name: String(r.exercise_name),
      muscle_group: (r.muscle_group as string | null) ?? null,
      workout_id: String(r.workout_id),
      workout_completed: Boolean(r.workout_completed),
      set_done: Boolean(r.set_done),
      reps: r.reps == null ? null : Number(r.reps),
      weight: r.weight == null ? null : Number(r.weight),
      rir: r.rir == null ? null : Number(r.rir),
    }));

    const achievements = rows.map((row) =>
      computeAchievementProgress(mapRow(row as Record<string, unknown>), loggedMapped),
    );

    return NextResponse.json(achievements);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load achievements" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const kind: AchievementKind = KINDS.includes(body.kind) ? body.kind : "exercise";
    const metric: AchievementMetric = METRICS.includes(body.metric)
      ? body.metric
      : "max_weight";
    const target = Number(body.target);
    if (!Number.isFinite(target) || target <= 0) {
      return NextResponse.json({ error: "Target must be greater than 0" }, { status: 400 });
    }

    let exerciseName: string | null = null;
    let muscleGroup: string | null = null;
    let focus: string | null = null;

    if (kind === "exercise") {
      exerciseName =
        typeof body.exercise_name === "string" && body.exercise_name.trim()
          ? body.exercise_name.trim()
          : null;
      if (!exerciseName) {
        return NextResponse.json({ error: "Choose an exercise" }, { status: 400 });
      }
    } else if (kind === "group") {
      const g = resolveMuscleGroup(body.muscle_group);
      if (!g || !TRAINING_GROUPS.includes(g)) {
        return NextResponse.json({ error: "Choose a muscle group" }, { status: 400 });
      }
      muscleGroup = g;
    } else {
      const f = String(body.focus ?? "") as TrainingFocus;
      if (!TRAINING_FOCUSES.includes(f)) {
        return NextResponse.json({ error: "Choose a discipline" }, { status: 400 });
      }
      focus = f;
    }

    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : defaultTitle({
            kind,
            exercise_name: exerciseName,
            muscle_group: muscleGroup,
            focus,
            metric,
          });

    const db = sql();
    const [row] = await db`
      INSERT INTO achievements (
        kind, title, exercise_name, muscle_group, focus, metric, target
      )
      VALUES (
        ${kind},
        ${title},
        ${exerciseName},
        ${muscleGroup},
        ${focus},
        ${metric},
        ${target}
      )
      RETURNING *
    `;

    const logged = await loadLoggedSets(db);
    const loggedMapped = logged.map((r) => ({
      exercise_name: String(r.exercise_name),
      muscle_group: (r.muscle_group as string | null) ?? null,
      workout_id: String(r.workout_id),
      workout_completed: Boolean(r.workout_completed),
      set_done: Boolean(r.set_done),
      reps: r.reps == null ? null : Number(r.reps),
      weight: r.weight == null ? null : Number(r.weight),
      rir: r.rir == null ? null : Number(r.rir),
    }));

    return NextResponse.json(
      computeAchievementProgress(mapRow(row as Record<string, unknown>), loggedMapped),
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create achievement" },
      { status: 500 },
    );
  }
}
