import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { GROUP_LABELS, resolveMuscleGroup, type MuscleGroupKey } from "@/lib/muscles";

function daysAgoISO(n: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function weekdayLabel(dateStr: string) {
  const days = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
  return days[new Date(dateStr + "T12:00:00").getDay()];
}

function formatSplit(groups: (string | null)[], notes: string | null) {
  const labels = [
    ...new Set(
      groups
        .map((g) => resolveMuscleGroup(g))
        .filter((g): g is MuscleGroupKey => !!g)
        .map((g) => GROUP_LABELS[g]),
    ),
  ];
  if (labels.length) return labels.join(" + ");
  if (notes?.trim()) return notes.trim();
  return "Workout";
}

export async function GET() {
  try {
    const db = sql();
    const since90 = daysAgoISO(90);
    const since7 = daysAgoISO(7);

    const [stats] = await db`
      SELECT
        (SELECT count(*)::int FROM workouts) AS workouts,
        (SELECT count(*)::int FROM exercises) AS exercises,
        (SELECT count(*)::int FROM sets) AS sets,
        (SELECT count(*)::int FROM journal) AS journal_entries,
        (SELECT count(*)::int FROM supplements) AS supplements
    `;

    const recentRows = await db`
      SELECT
        w.id,
        w.date::text AS date,
        w.notes,
        coalesce(
          array_agg(DISTINCT e.muscle_group) FILTER (WHERE e.muscle_group IS NOT NULL),
          '{}'
        ) AS muscle_groups,
        (SELECT count(*)::int FROM exercises e2 WHERE e2.workout_id = w.id) AS exercise_count
      FROM workouts w
      LEFT JOIN exercises e ON e.workout_id = w.id
      GROUP BY w.id, w.date, w.notes
      ORDER BY w.date DESC, w.id DESC
      LIMIT 8
    `;

    const heatRows = await db`
      SELECT w.date::text AS date, count(*)::int AS count
      FROM workouts w
      WHERE w.date >= ${since90}
      GROUP BY w.date
      ORDER BY w.date
    `;

    const [volume] = await db`
      SELECT coalesce(sum(coalesce(s.reps, 0) * coalesce(s.weight, 0)), 0)::float AS total
      FROM sets s
      JOIN exercises e ON e.id = s.exercise_id
      JOIN workouts w ON w.id = e.workout_id
      WHERE w.date >= ${since7}
    `;

    const [latestJournal] = await db`
      SELECT date::text AS date, mood, sleep_hours, energy, notes
      FROM journal
      ORDER BY date DESC, id DESC
      LIMIT 1
    `;

    const heatMap: Record<string, number> = {};
    for (const row of heatRows) {
      heatMap[row.date as string] = Number(row.count);
    }

    const recent = recentRows.map((w, i) => {
      const groups = (w.muscle_groups as (string | null)[]) ?? [];
      return {
        id: w.id as string,
        date: w.date as string,
        notes: w.notes as string | null,
        title: formatSplit(groups, w.notes as string | null),
        weekday: weekdayLabel(w.date as string),
        exercise_count: Number(w.exercise_count) || 0,
        index: i + 1,
      };
    });

    return NextResponse.json({
      stats,
      recent,
      heatMap,
      volume7d: Math.round(Number(volume?.total) || 0),
      latestJournal: latestJournal ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load overview" },
      { status: 500 },
    );
  }
}
