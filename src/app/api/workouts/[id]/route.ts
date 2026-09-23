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
            json_build_object(
              'id', s.id,
              'reps', s.reps,
              'weight', s.weight,
              'rir', s.rir,
              'done', coalesce(s.done, false)
            )
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

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = sql();

    const [existing] = await db`SELECT * FROM workouts WHERE id = ${id}`;
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const completed =
      typeof body.completed === "boolean" ? body.completed : (existing.completed as boolean);
    const notes =
      body.notes !== undefined ? (body.notes as string | null) : (existing.notes as string | null);
    const name =
      body.name !== undefined
        ? body.name === null || body.name === ""
          ? null
          : String(body.name).trim() || null
        : (existing.name as string | null);
    const duration_minutes =
      body.duration_minutes !== undefined
        ? body.duration_minutes === null || body.duration_minutes === ""
          ? null
          : Number(body.duration_minutes)
        : (existing.duration_minutes as number | null);

    if (duration_minutes != null && (!Number.isFinite(duration_minutes) || duration_minutes < 0)) {
      return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
    }

    const [row] = await db`
      UPDATE workouts
      SET
        completed = ${completed},
        notes = ${notes},
        name = ${name},
        duration_minutes = ${duration_minutes}
      WHERE id = ${id}
      RETURNING *
    `;

    return NextResponse.json(row);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update workout" },
      { status: 500 },
    );
  }
}
