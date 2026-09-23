import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = sql();

    const [existing] = await db`SELECT * FROM sets WHERE id = ${id}`;
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const done =
      typeof body.done === "boolean" ? body.done : (existing.done as boolean);
    const reps =
      body.reps !== undefined
        ? body.reps === null || body.reps === ""
          ? null
          : Number(body.reps)
        : (existing.reps as number | null);
    const weight =
      body.weight !== undefined
        ? body.weight === null || body.weight === ""
          ? null
          : Number(body.weight)
        : (existing.weight as number | null);
    const rir =
      body.rir !== undefined
        ? body.rir === null || body.rir === ""
          ? null
          : Number(body.rir)
        : (existing.rir as number | null);

    const [row] = await db`
      UPDATE sets
      SET
        done = ${done},
        reps = ${reps},
        weight = ${weight},
        rir = ${rir}
      WHERE id = ${id}
      RETURNING *
    `;
    return NextResponse.json(row);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update set" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const db = sql();
    const [row] = await db`
      DELETE FROM sets WHERE id = ${id}
      RETURNING id
    `;
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete set" },
      { status: 500 },
    );
  }
}
