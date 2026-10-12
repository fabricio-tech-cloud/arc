"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { RadarChart, type RadarDatum } from "@/components/RadarChart";
import { allCatalogExerciseNames } from "@/lib/achievements";
import {
  ATHLETIC_BY_KEY,
  ATHLETIC_DISCIPLINES,
  TIERS,
  parseTimeInput,
  rateStrength,
  tierFor,
  type AthleticDiscipline,
  type AthleticEntry,
  type RadarAxis,
  type Sex,
  type StrengthEntry,
} from "@/lib/ratings";

type RatingsPayload = {
  profile: { bodyWeight: number; bodyWeightAssumed: boolean; sex: Sex };
  overall: number;
  overallTier: string;
  populatedAxes: number;
  radar: { axis: RadarAxis; value: number; count: number }[];
  strengthScore: number;
  athleticsScore: number;
  strength: StrengthEntry[];
  athletics: AthleticEntry[];
};

type RadarMode = "overview" | "strength" | "athletics";

const TIER_COLORS: Record<string, string> = {
  Beginner: "text-white/45",
  Novice: "text-[#d4c8fc]",
  Intermediate: "text-[#a78bfa]",
  Advanced: "text-[#8b5cf6]",
  Elite: "text-emerald-300",
};

function tierClass(tier: string) {
  return TIER_COLORS[tier] ?? "text-[var(--muted)]";
}

function RatingBadge({ rating, tier }: { rating: number; tier: string }) {
  return (
    <div className="flex shrink-0 flex-col items-end">
      <span className="text-lg font-semibold tabular-nums leading-none text-white">{rating}</span>
      <span className={`mt-0.5 text-[11px] ${tierClass(tier)}`}>{tier}</span>
    </div>
  );
}

