import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { exercise_id, reps, weight, rir } = body;
    if (!exercise_id) {
      return NextResponse.json({ error: "exercise_id is required" }, { status: 400 });
    }
    const db = sql();
    const [row] = await db`
      INSERT INTO sets (exercise_id, reps, weight, rir)
      VALUES (${exercise_id}, ${reps ?? null}, ${weight ?? null}, ${rir ?? null})
      RETURNING *
    `;
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create set" },
      { status: 500 },
    );
  }
}
