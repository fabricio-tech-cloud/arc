import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const db = sql();
    const date = new URL(request.url).searchParams.get("date");

    const rows = date
      ? await db`
          SELECT
            w.*,
            (SELECT count(*)::int FROM exercises e WHERE e.workout_id = w.id) AS exercise_count,
            coalesce(
              array_agg(DISTINCT e.muscle_group) FILTER (WHERE e.muscle_group IS NOT NULL),
              '{}'
            ) AS muscle_groups
          FROM workouts w
          LEFT JOIN exercises e ON e.workout_id = w.id
          WHERE w.date = ${date}::date
          GROUP BY w.id
          ORDER BY w.id ASC
        `
      : await db`
          SELECT w.*,
            (SELECT count(*)::int FROM exercises e WHERE e.workout_id = w.id) AS exercise_count
          FROM workouts w
          ORDER BY w.date DESC, w.id DESC
          LIMIT 50
        `;

    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load workouts" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const date = body.date ?? new Date().toISOString().slice(0, 10);
    const notes = body.notes ?? null;
    const name =
      body.name == null || body.name === "" ? null : String(body.name).trim() || null;
    const exercises = Array.isArray(body.exercises) ? body.exercises : [];
    const db = sql();

    const [workout] = await db`
      INSERT INTO workouts (date, notes, name)
      VALUES (${date}, ${notes}, ${name})
      RETURNING *
    `;

    const createdExercises = [];
    for (const ex of exercises) {
      if (!ex?.name) continue;
      const [exercise] = await db`
        INSERT INTO exercises (workout_id, name, muscle_group)
        VALUES (${workout.id}, ${String(ex.name)}, ${ex.muscle_group ?? null})
        RETURNING *
      `;
      const sets = Array.isArray(ex.sets) ? ex.sets : [];
      const createdSets = [];
      for (const s of sets) {
        const failure = Boolean(s.failure);
        const reps = s.reps === "" || s.reps == null ? null : Number(s.reps);
        const weight = s.weight === "" || s.weight == null ? null : Number(s.weight);
        const rir = failure
          ? 0
          : s.rir === "" || s.rir == null
            ? null
            : Number(s.rir);
        if (!failure && reps == null && weight == null && rir == null) continue;
        const [setRow] = await db`
          INSERT INTO sets (exercise_id, reps, weight, rir)
          VALUES (
            ${exercise.id},
            ${Number.isFinite(reps as number) ? reps : null},
            ${Number.isFinite(weight as number) ? weight : null},
            ${rir == null || !Number.isFinite(rir) ? null : rir}
          )
          RETURNING *
        `;
        createdSets.push(setRow);
      }
      createdExercises.push({ ...exercise, sets: createdSets });
    }

    return NextResponse.json({ ...workout, exercises: createdExercises }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create workout" },
      { status: 500 },
    );
  }
}
