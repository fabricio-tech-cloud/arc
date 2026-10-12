import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import {
  ATHLETIC_BY_KEY,
  aggregateRadar,
  estimate1RM,
  formatAthleticValue,
  rateAthletic,
  rateStrength,
  tierFor,
  type AthleticEntry,
  type Sex,
  type StrengthEntry,
} from "@/lib/ratings";

export async function GET() {
  try {
    const db = sql();
    const [[profile], records, logged, stats] = await Promise.all([
      db`SELECT body_weight, sex FROM profile WHERE id = 1`,
      db`
        SELECT id, exercise_name, muscle_group, weight, reps, recorded_at::text AS recorded_at
        FROM strength_records
      `,
      db`
        SELECT e.name AS exercise_name, e.muscle_group, s.weight, s.reps, s.rir, w.date::text AS date
        FROM sets s
        JOIN exercises e ON e.id = s.exercise_id
        JOIN workouts w ON w.id = e.workout_id
        WHERE (w.completed = true OR coalesce(s.done, false) = true)
          AND s.weight IS NOT NULL AND s.weight > 0
      `,
      db`
        SELECT id, discipline, value, recorded_at::text AS recorded_at
        FROM athletic_stats
        ORDER BY recorded_at DESC, created_at DESC
      `,
    ]);

    const sex: Sex = profile?.sex === "female" ? "female" : "male";
    const bodyWeightRaw = profile?.body_weight == null ? null : Number(profile.body_weight);
    const bodyWeightAssumed = bodyWeightRaw == null || !Number.isFinite(bodyWeightRaw) || bodyWeightRaw <= 0;
    const bodyWeight = bodyWeightAssumed ? (sex === "female" ? 65 : 80) : bodyWeightRaw!;

    /* ---- Strength: best per exercise (manual records + logged sets) ---- */
    type Candidate = {
      exerciseName: string;
      muscleGroup: string | null;
      weight: number;
      reps: number;
      source: "record" | "log";
      recordId: string | null;
      recordedAt: string | null;
    };
    const best = new Map<string, Candidate & { est1rm: number }>();

    const consider = (c: Candidate) => {
      const key = c.exerciseName.trim().toLowerCase();
      if (!key) return;
      const est1rm = estimate1RM(c.weight, c.reps);
      const prev = best.get(key);
      if (!prev || est1rm > prev.est1rm || (est1rm === prev.est1rm && c.source === "record")) {
        best.set(key, { ...c, est1rm });
      }
    };

    for (const r of records) {
      consider({
        exerciseName: String(r.exercise_name),
        muscleGroup: (r.muscle_group as string | null) ?? null,
        weight: Number(r.weight),
        reps: Number(r.reps) || 1,
        source: "record",
        recordId: String(r.id),
        recordedAt: String(r.recorded_at),
      });
    }
    for (const r of logged) {
      const reps = r.reps == null ? (Number(r.rir) === 0 ? 1 : null) : Number(r.reps);
      if (reps == null || reps <= 0) continue;
      consider({
        exerciseName: String(r.exercise_name),
        muscleGroup: (r.muscle_group as string | null) ?? null,
        weight: Number(r.weight),
        reps,
        source: "log",
        recordId: null,
        recordedAt: String(r.date),
      });
    }

    const strength: StrengthEntry[] = [...best.entries()]
      .map(([key, c]) => {
        const rated = rateStrength({
          exerciseName: c.exerciseName,
          muscleGroup: c.muscleGroup,
          weight: c.weight,
          reps: c.reps,
          bodyWeight,
          sex,
        });
        return {
          key,
          exerciseName: c.exerciseName,
          muscleGroup: c.muscleGroup,
          weight: c.weight,
          reps: c.reps,
          est1rm: rated.est1rm,
          ratio: rated.ratio,
          rating: rated.rating,
          tier: rated.tier.label,
          family: rated.family,
          axis: rated.axis,
          mode: rated.mode,
          source: c.source,
          recordId: c.recordId,
          recordedAt: c.recordedAt,
        };
      })
      .sort((a, b) => b.rating - a.rating);

    /* ---- Athletics: best per discipline + history ---- */
    const byDiscipline = new Map<string, typeof stats>();
    for (const s of stats) {
      const k = String(s.discipline);
      if (!ATHLETIC_BY_KEY[k]) continue;
      const list = byDiscipline.get(k) ?? [];
      list.push(s);
      byDiscipline.set(k, list);
    }

    const athletics: AthleticEntry[] = [...byDiscipline.entries()]
      .map(([key, list]) => {
        const d = ATHLETIC_BY_KEY[key]!;
        const sorted = [...list].sort((a, b) =>
          d.better === "lower" ? Number(a.value) - Number(b.value) : Number(b.value) - Number(a.value),
        );
        const top = sorted[0]!;
        const value = Number(top.value);
        const rated = rateAthletic(key, value, sex)!;
        const history = [...list]
          .sort((a, b) => String(b.recorded_at).localeCompare(String(a.recorded_at)))
          .map((h) => {
            const v = Number(h.value);
            return {
              id: String(h.id),
              value: v,
              formatted: formatAthleticValue(d, v),
              recordedAt: String(h.recorded_at),
              rating: rateAthletic(key, v, sex)?.rating ?? 0,
            };
          });
        return {
          key,
          label: d.label,
          category: d.category,
          value,
          formatted: formatAthleticValue(d, value),
          unit: d.unit,
          rating: rated.rating,
          tier: rated.tier.label,
          axis: rated.axis,
          recordId: String(top.id),
          recordedAt: String(top.recorded_at),
          history,
        };
      })
      .sort((a, b) => b.rating - a.rating);

    /* ---- Radar ---- */
    const radar = aggregateRadar([
      ...strength.map((s) => ({ axis: s.axis, rating: s.rating })),
      ...athletics.map((a) => ({ axis: a.axis, rating: a.rating })),
    ]);

    const strengthOnly = aggregateRadar(strength.map((s) => ({ axis: s.axis, rating: s.rating })));
    const athleticsOnly = aggregateRadar(athletics.map((a) => ({ axis: a.axis, rating: a.rating })));

    return NextResponse.json({
      profile: { bodyWeight, bodyWeightAssumed, sex },
      overall: radar.overall,
      overallTier: tierFor(radar.overall).label,
      populatedAxes: radar.populated,
      radar: radar.axes,
      strengthScore: strengthOnly.overall,
      athleticsScore: athleticsOnly.overall,
      strength,
      athletics,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to compute ratings" },
      { status: 500 },
    );
  }
}