function ScoreBar({ value, done }: { value: number; done?: boolean }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${
          done ? "bg-emerald-400" : "bg-[#a78bfa]"
        }`}
        style={{ width: `${Math.max(2, value)}%` }}
      />
    </div>
  );
}

const CATEGORY_ORDER: AthleticDiscipline["category"][] = [
  "Sprint",
  "Agility",
  "Jump",
  "Run",
  "Endurance",
  "Calisthenics",
];

export function RatingsPanel() {
  const [data, setData] = useState<RatingsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<RadarMode>("overview");
  const [expandedAthletic, setExpandedAthletic] = useState<string | null>(null);

  // strength form
  const [exQuery, setExQuery] = useState("");
  const [exName, setExName] = useState("");
  const [exWeight, setExWeight] = useState("");
  const [exReps, setExReps] = useState("1");
  const [exOpen, setExOpen] = useState(false);
  const [addingStrength, setAddingStrength] = useState(false);

  // athletics form
  const [discipline, setDiscipline] = useState<string>(ATHLETIC_DISCIPLINES[0]!.key);
  const [athValue, setAthValue] = useState("");
  const [addingAth, setAddingAth] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const catalog = useMemo(() => allCatalogExerciseNames(), []);
  const filteredExercises = useMemo(() => {
    const q = exQuery.trim().toLowerCase();
    if (!q) return [];
    return catalog.filter((n) => n.toLowerCase().includes(q)).slice(0, 8);
  }, [catalog, exQuery]);

  const load = useCallback(() => {
    fetch("/api/ratings")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed");
        setData(json as RatingsPayload);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedDiscipline = ATHLETIC_BY_KEY[discipline]!;

  /* Live preview for strength input */
  const preview = useMemo(() => {
    const w = Number(exWeight);
    const r = Number(exReps) || 1;
    const name = exName || exQuery;
    if (!data || !name.trim() || !Number.isFinite(w) || w <= 0) return null;
    return rateStrength({
      exerciseName: name,
      weight: w,
      reps: r,
      bodyWeight: data.profile.bodyWeight,
      sex: data.profile.sex,
    });
  }, [data, exName, exQuery, exWeight, exReps]);

  const radarData: RadarDatum[] = useMemo(() => {
    if (!data) return [];
    if (mode === "overview") {
      return data.radar.map((a) => ({
        label: a.axis,
        value: a.value,
        detail: a.count ? `${a.count} entries` : "no data",
      }));
    }
    if (mode === "strength") {
      return data.strength.slice(0, 10).map((s) => ({
        label: s.exerciseName.length > 18 ? `${s.exerciseName.slice(0, 17)}…` : s.exerciseName,
        value: s.rating,
        detail: `${s.weight} kg × ${s.reps} · 1RM ≈ ${s.est1rm} kg · ${s.tier}`,
      }));
    }
    return data.athletics.slice(0, 10).map((a) => ({
      label: a.label.length > 18 ? `${a.label.slice(0, 17)}…` : a.label,
      value: a.rating,
      detail: `${a.formatted} · ${a.tier}`,
    }));
  }, [data, mode]);

  async function addStrength(e: FormEvent) {
    e.preventDefault();
    const name = (exName || exQuery).trim();
    if (!name || addingStrength) return;
    setAddingStrength(true);
    setError(null);
    try {
      const res = await fetch("/api/strength-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exercise_name: name, weight: exWeight, reps: exReps }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setExQuery("");
      setExName("");
      setExWeight("");
      setExReps("1");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setAddingStrength(false);
    }
  }

  async function addAthletic(e: FormEvent) {
    e.preventDefault();
    if (addingAth) return;
    const value =
      selectedDiscipline.input === "time" ? parseTimeInput(athValue) : Number(athValue.replace(",", "."));
    if (value == null || !Number.isFinite(value) || value <= 0) {
      setError("Invalid value");
      return;
    }
    setAddingAth(true);
    setError(null);
    try {
      const res = await fetch("/api/athletics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discipline, value }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setAthValue("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setAddingAth(false);
    }
  }

  async function remove(kind: "strength" | "athletics", id: string) {
    setDeletingId(id);
    setError(null);
    try {
      const url = kind === "strength" ? `/api/strength-records/${id}` : `/api/athletics/${id}`;
      const res = await fetch(url, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setDeletingId(null);
    }
  }

  const overallTier = data ? tierFor(data.overall) : TIERS[0]!;

  return (
    <section className="space-y-4">
      <div>
        <h2
          className="text-xl font-normal"
          style={{ fontFamily: '"Times New Roman", Times, serif' }}
        >
          Athlete rating
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Strength and athletics on a 0-100 scale, relative to body weight and real-world standards.
        </p>
      </div>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      {/* Overall + radar */}
      <div className="rounded-[1.75rem] bg-[var(--bg-elevated)] p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[13px] text-white/40">Overall</p>
            <p className="mt-0.5 text-[2.4rem] font-semibold leading-none tabular-nums tracking-tight text-white">
              {data?.overall ?? 0}
              <span className="ml-1 text-sm font-normal text-white/40">/ 100</span>
            </p>
            <p className={`mt-1 text-sm ${tierClass(overallTier.label)}`}>{overallTier.label}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-right">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-white/35">Strength</p>
              <p className="text-lg font-semibold tabular-nums text-white">{data?.strengthScore ?? 0}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-white/35">Athletics</p>
              <p className="text-lg font-semibold tabular-nums text-white">{data?.athleticsScore ?? 0}</p>
            </div>
          </div>
        </div>

        {data?.profile.bodyWeightAssumed && (
          <p className="mt-3 rounded-[1rem] bg-[var(--warn)]/10 px-3 py-2 text-xs text-[var(--warn)]">
            No body weight on file - strength ratings use {data.profile.bodyWeight} kg as an assumption.
            Add it in Settings above.
          </p>
        )}

        <div className="mt-4 arc-tabbar-glass relative grid grid-cols-3 rounded-full p-0.5">
          <span
            aria-hidden
            className="arc-tab-active pointer-events-none absolute inset-y-0.5 left-0.5 w-[calc(33.333%-2px)] rounded-full transition-transform duration-300 ease-out"
            style={{
              transform: `translateX(${mode === "overview" ? 0 : mode === "strength" ? 100 : 200}%)`,
            }}
          />
          {(
            [
              ["overview", "Overview"],
              ["strength", "Strength"],
              ["athletics", "Athletics"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`relative z-10 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-300 ${
                mode === m ? "text-white arc-tab-glow" : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-2">
          {radarData.length === 0 || radarData.every((d) => d.value === 0) ? (
            <div className="relative">
              <div className="pointer-events-none opacity-40">
                <RadarChart data={radarData} height={280} />
              </div>
              <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm text-[var(--muted)]">
                {mode === "overview"
                  ? "No data yet - add records or athletic values below."
                  : mode === "strength"
                    ? "No strength records yet."
                    : "No athletic values yet."}
              </p>
            </div>
          ) : (
            <RadarChart data={radarData} height={300} />
          )}
        </div>

        {mode === "overview" && data && (
          <ul className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
            {data.radar.map((a) => (
              <li key={a.axis} className="rounded-[1rem] bg-[var(--bg)] px-2 py-2">
                <p className="text-white/45">{a.axis}</p>
                <p className="mt-0.5 text-base font-semibold tabular-nums text-white">
                  {a.count ? a.value : "—"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Tier legend */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[11px] text-white/40">
        {TIERS.map((t) => (
          <span key={t.key} className="flex items-center gap-1">
            <span className={`font-medium ${tierClass(t.label)}`}>{t.label}</span>
            <span>from {t.min}</span>
          </span>
        ))}
      </div>

      {/* ---------------- Strength ---------------- */}
      <div className="space-y-3">
        <h3
          className="text-lg font-normal"
          style={{ fontFamily: '"Times New Roman", Times, serif' }}
        >
          Strength records
        </h3>

        <form
          onSubmit={addStrength}
          className="space-y-3 rounded-[1.75rem] bg-[var(--bg-elevated)] p-4"
        >
          <div className="relative">
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--muted)]">Exercise</span>
              <input
                value={exQuery}
                onChange={(e) => {
                  setExQuery(e.target.value);
                  setExName("");
                  setExOpen(true);
                }}
                onFocus={() => setExOpen(true)}
                onBlur={() => setTimeout(() => setExOpen(false), 120)}
                placeholder="Bench Press, Squat, Deadlift…"
                className="w-full rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]"
              />
            </label>
            {exOpen && filteredExercises.length > 0 && !exName && (
              <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#1c1c1e] shadow-xl">
                {filteredExercises.map((name) => (
                  <li key={name}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setExName(name);
                        setExQuery(name);
                        setExOpen(false);
                      }}
                      className="block w-full truncate px-3 py-2 text-left text-sm text-[var(--text)] hover:bg-white/5"
                    >
                      {name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--muted)]">Weight (kg)</span>
              <input
                type="number"
                step="0.5"
                min={0}
                inputMode="decimal"
                required
                value={exWeight}
                onChange={(e) => setExWeight(e.target.value)}
                placeholder="150"
                className="w-full rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--muted)]">Reps</span>
              <input
                type="number"
                min={1}
                max={50}
                inputMode="numeric"
                required
                value={exReps}
                onChange={(e) => setExReps(e.target.value)}
                className="w-full rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]"
              />
            </label>
          </div>

          {preview && (
            <div className="flex items-center justify-between rounded-[1.25rem] bg-[var(--bg)] px-3 py-2.5">
              <div className="text-xs text-[var(--muted)]">
                <p>
                  1RM ≈ <span className="tabular-nums text-white">{preview.est1rm} kg</span>
                  {" · "}
                  <span className="tabular-nums text-white">{preview.ratio}×</span> BW
                </p>
                <p className="mt-0.5">{preview.family}{preview.mode === "per_hand" ? " · per hand" : preview.mode === "added" ? " · added load" : ""}</p>
              </div>
              <RatingBadge rating={preview.rating} tier={preview.tier.label} />
            </div>
          )}

          <button
            type="submit"
            disabled={addingStrength || !(exName || exQuery.trim()) || !exWeight}
            className="w-full rounded-[1.75rem] border border-[var(--accent)]/35 bg-emerald-500/15 px-4 py-2.5 font-semibold text-[var(--accent)] transition hover:bg-emerald-500/25 hover:text-white disabled:opacity-60"
          >
            {addingStrength ? "..." : "Add record"}
          </button>
        </form>

        <ul className="space-y-2">
          {data && data.strength.length === 0 && (
            <li className="rounded-[1.75rem] bg-[var(--bg-elevated)] px-4 py-5 text-center text-sm text-[var(--muted)]">
              No records yet. Enter weight x reps - or log sessions with kg and they sync automatically.
            </li>
          )}
          {data?.strength.map((s) => (
            <li key={s.key} className="rounded-[1.75rem] bg-[var(--bg-elevated)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--text)]">{s.exerciseName}</p>
                  <p className="mt-0.5 text-xs tabular-nums text-[var(--muted)]">
                    {s.weight} kg × {s.reps}
                    {" · "}1RM ≈ {s.est1rm} kg
                    {" · "}{s.ratio}× BW
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/35">
                    {s.family}
                    {s.mode === "per_hand" ? " · per hand" : s.mode === "added" ? " · added load" : ""}
                    {" · "}
                    {s.source === "log" ? "from session" : "manual"}
                    {s.recordedAt ? ` · ${s.recordedAt.slice(8, 10)}.${s.recordedAt.slice(5, 7)}.` : ""}
                  </p>
                </div>
                <RatingBadge rating={s.rating} tier={s.tier} />
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1">
                  <ScoreBar value={s.rating} done={s.rating >= 80} />
                </div>
                {s.recordId && (
                  <button
                    type="button"
                    disabled={deletingId === s.recordId}
                    onClick={() => void remove("strength", s.recordId!)}
                    className="shrink-0 text-xs text-[var(--muted)] hover:text-[var(--danger)] disabled:opacity-50"
                  >
                    {deletingId === s.recordId ? "..." : "Delete"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* ---------------- Athletics ---------------- */}
      <div className="space-y-3">
        <h3
          className="text-lg font-normal"
          style={{ fontFamily: '"Times New Roman", Times, serif' }}
        >
          Athletic stats
        </h3>

        <form
          onSubmit={addAthletic}
          className="space-y-3 rounded-[1.75rem] bg-[var(--bg-elevated)] p-4"
        >
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Discipline</span>
            <select
              value={discipline}
              onChange={(e) => {
                setDiscipline(e.target.value);
                setAthValue("");
              }}
              className="w-full appearance-none rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]"
            >
              {CATEGORY_ORDER.map((cat) => (
                <optgroup key={cat} label={cat}>
                  {ATHLETIC_DISCIPLINES.filter((d) => d.category === cat).map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">
              Value
              {selectedDiscipline.unit === "s"
                ? " (seconds or mm:ss)"
                : ` (${selectedDiscipline.unit === "reps" ? "reps" : selectedDiscipline.unit})`}
              {" · "}
              {selectedDiscipline.better === "lower" ? "lower is better" : "higher is better"}
            </span>
            <input
              inputMode={selectedDiscipline.input === "time" ? "text" : "decimal"}
              required
              value={athValue}
              onChange={(e) => setAthValue(e.target.value)}
              placeholder={selectedDiscipline.hint ?? ""}
              className="w-full rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 tabular-nums outline-none focus:border-[var(--accent)]"
            />
          </label>

          <p className="text-[11px] text-white/35">
            Benchmarks {selectedDiscipline.label}:{" "}
            {selectedDiscipline.standards
              .map((s, i) => `${TIERS[i]!.label.slice(0, 4)}. ${
                selectedDiscipline.unit === "s"
                  ? s >= 60 ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}` : `${s}s`
                  : s
              }`)
              .join(" · ")}
            {data?.profile.sex === "female" ? " (adjusted for female)" : ""}
          </p>

          <button
            type="submit"
            disabled={addingAth || !athValue.trim()}
            className="w-full rounded-[1.75rem] border border-[var(--accent)]/35 bg-emerald-500/15 px-4 py-2.5 font-semibold text-[var(--accent)] transition hover:bg-emerald-500/25 hover:text-white disabled:opacity-60"
          >
            {addingAth ? "..." : "Add value"}
          </button>
        </form>

        <ul className="space-y-2">
          {data && data.athletics.length === 0 && (
            <li className="rounded-[1.75rem] bg-[var(--bg-elevated)] px-4 py-5 text-center text-sm text-[var(--muted)]">
              No athletic values yet. 40-yard, 100 m, vertical jump, 5 km...
            </li>
          )}
          {data?.athletics.map((a) => {
            const open = expandedAthletic === a.key;
            return (
              <li key={a.key} className="rounded-[1.75rem] bg-[var(--bg-elevated)] p-4">
                <button
                  type="button"
                  onClick={() => setExpandedAthletic(open ? null : a.key)}
                  className="flex w-full items-start justify-between gap-3 text-left"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[var(--text)]">{a.label}</p>
                    <p className="mt-0.5 text-xs tabular-nums text-[var(--muted)]">
                      Best {a.formatted}
                      {" · "}
                      {a.recordedAt.slice(8, 10)}.{a.recordedAt.slice(5, 7)}.
                      {a.history.length > 1 ? ` · ${a.history.length} entries` : ""}
                    </p>
                    <p className="mt-0.5 text-[11px] text-white/35">{a.category} · {a.axis}</p>
                  </div>
                  <RatingBadge rating={a.rating} tier={a.tier} />
                </button>
                <div className="mt-3">
                  <ScoreBar value={a.rating} done={a.rating >= 80} />
                </div>
                {open && (
                  <ul className="mt-3 space-y-1.5 border-t border-white/8 pt-3">
                    {a.history.map((h) => (
                      <li
                        key={h.id}
                        className="flex items-center justify-between gap-3 rounded-[1rem] bg-[var(--bg)] px-3 py-2 text-xs"
                      >
                        <span className="tabular-nums text-[var(--muted)]">
                          {h.recordedAt.slice(8, 10)}.{h.recordedAt.slice(5, 7)}.{h.recordedAt.slice(0, 4)}
                        </span>
                        <span className="tabular-nums text-white">{h.formatted}</span>
                        <span className="tabular-nums text-[#a78bfa]">{h.rating}</span>
                        <button
                          type="button"
                          disabled={deletingId === h.id}
                          onClick={() => void remove("athletics", h.id)}
                          className="text-[var(--muted)] hover:text-[var(--danger)] disabled:opacity-50"
                        >
                          {deletingId === h.id ? "…" : "×"}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
