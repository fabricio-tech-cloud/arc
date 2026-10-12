import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ATHLETIC_BY_KEY } from "@/lib/ratings";

export async function GET() {
  try {
    const db = sql();
    const rows = await db`
      SELECT id, discipline, value, recorded_at::text AS recorded_at, notes, created_at
      FROM athletic_stats
      ORDER BY recorded_at DESC, created_at DESC
      LIMIT 300
    `;
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load athletic stats" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const discipline = typeof body.discipline === "string" ? body.discipline : "";
    if (!ATHLETIC_BY_KEY[discipline]) {
      return NextResponse.json({ error: "Invalid discipline" }, { status: 400 });
    }
    const value = Number(body.value);
    if (!Number.isFinite(value) || value <= 0) {
      return NextResponse.json({ error: "Invalid value" }, { status: 400 });
    }
    const recordedAt =
      typeof body.recorded_at === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.recorded_at)
        ? body.recorded_at
        : null;
    const notes =
      body.notes == null || body.notes === "" ? null : String(body.notes).trim() || null;

    const db = sql();
    const [row] = await db`
      INSERT INTO athletic_stats (discipline, value, recorded_at, notes)
      VALUES (
        ${discipline},
        ${value},
        coalesce(${recordedAt}::date, current_date),
        ${notes}
      )
      RETURNING id, discipline, value, recorded_at::text AS recorded_at, notes, created_at
    `;
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create athletic stat" },
      { status: 500 },
    );
  }
}
