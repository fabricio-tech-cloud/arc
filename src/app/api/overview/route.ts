import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import {
  EXERCISE_CATALOG,
  GROUP_ABBR,
  GROUP_LABELS,
  resolveMuscleGroup,
  type MuscleGroupKey,
} from "@/lib/muscles";
import { findCatalogByName, todayIsoWeekday } from "@/lib/supplements";

function daysAgoISO(n: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function startOfWeekISO(d = new Date()) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(d.getDate() + diff);
  return monday;
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function weekdayLabel(dateStr: string) {
  const days = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
  return days[new Date(dateStr + "T12:00:00").getDay()];
}

function groupsToAbbr(groups: (string | null)[]) {
  return [
    ...new Set(
      groups
        .map((g) => resolveMuscleGroup(g))
        .filter((g): g is MuscleGroupKey => !!g)
        .map((g) => GROUP_ABBR[g]),
    ),
  ];
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

function groupsFromAbbr(abbrs: string[]): MuscleGroupKey[] {
  const out: MuscleGroupKey[] = [];
  for (const [key, tag] of Object.entries(GROUP_ABBR) as [MuscleGroupKey, string][]) {
    if (abbrs.includes(tag)) out.push(key);
  }
  return out;
}

const DAY_SHORT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export async function GET() {
  try {
    const db = sql();
    const since90 = daysAgoISO(90);
    const since7 = daysAgoISO(7);
    const weekStart = startOfWeekISO();
    const weekStartISO = toISODate(weekStart);
    const todayISO = toISODate(new Date());
    const todayWd = todayIsoWeekday();

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

    const weekRows = await db`
      SELECT
        w.id,
        w.date::text AS date,
        w.notes,
        coalesce(
          array_agg(DISTINCT e.muscle_group) FILTER (WHERE e.muscle_group IS NOT NULL),
          '{}'
        ) AS muscle_groups
      FROM workouts w
      LEFT JOIN exercises e ON e.workout_id = w.id
      WHERE w.date >= ${weekStartISO}
      GROUP BY w.id, w.date, w.notes
      ORDER BY w.date ASC, w.id ASC
    `;

    const historyRows = await db`
      SELECT
        w.date::text AS date,
        coalesce(
          array_agg(DISTINCT e.muscle_group) FILTER (WHERE e.muscle_group IS NOT NULL),
          '{}'
        ) AS muscle_groups
      FROM workouts w
      LEFT JOIN exercises e ON e.workout_id = w.id
      WHERE w.date >= ${daysAgoISO(56)} AND w.date < ${todayISO}
      GROUP BY w.id, w.date
    `;

    const scheduleRows = await db`
      SELECT
        id,
        catalog_id,
        name,
        dose,
        notes,
        days,
        to_char(time_of_day, 'HH24:MI') AS time_of_day
      FROM supplement_schedules
      ORDER BY time_of_day ASC, name ASC
    `;

    const loggedTodayRows = await db`
      SELECT id, name, dose, time, notes
      FROM supplements
      WHERE time::date = ${todayISO}::date
      ORDER BY time ASC NULLS LAST, id ASC
    `;

    const heatMap: Record<string, number> = {};
    for (const row of heatRows) {
      heatMap[row.date as string] = Number(row.count);
    }

    const byDate = new Map<string, { id: string; abbr: string[]; title: string }>();
    for (const row of weekRows) {
      const date = row.date as string;
      const groups = (row.muscle_groups as (string | null)[]) ?? [];
      const abbr = groupsToAbbr(groups);
      const prev = byDate.get(date);
      if (!prev) {
        byDate.set(date, {
          id: row.id as string,
          abbr,
          title: formatSplit(groups, row.notes as string | null),
        });
      } else {
        byDate.set(date, {
          id: prev.id,
          abbr: [...new Set([...prev.abbr, ...abbr])],
          title: prev.title,
        });
      }
    }

    const todayDow = new Date(todayISO + "T12:00:00").getDay();
    const inferredCount = new Map<string, number>();
    for (const row of historyRows) {
      const date = row.date as string;
      if (new Date(date + "T12:00:00").getDay() !== todayDow) continue;
      for (const tag of groupsToAbbr((row.muscle_groups as (string | null)[]) ?? [])) {
        inferredCount.set(tag, (inferredCount.get(tag) ?? 0) + 1);
      }
    }
    const inferredToday = [...inferredCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag]) => tag);

    const thisWeek = DAY_SHORT.map((label, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const date = toISODate(d);
      const entry = byDate.get(date);
      const isToday = date === todayISO;
      const abbr =
        entry?.abbr?.length
          ? entry.abbr
          : isToday && inferredToday.length
            ? inferredToday
            : [];
      return {
        label,
        date,
        isToday,
        abbr,
        planned: !entry?.abbr?.length && isToday && inferredToday.length > 0,
        workoutId: entry?.id ?? null,
        title: entry?.title ?? null,
      };
    });

    const today = thisWeek.find((d) => d.isToday) ?? null;

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

    const muscleGroups = groupsFromAbbr(today?.abbr ?? []);
    const suggestedExercises = muscleGroups.flatMap((g) =>
      EXERCISE_CATALOG[g]
        .filter((e) => e.focus === "Hypertrophy" || e.focus === "Strength")
        .slice(0, 2)
        .map((e) => ({ name: e.name, focus: e.focus, group: GROUP_LABELS[g] })),
    );

    const loggedNames = new Set(
      loggedTodayRows.map((r) => String(r.name).trim().toLowerCase()).filter(Boolean),
    );

    const supplementsDue = scheduleRows
      .filter((row) => ((row.days as number[]) ?? []).includes(todayWd))
      .map((row) => {
        const name = String(row.name);
        const cat = findCatalogByName(name);
        return {
          id: row.id as string,
          name,
          dose: (row.dose as string | null) ?? null,
          timeOfDay: String(row.time_of_day),
          notes: (row.notes as string | null) ?? null,
          logged: loggedNames.has(name.toLowerCase()),
          imageFile: cat?.imageFile ?? null,
        };
      });

    const supplementsLogged = loggedTodayRows.map((row) => ({
      id: row.id as string,
      name: String(row.name),
      dose: (row.dose as string | null) ?? null,
      time: row.time ? String(row.time) : null,
      notes: (row.notes as string | null) ?? null,
    }));

    const todayPlan = {
      date: todayISO,
      workout: today
        ? {
            title:
              today.title ??
              (muscleGroups.length
                ? muscleGroups.map((g) => GROUP_LABELS[g]).join(" + ")
                : null),
            abbr: today.abbr,
            planned: !!today.planned,
            workoutId: today.workoutId,
            status: today.workoutId
              ? ("logged" as const)
              : today.abbr.length
                ? ("planned" as const)
                : ("rest" as const),
            groups: muscleGroups.map((g) => ({
              key: g,
              label: GROUP_LABELS[g],
              abbr: GROUP_ABBR[g],
            })),
            suggestedExercises,
          }
        : null,
      supplementsDue,
      supplementsLogged,
      journal:
        latestJournal && (latestJournal.date as string) === todayISO
          ? {
              mood: latestJournal.mood as number | null,
              sleep_hours: latestJournal.sleep_hours as number | null,
              energy: latestJournal.energy as number | null,
              notes: latestJournal.notes as string | null,
            }
          : null,
    };

    return NextResponse.json({
      stats,
      recent,
      heatMap,
      volume7d: Math.round(Number(volume?.total) || 0),
      latestJournal: latestJournal ?? null,
      thisWeek,
      today,
      todayPlan,
      weekStart: weekStartISO,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load overview" },
      { status: 500 },
    );
  }
}
