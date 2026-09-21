import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const db = sql();
    const rows = await db`
      SELECT
        id,
        catalog_id,
        name,
        dose,
        notes,
        days,
        to_char(time_of_day, 'HH24:MI') AS time_of_day,
        created_at
      FROM supplement_schedules
      ORDER BY time_of_day ASC, name ASC
    `;
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load schedules" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (!Array.isArray(body.days) || body.days.length === 0) {
      return NextResponse.json({ error: "at least one day is required" }, { status: 400 });
    }

    const days = body.days
      .map((d: unknown) => Number(d))
      .filter((d: number) => Number.isInteger(d) && d >= 1 && d <= 7);

    if (days.length === 0) {
      return NextResponse.json({ error: "days must be 1–7 (Mon–Sun)" }, { status: 400 });
    }

    const timeOfDay =
      typeof body.time_of_day === "string" && /^\d{2}:\d{2}$/.test(body.time_of_day)
        ? body.time_of_day
        : "08:00";

    const db = sql();
    const [row] = await db`
      INSERT INTO supplement_schedules (catalog_id, name, dose, notes, days, time_of_day)
      VALUES (
        ${body.catalog_id ?? null},
        ${body.name.trim()},
        ${body.dose ?? null},
        ${body.notes ?? null},
        ${days}::smallint[],
        ${timeOfDay}::time
      )
      RETURNING
        id,
        catalog_id,
        name,
        dose,
        notes,
        days,
        to_char(time_of_day, 'HH24:MI') AS time_of_day,
        created_at
    `;
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create schedule" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const db = sql();
    await db`DELETE FROM supplement_schedules WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete schedule" },
      { status: 500 },
    );
  }
}
