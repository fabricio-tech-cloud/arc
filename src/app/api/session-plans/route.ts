import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import {
  parsePlanExercises,
  type WeekMode,
} from "@/lib/session-schedule";

const WEEK_MODES: WeekMode[] = ["every", "A", "B", "interval"];

export async function GET() {
  try {
    const db = sql();
    const rows = await db`
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
      ORDER BY created_at DESC
    `;
    return NextResponse.json(
      rows.map((row) => ({
        ...row,
        exercises: parsePlanExercises(row.exercises),
      })),
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load session plans" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
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
      weekMode === "interval"
        ? Math.max(2, Number(body.interval_weeks) || 2)
        : null;

    const anchorDate =
      typeof body.anchor_date === "string" && /^\d{4}-\d{2}-\d{2}/.test(body.anchor_date)
        ? body.anchor_date.slice(0, 10)
        : new Date().toISOString().slice(0, 10);

    const exercises = Array.isArray(body.exercises) ? body.exercises : [];
    if (exercises.length === 0) {
      return NextResponse.json({ error: "Mindestens eine Übung nötig" }, { status: 400 });
    }

    const name =
      body.name == null || body.name === "" ? null : String(body.name).trim() || null;
    const notes =
      body.notes == null || body.notes === "" ? null : String(body.notes).trim() || null;

    const db = sql();
    const [row] = await db`
      INSERT INTO session_plans (name, notes, days, week_mode, interval_weeks, anchor_date, exercises)
      VALUES (
        ${name},
        ${notes},
        ${days}::smallint[],
        ${weekMode},
        ${intervalWeeks},
        ${anchorDate}::date,
        ${JSON.stringify(exercises)}::jsonb
      )
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

    return NextResponse.json(
      { ...row, exercises: parsePlanExercises(row.exercises) },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create session plan" },
      { status: 500 },
    );
  }
}
