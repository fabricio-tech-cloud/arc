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

function toISODateLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Current calendar week Monday–Sunday (local). */
function weekBounds(d = new Date()) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(d.getDate() + diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { weekStart: toISODateLocal(monday), weekEnd: toISODateLocal(sunday) };
}

function setVolume(reps: unknown, weight: unknown, rir: unknown) {
  const w = weight == null || !Number.isFinite(Number(weight)) ? 0 : Number(weight);
  if (w <= 0) return 0;
  if (Number(rir) === 0 && (reps == null || reps === "")) return w;
  const r = reps == null || !Number.isFinite(Number(reps)) ? 0 : Number(reps);
  return r * w;
}

/** Sets + Volumen → Intensität 0–10 für die BodyMap. */
function intensityFromLoad(setCount: number, volume: number) {
  if (setCount <= 0) return 0;
  const volumeBoost = Math.min(3, Math.floor(volume / 2000));
  return Math.min(10, setCount + volumeBoost);
}

export async function GET() {
  try {
    const db = sql();
    const { weekStart, weekEnd } = weekBounds();

    const rows = await db`
      SELECT
        e.id AS exercise_id,
        e.name,
        e.muscle_group,
        w.date::text AS date,
        w.id AS workout_id,
        w.name AS workout_name,
        w.completed,
        s.id AS set_id,
        s.reps,
        s.weight,
        s.rir,
        coalesce(s.done, false) AS done
      FROM exercises e
      JOIN workouts w ON w.id = e.workout_id
      LEFT JOIN sets s ON s.exercise_id = e.id
      WHERE w.date >= ${weekStart}::date
        AND w.date <= ${weekEnd}::date
      ORDER BY w.date ASC, e.id ASC, s.id ASC
    `;

    type ExAgg = {
      id: string;
      name: string;
      muscle_group: string | null;
      date: string;
      set_count: number;
      volume: number;
      workout_id: string;
      workout_name: string | null;
    };

    const setCounts: Partial<Record<MuscleGroupKey, number>> = {};
    const volumes: Partial<Record<MuscleGroupKey, number>> = {};
    const byExercise = new Map<string, ExAgg>();

    for (const row of rows) {
      const group = resolveMuscleGroup(row.muscle_group as string | null);
      if (!group || row.set_id == null) continue;

      // Ausgeführt = Set abgehakt oder ganze Session beendet
      const executed = Boolean(row.completed) || Boolean(row.done);
      if (!executed) continue;

      const exerciseId = String(row.exercise_id);
      let agg = byExercise.get(exerciseId);
      if (!agg) {
        agg = {
          id: exerciseId,
          name: String(row.name),
          muscle_group: (row.muscle_group as string | null) ?? null,
          date: String(row.date).slice(0, 10),
          set_count: 0,
          volume: 0,
          workout_id: String(row.workout_id),
          workout_name: (row.workout_name as string | null) ?? null,
        };
        byExercise.set(exerciseId, agg);
      }

      agg.set_count += 1;
      const vol = setVolume(row.reps, row.weight, row.rir);
      agg.volume += vol;
      setCounts[group] = (setCounts[group] ?? 0) + 1;
      volumes[group] = (volumes[group] ?? 0) + vol;
    }

    const exercisesByGroup: Record<MuscleGroupKey, ExAgg[]> = {
      Chest: [],
      Shoulders: [],
      Arms: [],
      Back: [],
      Abdominals: [],
      Legs: [],
    };

    for (const agg of byExercise.values()) {
      const group = resolveMuscleGroup(agg.muscle_group);
      if (!group || agg.set_count <= 0) continue;
      exercisesByGroup[group].push({
        ...agg,
        volume: Math.round(agg.volume),
      });
    }

    for (const key of TRAINING_GROUPS) {
      exercisesByGroup[key].sort((a, b) =>
        a.date === b.date ? a.name.localeCompare(b.name) : a.date.localeCompare(b.date),
      );
    }

    const intensityByGroup: Partial<Record<MuscleGroupKey, number>> = {};

    const groups = TRAINING_GROUPS.map((key) => {
      const setCount = setCounts[key] ?? 0;
      const volume = Math.round(volumes[key] ?? 0);
      const intensity = intensityFromLoad(setCount, volume);
      intensityByGroup[key] = intensity;
      const logged = exercisesByGroup[key];
      return {
        key,
        label: GROUP_LABELS[key],
        setCount,
        volume,
        intensity,
        exercises: logged,
        suggestions: logged.length === 0 ? SUGGESTED_EXERCISES[key] : [],
      };
    });

    return NextResponse.json({
      weekStart,
      weekEnd,
      bodyState: bodyStateFromGroupCounts(intensityByGroup),
      groups,
      totalSets: Object.values(setCounts).reduce((a, b) => a + (b ?? 0), 0),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load weekly muscles" },
      { status: 500 },
    );
  }
}
