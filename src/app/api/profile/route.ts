import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

async function ensureProfile(db: ReturnType<typeof sql>) {
  const [row] = await db`
    INSERT INTO profile (id)
    VALUES (1)
    ON CONFLICT (id) DO UPDATE SET id = profile.id
    RETURNING
      id,
      display_name,
      sex,
      body_weight,
      height_cm,
      units,
      weekly_volume_goal,
      weekly_session_goal,
      default_rir,
      notes,
      updated_at
  `;
  return row;
}

export async function GET() {
  try {
    const db = sql();
    const row = await ensureProfile(db);
    return NextResponse.json(row);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load profile" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const db = sql();
    await ensureProfile(db);

    const units = body.units === "lb" ? "lb" : "kg";
    const sex = body.sex === "female" ? "female" : body.sex === "male" ? "male" : null;
    const displayName =
      body.display_name == null || body.display_name === ""
        ? null
        : String(body.display_name).trim() || null;
    const notes =
      body.notes == null || body.notes === ""
        ? null
        : String(body.notes).trim() || null;

    const numOrNull = (v: unknown) => {
      if (v === "" || v == null) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const bodyWeight = numOrNull(body.body_weight);
    const heightCm = numOrNull(body.height_cm);
    const weeklyVolumeGoal = numOrNull(body.weekly_volume_goal);
    const weeklySessionGoal = numOrNull(body.weekly_session_goal);
    const defaultRir = numOrNull(body.default_rir);

    if (weeklySessionGoal != null && (!Number.isInteger(weeklySessionGoal) || weeklySessionGoal < 0)) {
      return NextResponse.json({ error: "Invalid session goal" }, { status: 400 });
    }

    const [row] = await db`
      UPDATE profile
      SET
        display_name = ${displayName},
        sex = ${sex},
        body_weight = ${bodyWeight},
        height_cm = ${heightCm},
        units = ${units},
        weekly_volume_goal = ${weeklyVolumeGoal},
        weekly_session_goal = ${weeklySessionGoal},
        default_rir = ${defaultRir},
        notes = ${notes},
        updated_at = now()
      WHERE id = 1
      RETURNING
        id,
        display_name,
        sex,
        body_weight,
        height_cm,
        units,
        weekly_volume_goal,
        weekly_session_goal,
        default_rir,
        notes,
        updated_at
    `;

    return NextResponse.json(row);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update profile" },
      { status: 500 },
    );
  }
}
