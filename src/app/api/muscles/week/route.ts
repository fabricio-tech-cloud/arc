import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import {
  GROUP_LABELS,
  SUGGESTED_EXERCISES,
  TRAINING_GROUPS,
  bodyStateFromGroupCounts,
  resolveMuscleGroup,
  type MuscleGroupKey,
} from "@/lib/muscles";

function startOfWeekISO(d = new Date()) {
  const day = d.getDay(); // 0 Sun … 6 Sat
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  const monday = new Date(d);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(d.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const db = sql();
    const weekStart = startOfWeekISO();
    const rows = await db`
      SELECT
        e.id AS exercise_id,
        e.name,
        e.muscle_group,
        w.date,
        w.id AS workout_id,
        (SELECT count(*)::int FROM sets s WHERE s.exercise_id = e.id) AS set_count
      FROM exercises e
      JOIN workouts w ON w.id = e.workout_id
      WHERE w.date >= ${weekStart}
      ORDER BY w.date DESC, e.id
    `;

    const counts: Partial<Record<MuscleGroupKey, number>> = {};
    const exercisesByGroup: Record<
      MuscleGroupKey,
      { id: string; name: string; muscle_group: string | null; date: string; set_count: number; workout_id: string }[]
    > = {
      Chest: [],
      Shoulders: [],
      Arms: [],
      Back: [],
      Abdominals: [],
      Legs: [],
    };

    for (const row of rows) {
      const group = resolveMuscleGroup(row.muscle_group as string | null);
      if (!group) continue;
      const sets = Number(row.set_count) || 0;
      counts[group] = (counts[group] ?? 0) + Math.max(sets, 1);
      exercisesByGroup[group].push({
        id: row.exercise_id as string,
        name: row.name as string,
        muscle_group: row.muscle_group as string | null,
        date: String(row.date),
        set_count: sets,
        workout_id: row.workout_id as string,
      });
    }

    const groups = TRAINING_GROUPS.map((key) => {
      const setCount = counts[key] ?? 0;
      const intensity = Math.min(10, setCount);
      const logged = exercisesByGroup[key];
      return {
        key,
        label: GROUP_LABELS[key],
        setCount,
        intensity,
        exercises: logged,
        suggestions: logged.length === 0 ? SUGGESTED_EXERCISES[key] : [],
      };
    });

    return NextResponse.json({
      weekStart,
      bodyState: bodyStateFromGroupCounts(counts),
      groups,
      totalSets: Object.values(counts).reduce((a, b) => a + (b ?? 0), 0),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load weekly muscles" },
      { status: 500 },
    );
  }
}
