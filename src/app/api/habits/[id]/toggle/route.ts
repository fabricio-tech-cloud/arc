import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { toISODateLocal } from "@/lib/habits";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const date =
      typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}/.test(body.date)
        ? body.date.slice(0, 10)
        : toISODateLocal();

    const db = sql();
    const [habit] = await db`SELECT id FROM habits WHERE id = ${id}`;
    if (!habit) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [existing] = await db`
      SELECT id FROM habit_logs
      WHERE habit_id = ${id} AND date = ${date}::date
    `;

    if (existing) {
      await db`DELETE FROM habit_logs WHERE id = ${existing.id}`;
      return NextResponse.json({ done: false, date });
    }

    await db`
      INSERT INTO habit_logs (habit_id, date)
      VALUES (${id}, ${date}::date)
    `;
    return NextResponse.json({ done: true, date });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to toggle habit" },
      { status: 500 },
    );
  }
}
