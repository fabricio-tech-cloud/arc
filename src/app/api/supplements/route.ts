import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const db = sql();
    const rows = await db`
      SELECT * FROM supplements
      ORDER BY time DESC NULLS LAST, id DESC
      LIMIT 50
    `;
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load supplements" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const db = sql();
    const [row] = await db`
      INSERT INTO supplements (name, dose, time, notes)
      VALUES (
        ${body.name},
        ${body.dose ?? null},
        ${body.time ?? null},
        ${body.notes ?? null}
      )
      RETURNING *
    `;
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create supplement" },
      { status: 500 },
    );
  }
}
