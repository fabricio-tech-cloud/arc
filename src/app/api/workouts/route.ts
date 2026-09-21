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
    const db = sql();
    const [row] = await db`
      INSERT INTO workouts (date, notes)
      VALUES (${date}, ${notes})
      RETURNING *
    `;
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create workout" },
      { status: 500 },
    );
  }
}
