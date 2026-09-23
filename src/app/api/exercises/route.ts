import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import {
  EXERCISE_CATALOG,
  GROUP_LABELS,
  GROUP_SLUGS,
  catalogEntryForName,
  catalogFocusForName,
  parseGroupParam,
  resolveMuscleGroup,
  type Equipment,
  type ExerciseRegion,
  type TrainingFocus,
} from "@/lib/muscles";

type CatalogExercise = {
  name: string;
  focus: TrainingFocus;
  equipment: Equipment | null;
  region: ExerciseRegion | null;
  fromCatalog: boolean;
  times: number;
  lastDate: string | null;
  lastWorkoutId: string | null;
};

export async function GET(request: Request) {
  try {
    const groupParam = new URL(request.url).searchParams.get("group");
    const parsed = parseGroupParam(groupParam);
    if (!parsed) {
      return NextResponse.json({ error: "Unknown muscle group" }, { status: 400 });
    }
    const group = parsed;

    const db = sql();
    const rows = await db`
      SELECT e.name, e.muscle_group, w.date, w.id AS workout_id
      FROM exercises e
      JOIN workouts w ON w.id = e.workout_id
      ORDER BY w.date DESC, e.id DESC
    `;

    const loggedByName = new Map<
      string,
      { times: number; lastDate: string; lastWorkoutId: string; displayName: string }
    >();

    for (const row of rows) {
      const resolved = resolveMuscleGroup(row.muscle_group as string | null);
      if (resolved !== group) continue;
      const displayName = String(row.name).trim();
      if (!displayName) continue;
      const key = displayName.toLowerCase();
      const existing = loggedByName.get(key);
      if (existing) {
        existing.times += 1;
      } else {
        loggedByName.set(key, {
          times: 1,
          lastDate: String(row.date),
          lastWorkoutId: String(row.workout_id),
          displayName,
        });
      }
    }

    const seen = new Set<string>();
    const exercises: CatalogExercise[] = [];

    function add(
      name: string,
      focus: TrainingFocus,
      fromCatalog: boolean,
      equipment: Equipment | null = null,
      region: ExerciseRegion | null = null,
    ) {
      const key = name.trim().toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      const logged = loggedByName.get(key);
      const catalog = catalogEntryForName(group, name);
      exercises.push({
        name: logged?.displayName ?? name,
        focus,
        equipment: equipment ?? catalog?.equipment ?? null,
        region: region ?? catalog?.region ?? null,
        fromCatalog,
        times: logged?.times ?? 0,
        lastDate: logged?.lastDate ?? null,
        lastWorkoutId: logged?.lastWorkoutId ?? null,
      });
    }

    for (const entry of EXERCISE_CATALOG[group]) {
      add(entry.name, entry.focus, true, entry.equipment ?? null, entry.region ?? null);
    }
    for (const logged of loggedByName.values()) {
      add(logged.displayName, catalogFocusForName(group, logged.displayName), false);
    }

    return NextResponse.json({
      key: group,
      label: GROUP_LABELS[group],
      slug: GROUP_SLUGS[group],
      exercises,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load exercises" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workout_id, name, muscle_group } = body;
    if (!workout_id || !name) {
      return NextResponse.json({ error: "workout_id and name are required" }, { status: 400 });
    }
    const db = sql();
    const [row] = await db`
      INSERT INTO exercises (workout_id, name, muscle_group)
      VALUES (${workout_id}, ${name}, ${muscle_group ?? null})
      RETURNING *
    `;
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create exercise" },
      { status: 500 },
    );
  }
}
