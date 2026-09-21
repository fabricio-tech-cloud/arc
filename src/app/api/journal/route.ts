import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const db = sql();
    const rows = await db`
      SELECT * FROM journal
      ORDER BY date DESC, id DESC
      LIMIT 50
    `;
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load journal" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const date = body.date ?? new Date().toISOString().slice(0, 10);
    const db = sql();
    const [row] = await db`
      INSERT INTO journal (date, mood, sleep_hours, energy, notes)
      VALUES (
        ${date},
        ${body.mood ?? null},
        ${body.sleep_hours ?? null},
        ${body.energy ?? null},
        ${body.notes ?? null}
      )
      RETURNING *
    `;
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create journal entry" },
      { status: 500 },
    );
  }
}
