"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useSessionCart,
  type CartSetDraft,
} from "@/components/SessionCart";
import { SwipeBack } from "@/components/SwipeBack";
import { GROUP_LABELS } from "@/lib/muscles";
import { toISODateLocal, type WeekMode } from "@/lib/session-schedule";
import { WEEKDAYS, todayIsoWeekday } from "@/lib/supplements";

export default function SessionCartPage() {
  const router = useRouter();
  const { items, remove, setSets, clear } = useSessionCart();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [days, setDays] = useState<number[]>(() => [todayIsoWeekday()]);
  const [weekMode, setWeekMode] = useState<WeekMode>("every");
  const [intervalWeeks, setIntervalWeeks] = useState(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateSet(exName: string, index: number, patch: Partial<CartSetDraft>) {
    const item = items.find((i) => i.name === exName);
    if (!item) return;
    const next = item.sets.map((s, i) => (i === index ? { ...s, ...patch } : s));
    setSets(exName, next);
  }

  function addSetRow(exName: string) {
    const item = items.find((i) => i.name === exName);
    if (!item) return;
    setSets(exName, [...item.sets, { reps: "", weight: "", rir: "", failure: false }]);
  }

  function removeSetRow(exName: string, index: number) {
    const item = items.find((i) => i.name === exName);
    if (!item) return;
    const next = item.sets.filter((_, i) => i !== index);
    setSets(exName, next.length ? next : [{ reps: "", weight: "", rir: "", failure: false }]);
  }

  function toggleFailure(exName: string, index: number) {
    const item = items.find((i) => i.name === exName);
    if (!item) return;
    const current = item.sets[index];
    if (!current) return;
    const nextFailure = !current.failure;
    updateSet(exName, index, {
      failure: nextFailure,
      rir: nextFailure ? "0" : "",
    });
  }

  function toggleDay(day: number) {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b),
    );
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (items.length === 0 || busy) return;
    if (days.length === 0) {
      setError("Mindestens einen Wochentag wählen");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/session-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || null,
          notes: notes.trim() || null,
          days,
          week_mode: weekMode,
          interval_weeks: weekMode === "interval" ? intervalWeeks : null,
          anchor_date: toISODateLocal(new Date()),
          exercises: items.map((item) => ({
            name: item.name,
            muscle_group: item.muscleGroup,
            sets: item.sets,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      clear();
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setBusy(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="animate-rise space-y-6">
        <SwipeBack href="/workouts" />
        <div className="text-center">
          <h1
            className="text-3xl font-normal text-[var(--text)]"
            style={{ fontFamily: '"Times New Roman", Times, serif' }}
          >
            Session
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Noch keine Übungen im Warenkorb.
          </p>
        </div>
        <div className="flex justify-center">
          <Link
            href="/workouts"
            className="arc-chrome inline-flex rounded-[1.75rem] px-4 py-2.5 text-sm font-semibold"
          >
            Übungen wählen
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSave} className="animate-rise space-y-8">
      <SwipeBack href="/workouts" />
      <div className="text-center">
        <h1
          className="text-3xl font-normal text-[var(--text)]"
          style={{ fontFamily: '"Times New Roman", Times, serif' }}
        >
          Session
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {items.length} {items.length === 1 ? "Übung" : "Übungen"} · Planen & eintragen
        </p>
      </div>

      <div className="space-y-4 rounded-[1.75rem] bg-[var(--bg-elevated)] p-4">
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Push A…"
            className="w-full rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]"
          />
        </label>

        <div>
          <p className="mb-2 text-sm text-[var(--muted)]">Wochentage</p>
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((d) => {
              const on = days.includes(d.value);
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleDay(d.value)}
                  aria-pressed={on}
                  className={`rounded-[1.25rem] py-2 text-center text-sm font-medium transition ${
                    on
                      ? "arc-chrome"
                      : "border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm text-[var(--muted)]">Rhythmus</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              [
                ["every", "Jede Woche"],
                ["A", "A-Woche"],
                ["B", "B-Woche"],
                ["interval", "Intervall"],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setWeekMode(mode)}
                aria-pressed={weekMode === mode}
                className={`rounded-[1.25rem] px-2 py-2 text-center text-sm transition ${
                  weekMode === mode
                    ? "arc-chrome font-semibold"
                    : "border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {weekMode === "interval" && (
            <label className="mt-3 block text-sm">
              <span className="mb-1 block text-[var(--muted)]">Alle N Wochen</span>
              <input
                type="number"
                min={2}
                max={12}
                value={intervalWeeks}
                onChange={(e) => setIntervalWeeks(Math.max(2, Number(e.target.value) || 2))}
                className="w-full rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]"
              />
            </label>
          )}
          {(weekMode === "A" || weekMode === "B") && (
            <p className="mt-2 text-xs text-[var(--muted)]">
              Aktuelle Woche = A-Woche. Abwechselnd mit B.
            </p>
          )}
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Notiz</span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
            className="w-full rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]"
          />
        </label>
      </div>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      <div className="space-y-4">
        {items.map((item) => (
          <article
            key={item.name}
            className="rounded-[1.75rem] bg-[var(--bg-elevated)] p-4"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-medium text-[var(--text)]">{item.name}</h2>
                <p className="text-xs text-[var(--muted)]">
                  {GROUP_LABELS[item.muscleGroup]}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(item.name)}
                className="shrink-0 text-sm text-[var(--muted)] hover:text-[var(--danger)]"
              >
                Entfernen
              </button>
            </div>

            <ul className="space-y-2">
              {item.sets.map((s, i) => (
                <li
                  key={i}
                  className="grid grid-cols-[1.5rem_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)_1.5rem] items-center gap-1.5"
                >
                  <span className="text-center text-xs tabular-nums text-[var(--muted)]">
                    #{i + 1}
                  </span>
                  <div className="flex min-w-0 overflow-hidden rounded-[1.25rem] border border-[var(--line)] bg-[var(--bg)]">
                    <button
                      type="button"
                      onClick={() => toggleFailure(item.name, i)}
                      aria-label={s.failure ? "Auf Reps wechseln" : "Auf Failure wechseln"}
                      aria-pressed={s.failure}
                      className={`shrink-0 px-1.5 text-[10px] font-semibold tracking-wide transition ${
                        s.failure
                          ? "bg-[var(--accent)]/20 text-[var(--accent)]"
                          : "text-[var(--muted)] hover:text-[var(--text)]"
                      }`}
                    >
                      {s.failure ? "F" : "R"}
                    </button>
                    {s.failure ? (
                      <button
                        type="button"
                        onClick={() => toggleFailure(item.name, i)}
                        className="min-w-0 flex-1 px-1 py-1.5 text-center text-sm font-medium text-[var(--accent)]"
                      >
                        Fail
                      </button>
                    ) : (
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="Reps"
                        value={s.reps}
                        onChange={(e) => updateSet(item.name, i, { reps: e.target.value })}
                        className="min-w-0 w-full flex-1 border-0 bg-transparent px-1 py-1.5 text-center text-sm outline-none"
                      />
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    inputMode="decimal"
                    placeholder="kg"
                    value={s.weight}
                    onChange={(e) => updateSet(item.name, i, { weight: e.target.value })}
                    className="min-w-0 w-full rounded-[1.25rem] border border-[var(--line)] bg-[var(--bg)] px-1.5 py-1.5 text-center text-sm outline-none focus:border-[var(--accent)]"
                  />
                  {s.failure ? (
                    <span className="rounded-[1.25rem] border border-[var(--line)]/50 px-1.5 py-1.5 text-center text-xs text-[var(--muted)]">
                      RIR 0
                    </span>
                  ) : (
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="RIR"
                      value={s.rir}
                      onChange={(e) => updateSet(item.name, i, { rir: e.target.value })}
                      className="min-w-0 w-full rounded-[1.25rem] border border-[var(--line)] bg-[var(--bg)] px-1.5 py-1.5 text-center text-sm outline-none focus:border-[var(--accent)]"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeSetRow(item.name, i)}
                    aria-label={`Set ${i + 1} entfernen`}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--muted)] hover:text-[var(--danger)]"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => addSetRow(item.name)}
              className="mt-3 text-sm text-[var(--accent)] hover:text-white"
            >
              + Set
            </button>
          </article>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-3 pb-4">
        <button
          type="submit"
          disabled={busy || days.length === 0}
          className="rounded-[1.75rem] border border-[var(--accent)]/35 bg-emerald-500/15 px-5 py-2.5 font-semibold text-[var(--accent)] transition hover:bg-emerald-500/25 hover:text-white disabled:opacity-60"
        >
          {busy ? "Eintragen…" : "In Kalender eintragen"}
        </button>
        <button
          type="button"
          onClick={() => clear()}
          className="rounded-[1.75rem] border border-[var(--accent)]/35 bg-red-500/12 px-4 py-2.5 text-sm text-[var(--accent)] transition hover:bg-red-500/20 hover:text-white"
        >
          Liste leeren
        </button>
      </div>
    </form>
  );
}
