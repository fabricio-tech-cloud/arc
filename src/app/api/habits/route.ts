import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import {
  HABIT_COLORS,
  computeStreak,
  countThisWeek,
  heatmapDates,
  parseHabitIcon,
  toISODateLocal,
} from "@/lib/habits";

const WEEKS = 20;

export async function GET() {
  try {
    const db = sql();
    const today = toISODateLocal();
    const grid = heatmapDates(WEEKS);
    const since = grid[0]?.[0] ?? today;

    const habits = await db`
      SELECT
        id,
        name,
        description,
        color,
        icon,
        target_per_week,
        created_at
      FROM habits
      ORDER BY created_at ASC
    `;

    if (habits.length === 0) {
      return NextResponse.json({ habits: [], today, weeks: WEEKS });
    }

    const ids = habits.map((h) => h.id as string);
    const logs = await db`
      SELECT habit_id, date::text AS date, note
      FROM habit_logs
      WHERE habit_id = ANY(${ids}::uuid[])
        AND date >= ${since}::date
      ORDER BY date ASC
    `;

    const byHabit = new Map<string, Set<string>>();
    const notesByKey = new Map<string, string | null>();
    for (const row of logs) {
      const hid = String(row.habit_id);
      const date = String(row.date).slice(0, 10);
      if (!byHabit.has(hid)) byHabit.set(hid, new Set());
      byHabit.get(hid)!.add(date);
      notesByKey.set(`${hid}:${date}`, (row.note as string | null) ?? null);
    }

    return NextResponse.json({
      today,
      weeks: WEEKS,
      habits: habits.map((h) => {
        const id = String(h.id);
        const dates = byHabit.get(id) ?? new Set<string>();
        const weekCount = countThisWeek(dates);
        const target = Number(h.target_per_week) || 4;
        return {
          id,
          name: String(h.name),
          description: (h.description as string | null) ?? null,
          color: String(h.color || HABIT_COLORS[0]),
          icon: parseHabitIcon(h.icon),
          targetPerWeek: target,
          streak: computeStreak(dates),
          weekCount,
          doneToday: dates.has(today),
          completedDates: [...dates].sort(),
        };
      }),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load habits" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const description =
      body.description == null || body.description === ""
        ? null
        : String(body.description).trim() || null;
    const color =
      typeof body.color === "string" && /^#[0-9a-fA-F]{6}$/.test(body.color)
        ? body.color
        : HABIT_COLORS[0];
    const icon = parseHabitIcon(body.icon);
    const target = Math.min(7, Math.max(1, Number(body.target_per_week) || 4));

    const db = sql();
    const [row] = await db`
      INSERT INTO habits (name, description, color, icon, target_per_week)
      VALUES (${name}, ${description}, ${color}, ${icon}, ${target})
      RETURNING id, name, description, color, icon, target_per_week, created_at
    `;

    return NextResponse.json(
      {
        ...row,
        icon: parseHabitIcon(row.icon),
        targetPerWeek: Number(row.target_per_week),
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create habit" },
      { status: 500 },
    );
  }
}
