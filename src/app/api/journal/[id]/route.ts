import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const db = sql();
    const [row] = await db`
      DELETE FROM journal WHERE id = ${id}
      RETURNING id
    `;
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete journal entry" },
      { status: 500 },
    );
  }
}
