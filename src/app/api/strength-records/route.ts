import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { resolveMuscleGroup } from "@/lib/muscles";
import { groupForExerciseName } from "@/lib/ratings";

export async function GET() {
  try {
    const db = sql();
    const rows = await db`
      SELECT id, exercise_name, muscle_group, weight, reps, recorded_at::text AS recorded_at, notes, created_at
      FROM strength_records
      ORDER BY recorded_at DESC, created_at DESC
      LIMIT 200
    `;
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load strength records" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const exerciseName =
      typeof body.exercise_name === "string" ? body.exercise_name.trim() : "";
    if (!exerciseName) {
      return NextResponse.json({ error: "Exercise is required" }, { status: 400 });
    }
    const weight = Number(body.weight);
    if (!Number.isFinite(weight) || weight < 0) {
      return NextResponse.json({ error: "Invalid weight" }, { status: 400 });
    }
    const reps = Math.round(Number(body.reps) || 1);
    if (reps < 1 || reps > 50) {
      return NextResponse.json({ error: "Reps must be 1-50" }, { status: 400 });
    }
    const muscleGroup =
      resolveMuscleGroup(body.muscle_group) ?? groupForExerciseName(exerciseName) ?? null;
    const recordedAt =
      typeof body.recorded_at === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.recorded_at)
        ? body.recorded_at
        : null;
    const notes =
      body.notes == null || body.notes === "" ? null : String(body.notes).trim() || null;

    const db = sql();
    const [row] = await db`
      INSERT INTO strength_records (exercise_name, muscle_group, weight, reps, recorded_at, notes)
      VALUES (
        ${exerciseName},
        ${muscleGroup},
        ${weight},
        ${reps},
        coalesce(${recordedAt}::date, current_date),
        ${notes}
      )
      RETURNING id, exercise_name, muscle_group, weight, reps, recorded_at::text AS recorded_at, notes, created_at
    `;
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create strength record" },
      { status: 500 },
    );
  }
}
