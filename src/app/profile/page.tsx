"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { RatingsPanel } from "@/components/profile/RatingsPanel";
import {
  FOCUS_LABELS,
  GROUP_LABELS,
  KIND_LABELS,
  METRIC_LABELS,
  METRIC_UNITS,
  TRAINING_FOCUSES,
  TRAINING_GROUPS,
  allCatalogExerciseNames,
  type AchievementKind,
  type AchievementMetric,
  type AchievementProgress,
} from "@/lib/achievements";

type Profile = {
  id: number;
  display_name: string | null;
  sex: "male" | "female" | null;
  body_weight: number | null;
  height_cm: number | null;
  units: "kg" | "lb";
  weekly_volume_goal: number | null;
  weekly_session_goal: number | null;
  default_rir: number | null;
  notes: string | null;
};

const METRICS = Object.keys(METRIC_LABELS) as AchievementMetric[];

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [achievements, setAchievements] = useState<AchievementProgress[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [sex, setSex] = useState<"male" | "female">("male");
  const [bodyWeight, setBodyWeight] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [units, setUnits] = useState<"kg" | "lb">("kg");
  const [weeklyVolumeGoal, setWeeklyVolumeGoal] = useState("");
  const [weeklySessionGoal, setWeeklySessionGoal] = useState("");
  const [defaultRir, setDefaultRir] = useState("");
  const [notes, setNotes] = useState("");

  const [kind, setKind] = useState<AchievementKind>("exercise");
  const [metric, setMetric] = useState<AchievementMetric>("max_weight");
  const [target, setTarget] = useState("");
  const [exerciseName, setExerciseName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState<(typeof TRAINING_GROUPS)[number]>("Chest");
  const [focus, setFocus] = useState<(typeof TRAINING_FOCUSES)[number]>("Strength");
  const [exerciseQuery, setExerciseQuery] = useState("");

  const catalogNames = useMemo(() => allCatalogExerciseNames(), []);
  const filteredExercises = useMemo(() => {
    const q = exerciseQuery.trim().toLowerCase();
    if (!q) return catalogNames.slice(0, 40);
    return catalogNames.filter((n) => n.toLowerCase().includes(q)).slice(0, 40);
  }, [catalogNames, exerciseQuery]);

  const load = useCallback(() => {
    Promise.all([
      fetch("/api/profile").then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed");
        return json as Profile;
      }),
      fetch("/api/achievements").then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed");
        return json as AchievementProgress[];
      }),
    ])
      .then(([p, a]) => {
        setProfile(p);
        setDisplayName(p.display_name ?? "");
        setSex(p.sex === "female" ? "female" : "male");
        setBodyWeight(p.body_weight == null ? "" : String(p.body_weight));
        setHeightCm(p.height_cm == null ? "" : String(p.height_cm));
        setUnits(p.units === "lb" ? "lb" : "kg");
        setWeeklyVolumeGoal(p.weekly_volume_goal == null ? "" : String(p.weekly_volume_goal));
        setWeeklySessionGoal(p.weekly_session_goal == null ? "" : String(p.weekly_session_goal));
        setDefaultRir(p.default_rir == null ? "" : String(p.default_rir));
        setNotes(p.notes ?? "");
        setAchievements(a);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName,
          sex,
          body_weight: bodyWeight,
          height_cm: heightCm,
          units,
          weekly_volume_goal: weeklyVolumeGoal,
          weekly_session_goal: weeklySessionGoal,
          default_rir: defaultRir,
          notes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setProfile(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSavingProfile(false);
    }
  }

  async function addAchievement(e: FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          metric,
          target,
          exercise_name: kind === "exercise" ? exerciseName || exerciseQuery : null,
          muscle_group: kind === "group" ? muscleGroup : null,
          focus: kind === "discipline" ? focus : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setAchievements((prev) => [json, ...prev]);
      setTarget("");
      setExerciseName("");
      setExerciseQuery("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setAdding(false);
    }
  }

  async function removeAchievement(id: string) {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/achievements/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed");
      setAchievements((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setDeletingId(null);
    }
  }

  const greeting = displayName.trim() || "Athlete";

  return (
    <div className="animate-rise mx-auto max-w-lg space-y-8">
      <header className="text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-elevated)] text-2xl text-white/70">
          {greeting.slice(0, 1).toUpperCase()}
        </div>
        <h1
          className="text-3xl font-normal text-[var(--text)]"
          style={{ fontFamily: '"Times New Roman", Times, serif' }}
        >
          {greeting}
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Settings · Rating · Goals</p>
      </header>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      <section className="space-y-4 rounded-[1.75rem] bg-[var(--bg-elevated)] p-4">
        <h2
          className="text-xl font-normal"
          style={{ fontFamily: '"Times New Roman", Times, serif' }}
        >
          Settings
        </h2>
        <form onSubmit={saveProfile} className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Name</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]"
            />
          </label>

          <div>
            <p className="mb-2 text-sm text-[var(--muted)]">Sex (for rating standards)</p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["male", "Male"],
                  ["female", "Female"],
                ] as const
              ).map(([s, label]) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSex(s)}
                  aria-pressed={sex === s}
                  className={`rounded-[1.25rem] py-2 text-sm transition ${
                    sex === s
                      ? "arc-chrome font-semibold"
                      : "border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--muted)]">Body weight</span>
              <input
                type="number"
                step="0.1"
                value={bodyWeight}
                onChange={(e) => setBodyWeight(e.target.value)}
                placeholder={units}
                className="w-full rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--muted)]">Height (cm)</span>
              <input
                type="number"
                step="0.1"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="cm"
                className="w-full rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]"
              />
            </label>
          </div>

          <div>
            <p className="mb-2 text-sm text-[var(--muted)]">Units</p>
            <div className="grid grid-cols-2 gap-2">
              {(["kg", "lb"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnits(u)}
                  aria-pressed={units === u}
                  className={`rounded-[1.25rem] py-2 text-sm transition ${
                    units === u
                      ? "arc-chrome font-semibold"
                      : "border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--muted)]">Weekly volume</span>
              <input
                type="number"
                value={weeklyVolumeGoal}
                onChange={(e) => setWeeklyVolumeGoal(e.target.value)}
                placeholder="kg goal"
                className="w-full rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--muted)]">Sessions / week</span>
              <input
                type="number"
                min={0}
                value={weeklySessionGoal}
                onChange={(e) => setWeeklySessionGoal(e.target.value)}
                placeholder="e.g. 4"
                className="w-full rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]"
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Default RIR</span>
            <input
              type="number"
              min={0}
              max={5}
              step={0.5}
              value={defaultRir}
              onChange={(e) => setDefaultRir(e.target.value)}
              placeholder="e.g. 2"
              className="w-full rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Note</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Goals, injuries, prefs..."
              className="w-full rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]"
            />
          </label>

          <button
            type="submit"
            disabled={savingProfile || !profile}
            className="arc-chrome w-full rounded-[1.75rem] px-4 py-2.5 font-semibold disabled:opacity-60"
          >
            {savingProfile ? "Saving..." : "Save settings"}
          </button>
        </form>
      </section>

      <RatingsPanel key={profile ? `${profile.sex}-${profile.body_weight}` : "init"} />

      <section className="space-y-4">
        <div>
          <h2
            className="text-xl font-normal"
            style={{ fontFamily: '"Times New Roman", Times, serif' }}
          >
            Goals
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Pick an exercise, muscle group, or discipline and track a goal from logged sets.
          </p>
        </div>

        <form
          onSubmit={addAchievement}
          className="space-y-3 rounded-[1.75rem] bg-[var(--bg-elevated)] p-4"
        >
          <div>
            <p className="mb-2 text-sm text-[var(--muted)]">Type</p>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(KIND_LABELS) as AchievementKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  aria-pressed={kind === k}
                  className={`rounded-[1.25rem] py-2 text-sm transition ${
                    kind === k
                      ? "arc-chrome font-semibold"
                      : "border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                >
                  {KIND_LABELS[k]}
                </button>
              ))}
            </div>
          </div>

          {kind === "exercise" && (
            <div className="space-y-2">
              <label className="block text-sm">
                <span className="mb-1 block text-[var(--muted)]">Search exercise</span>
                <input
                  value={exerciseQuery}
                  onChange={(e) => {
                    setExerciseQuery(e.target.value);
                    setExerciseName("");
                  }}
                  placeholder="Bench Press…"
                  className="w-full rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]"
                />
              </label>
              <div className="max-h-40 overflow-y-auto rounded-[1.25rem] border border-[var(--line)]">
                {filteredExercises.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setExerciseName(name);
                      setExerciseQuery(name);
                    }}
                    className={`block w-full truncate px-3 py-2 text-left text-sm transition ${
                      exerciseName === name
                        ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                        : "text-[var(--text)] hover:bg-white/5"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {kind === "group" && (
            <div>
              <p className="mb-2 text-sm text-[var(--muted)]">Muscle group</p>
              <div className="grid grid-cols-3 gap-2">
                {TRAINING_GROUPS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setMuscleGroup(g)}
                    aria-pressed={muscleGroup === g}
                    className={`rounded-[1.25rem] py-2 text-sm transition ${
                      muscleGroup === g
                        ? "arc-chrome font-semibold"
                        : "border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]"
                    }`}
                  >
                    {GROUP_LABELS[g]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {kind === "discipline" && (
            <div>
              <p className="mb-2 text-sm text-[var(--muted)]">Discipline</p>
              <div className="grid grid-cols-3 gap-2">
                {TRAINING_FOCUSES.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFocus(f)}
                    aria-pressed={focus === f}
                    className={`rounded-[1.25rem] py-2 text-sm transition ${
                      focus === f
                        ? "arc-chrome font-semibold"
                        : "border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]"
                    }`}
                  >
                    {FOCUS_LABELS[f]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-sm text-[var(--muted)]">Metric</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {METRICS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMetric(m)}
                  aria-pressed={metric === m}
                  className={`rounded-[1.25rem] px-2 py-2 text-center text-xs transition sm:text-sm ${
                    metric === m
                      ? "arc-chrome font-semibold"
                      : "border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                >
                  {METRIC_LABELS[m]}
                </button>
              ))}
            </div>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">
              Target ({METRIC_UNITS[metric]})
            </span>
            <input
              type="number"
              step="0.5"
              min={0.1}
              required
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="e.g. 100"
              className="w-full rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]"
            />
          </label>

          <button
            type="submit"
            disabled={adding || (kind === "exercise" && !exerciseName && !exerciseQuery.trim())}
            className="w-full rounded-[1.75rem] border border-[var(--accent)]/35 bg-emerald-500/15 px-4 py-2.5 font-semibold text-[var(--accent)] transition hover:bg-emerald-500/25 hover:text-white disabled:opacity-60"
          >
            {adding ? "..." : "Add goal"}
          </button>
        </form>

        <ul className="space-y-3">
          {achievements.length === 0 && (
            <li className="rounded-[1.75rem] bg-[var(--bg-elevated)] px-4 py-6 text-center text-sm text-[var(--muted)]">
              No goals yet - pick an exercise or discipline above.
            </li>
          )}
          {achievements.map((a) => (
            <li
              key={a.id}
              className={`rounded-[1.75rem] bg-[var(--bg-elevated)] p-4 ${
                a.done ? "ring-1 ring-emerald-400/30" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--text)]">{a.title}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {KIND_LABELS[a.kind]} · {a.metricLabel}
                    {a.done ? " · achieved" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={deletingId === a.id}
                  onClick={() => void removeAchievement(a.id)}
                  className="shrink-0 text-xs text-[var(--muted)] hover:text-[var(--danger)] disabled:opacity-50"
                >
                  {deletingId === a.id ? "..." : "Delete"}
                </button>
              </div>

              <div className="mt-3">
                <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm tabular-nums">
                  <span className="text-[var(--text)]">
                    {a.current.toLocaleString("en-US")}
                    <span className="text-[var(--muted)]">
                      {" "}
                      / {a.target.toLocaleString("en-US")} {a.unit}
                    </span>
                  </span>
                  <span className={a.done ? "text-emerald-300" : "text-[var(--accent)]"}>
                    {a.pct}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/8">
                  <div
                    className={`h-full rounded-full transition-[width] duration-500 ${
                      a.done ? "bg-emerald-400" : "bg-[var(--accent)]"
                    }`}
                    style={{ width: `${a.pct}%` }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
