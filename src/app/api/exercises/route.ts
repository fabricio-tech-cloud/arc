import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

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
