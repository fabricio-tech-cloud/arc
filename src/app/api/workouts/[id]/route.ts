import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const db = sql();
    const [workout] = await db`SELECT * FROM workouts WHERE id = ${id}`;
    if (!workout) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const exercises = await db`
      SELECT e.*,
        COALESCE(
          json_agg(
            json_build_object('id', s.id, 'reps', s.reps, 'weight', s.weight, 'rir', s.rir)
            ORDER BY s.id
          ) FILTER (WHERE s.id IS NOT NULL),
          '[]'
        ) AS sets
      FROM exercises e
      LEFT JOIN sets s ON s.exercise_id = e.id
      WHERE e.workout_id = ${id}
      GROUP BY e.id
      ORDER BY e.id
    `;
    return NextResponse.json({ ...workout, exercises });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load workout" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const db = sql();
    await db`DELETE FROM workouts WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete workout" },
      { status: 500 },
    );
  }
}
