import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import {
  parsePlanExercises,
  planMatchesDate,
  toISODateLocal,
  type WeekMode,
} from "@/lib/session-schedule";

/** Start (or resume) today's active workout from a matching session plan. */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const db = sql();
    const today = toISODateLocal(new Date());

    const [existing] = await db`
      SELECT id, name, completed
      FROM workouts
      WHERE date = ${today}::date AND completed = false
      ORDER BY id DESC
      LIMIT 1
    `;
    if (existing) {
      return NextResponse.json({ id: existing.id, resumed: true });
    }

    let planId = typeof body.plan_id === "string" ? body.plan_id : null;
    let planName: string | null =
      typeof body.name === "string" && body.name.trim() ? body.name.trim() : null;
    let exercises = Array.isArray(body.exercises) ? body.exercises : [];

    if (!exercises.length) {
      const planRows = await db`
        SELECT
          id,
          name,
          days,
          week_mode,
          interval_weeks,
          anchor_date::text AS anchor_date,
          exercises
        FROM session_plans
        ORDER BY created_at ASC
      `;

      const plans = planRows.map((row) => ({
        id: String(row.id),
        name: (row.name as string | null) ?? null,
        days: (row.days as number[]) ?? [],
        week_mode: (row.week_mode as WeekMode) ?? "every",
        interval_weeks: row.interval_weeks == null ? null : Number(row.interval_weeks),
        anchor_date: String(row.anchor_date).slice(0, 10),
        exercises: parsePlanExercises(row.exercises),
      }));

      const due = plans.filter((p) => planMatchesDate(p, today));
      const plan = planId ? due.find((p) => p.id === planId) ?? due[0] : due[0];
      if (plan) {
        planId = plan.id;
        planName = plan.name ?? planName;
        exercises = plan.exercises;
      }
    }

    if (!exercises.length) {
      return NextResponse.json(
        { error: "Keine geplante Session für heute" },
        { status: 400 },
      );
    }

    const [workout] = await db`
      INSERT INTO workouts (date, name, notes, completed)
      VALUES (${today}, ${planName}, ${null}, false)
      RETURNING *
    `;

    for (const ex of exercises) {
      if (!ex?.name) continue;
      const [exercise] = await db`
        INSERT INTO exercises (workout_id, name, muscle_group)
        VALUES (${workout.id}, ${String(ex.name)}, ${ex.muscle_group ?? null})
        RETURNING *
      `;
      const sets = Array.isArray(ex.sets) ? ex.sets : [];
      for (const s of sets) {
        const failure = Boolean(s.failure);
        const reps = s.reps === "" || s.reps == null ? null : Number(s.reps);
        const weight = s.weight === "" || s.weight == null ? null : Number(s.weight);
        const rir = failure
          ? 0
          : s.rir === "" || s.rir == null
            ? null
            : Number(s.rir);
        if (!failure && reps == null && weight == null && rir == null) {
          await db`
            INSERT INTO sets (exercise_id, reps, weight, rir, done)
            VALUES (${exercise.id}, null, null, null, false)
          `;
          continue;
        }
        await db`
          INSERT INTO sets (exercise_id, reps, weight, rir, done)
          VALUES (
            ${exercise.id},
            ${Number.isFinite(reps as number) ? reps : null},
            ${Number.isFinite(weight as number) ? weight : null},
            ${rir == null || !Number.isFinite(rir) ? null : rir},
            false
          )
        `;
      }
      if (sets.length === 0) {
        await db`
          INSERT INTO sets (exercise_id, reps, weight, rir, done)
          VALUES (${exercise.id}, null, null, null, false)
        `;
      }
    }

    return NextResponse.json({ id: workout.id, resumed: false }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start session" },
      { status: 500 },
    );
  }
}
