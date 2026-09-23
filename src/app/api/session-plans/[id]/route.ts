import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import {
  parsePlanExercises,
  type WeekMode,
} from "@/lib/session-schedule";

type Params = { params: Promise<{ id: string }> };

const WEEK_MODES: WeekMode[] = ["every", "A", "B", "interval"];

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const db = sql();
    const [row] = await db`
      SELECT
        id,
        name,
        notes,
        days,
        week_mode,
        interval_weeks,
        anchor_date::text AS anchor_date,
        exercises,
        created_at
      FROM session_plans
      WHERE id = ${id}
    `;
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      ...row,
      exercises: parsePlanExercises(row.exercises),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load session plan" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = sql();

    const [existing] = await db`
      SELECT id FROM session_plans WHERE id = ${id}
    `;
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!Array.isArray(body.days) || body.days.length === 0) {
      return NextResponse.json({ error: "Mindestens ein Wochentag nötig" }, { status: 400 });
    }

    const days = body.days
      .map((d: unknown) => Number(d))
      .filter((d: number) => Number.isInteger(d) && d >= 1 && d <= 7);

    if (days.length === 0) {
      return NextResponse.json({ error: "days must be 1–7 (Mon–Sun)" }, { status: 400 });
    }

    const weekMode: WeekMode = WEEK_MODES.includes(body.week_mode) ? body.week_mode : "every";
    const intervalWeeks =
      weekMode === "interval" ? Math.max(2, Number(body.interval_weeks) || 2) : null;

    const exercises = Array.isArray(body.exercises) ? body.exercises : [];
    if (exercises.length === 0) {
      return NextResponse.json({ error: "Mindestens eine Übung nötig" }, { status: 400 });
    }

    const name =
      body.name == null || body.name === "" ? null : String(body.name).trim() || null;
    const notes =
      body.notes == null || body.notes === "" ? null : String(body.notes).trim() || null;

    const [row] = await db`
      UPDATE session_plans
      SET
        name = ${name},
        notes = ${notes},
        days = ${days}::smallint[],
        week_mode = ${weekMode},
        interval_weeks = ${intervalWeeks},
        exercises = ${JSON.stringify(exercises)}::jsonb
      WHERE id = ${id}
      RETURNING
        id,
        name,
        notes,
        days,
        week_mode,
        interval_weeks,
        anchor_date::text AS anchor_date,
        exercises,
        created_at
    `;

    return NextResponse.json({
      ...row,
      exercises: parsePlanExercises(row.exercises),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update session plan" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const db = sql();
    const [row] = await db`
      DELETE FROM session_plans WHERE id = ${id}
      RETURNING id
    `;
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete session plan" },
      { status: 500 },
    );
  }
}
