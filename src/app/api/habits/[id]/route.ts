import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { HABIT_COLORS, parseHabitIcon } from "@/lib/habits";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = sql();

    const [existing] = await db`SELECT id FROM habits WHERE id = ${id}`;
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const name =
      body.name == null ? undefined : String(body.name).trim() || null;
    if (name === null) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const description =
      body.description === undefined
        ? undefined
        : body.description == null || body.description === ""
          ? null
          : String(body.description).trim() || null;

    const color =
      body.color === undefined
        ? undefined
        : typeof body.color === "string" && /^#[0-9a-fA-F]{6}$/.test(body.color)
          ? body.color
          : HABIT_COLORS[0];

    const icon = body.icon === undefined ? undefined : parseHabitIcon(body.icon);
    const target =
      body.target_per_week === undefined
        ? undefined
        : Math.min(7, Math.max(1, Number(body.target_per_week) || 4));

    const [row] = await db`
      UPDATE habits
      SET
        name = coalesce(${name ?? null}, name),
        description = CASE
          WHEN ${description === undefined} THEN description
          ELSE ${description}
        END,
        color = coalesce(${color ?? null}, color),
        icon = coalesce(${icon ?? null}, icon),
        target_per_week = coalesce(${target ?? null}, target_per_week)
      WHERE id = ${id}
      RETURNING id, name, description, color, icon, target_per_week, created_at
    `;

    return NextResponse.json({
      ...row,
      icon: parseHabitIcon(row.icon),
      targetPerWeek: Number(row.target_per_week),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update habit" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const db = sql();
    const [row] = await db`
      DELETE FROM habits WHERE id = ${id} RETURNING id
    `;
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete habit" },
      { status: 500 },
    );
  }
}
