"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GlassTimePicker } from "@/components/GlassTimePicker";
import {
  DOSE_UNITS,
  SUPPLEMENT_CATALOG,
  WEEKDAYS,
  findCatalogById,
  findCatalogByName,
  formatDays,
  formatDose,
  parseDose,
  suggestCatalog,
  supplementImageSrc,
  todayIsoWeekday,
  type DoseUnit,
  type SupplementCatalogEntry,
} from "@/lib/supplements";

type Supp = {
  id: string;
  name: string;
  dose: string | null;
  time: string | null;
  notes: string | null;
};

type Schedule = {
  id: string;
  catalog_id: string | null;
  name: string;
  dose: string | null;
  notes: string | null;
  days: number[];
  time_of_day: string;
};

const inputClass =
  "rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]";

export default function SupplementsPage() {
  const [items, setItems] = useState<Supp[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [nameQuery, setNameQuery] = useState("");
  const [catalogId, setCatalogId] = useState<string | null>(null);
  const [days, setDays] = useState<number[]>([todayIsoWeekday()]);
  const [timeOfDay, setTimeOfDay] = useState("08:00");
  const [doseAmount, setDoseAmount] = useState("");
  const [doseUnit, setDoseUnit] = useState<DoseUnit>("g");
  const [unitOpen, setUnitOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeSuggest, setActiveSuggest] = useState(0);
  const suggestWrapRef = useRef<HTMLDivElement>(null);
  const unitWrapRef = useRef<HTMLDivElement>(null);

  function applyDose(value: string) {
    const parsed = parseDose(value);
    setDoseAmount(parsed.amount);
    setDoseUnit(parsed.unit);
  }

  const loadLogs = useCallback(() => {
    fetch("/api/supplements")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed");
        setItems(json);
      })
      .catch((err) => setError(err.message));
  }, []);

  const loadSchedules = useCallback(() => {
    fetch("/api/supplement-schedules")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed");
        setSchedules(json);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    loadLogs();
    loadSchedules();
  }, [loadLogs, loadSchedules]);

  const selected = useMemo(() => {
    if (catalogId) return findCatalogById(catalogId);
    return findCatalogByName(nameQuery);
  }, [catalogId, nameQuery]);

  const suggestions = useMemo(() => suggestCatalog(nameQuery, 6), [nameQuery]);

  useEffect(() => {
    setActiveSuggest(0);
  }, [nameQuery]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (!suggestWrapRef.current?.contains(target)) {
        setSuggestOpen(false);
      }
      if (!unitWrapRef.current?.contains(target)) {
        setUnitOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function pickSuggestion(entry: SupplementCatalogEntry) {
    setNameQuery(entry.name);
    setCatalogId(entry.id);
    applyDose(entry.dose);
    setSuggestOpen(false);
  }

  function onNameChange(value: string) {
    setNameQuery(value);
    setCatalogId(null);
    setSuggestOpen(true);
    const exact = findCatalogByName(value);
    if (exact) {
      setCatalogId(exact.id);
      applyDose(exact.dose);
    }
  }

  const today = todayIsoWeekday();
  const dueToday = schedules.filter((s) => s.days.includes(today));

  const loggedTodayNames = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const names = new Set<string>();
    for (const item of items) {
      if (!item.time) continue;
      const t = new Date(item.time);
      if (t >= start) names.add(item.name.toLowerCase());
    }
    return names;
  }, [items]);

  async function postLog(payload: {
    name: string;
    dose: string | null;
    notes: string | null;
    time?: string;
  }) {
    const res = await fetch("/api/supplements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: payload.name,
        dose: payload.dose,
        notes: payload.notes,
        time: payload.time ?? new Date().toISOString(),
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed");
    return json;
  }

  function toggleDay(value: number) {
    setDays((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value].sort((a, b) => a - b),
    );
  }

  async function onSaveSchedule(e: FormEvent) {
    e.preventDefault();
    const name = nameQuery.trim();
    if (!name || days.length === 0) {
      setError("Supplement und mindestens einen Tag wählen.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/supplement-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catalog_id: selected?.id ?? null,
          name: selected?.name ?? name,
          dose: formatDose(doseAmount, doseUnit) || selected?.dose || null,
          notes: notes || null,
          days,
          time_of_day: timeOfDay,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setNameQuery("");
      setCatalogId(null);
      setDoseAmount("");
      setDoseUnit("g");
      setNotes("");
      setSuggestOpen(false);
      setUnitOpen(false);
      loadSchedules();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSchedule(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/supplement-schedules?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      loadSchedules();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  function scheduledTimestamp(timeOfDay: string) {
    const [hh, mm] = timeOfDay.split(":").map(Number);
    const d = new Date();
    d.setHours(hh || 0, mm || 0, 0, 0);
    return d.toISOString();
  }

  async function logSchedule(s: Schedule) {
    setBusy(true);
    setError(null);
    try {
      await postLog({
        name: s.name,
        dose: s.dose,
        notes: s.notes,
        time: scheduledTimestamp(s.time_of_day),
      });
      loadLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function logAllDueToday() {
    setBusy(true);
    setError(null);
    try {
      for (const s of dueToday) {
        if (loggedTodayNames.has(s.name.toLowerCase())) continue;
        await postLog({
          name: s.name,
          dose: s.dose,
          notes: s.notes,
          time: scheduledTimestamp(s.time_of_day),
        });
      }
      loadLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function logCatalogEntry(entry: SupplementCatalogEntry) {
    setBusy(true);
    setError(null);
    try {
      await postLog({
        name: entry.name,
        dose: entry.dose,
        notes: `${entry.effect} · ${entry.nutrition}`,
      });
      loadLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="animate-rise space-y-10">
      {/* Schedule card */}
      <section className="space-y-4 rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)]/70 p-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">Planung</h2>
          <p className="text-sm text-[var(--muted)]">
            Supplement, Tage, Uhrzeit, Menge und Notiz — später mit einem Tap loggen.
          </p>
        </div>

        <form onSubmit={onSaveSchedule} className="grid gap-3">
          <div ref={suggestWrapRef} className="relative grid gap-1 text-sm">
            <label htmlFor="supp-name" className="text-[var(--muted)]">
              Supplement
            </label>
            <input
              id="supp-name"
              value={nameQuery}
              onChange={(e) => onNameChange(e.target.value)}
              onFocus={() => setSuggestOpen(true)}
              onKeyDown={(e) => {
                if (!suggestOpen || suggestions.length === 0) return;
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActiveSuggest((i) => (i + 1) % suggestions.length);
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActiveSuggest((i) => (i - 1 + suggestions.length) % suggestions.length);
                } else if (e.key === "Enter" && suggestions[activeSuggest]) {
                  e.preventDefault();
                  pickSuggestion(suggestions[activeSuggest]!);
                } else if (e.key === "Escape") {
                  setSuggestOpen(false);
                }
              }}
              placeholder="Tippen… z.B. Creatin, Omega, Zink"
              autoComplete="off"
              required
              className={inputClass}
            />
            {suggestOpen && suggestions.length > 0 && (
              <ul
                role="listbox"
                className="absolute top-full z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-[var(--line)] bg-[var(--bg-elevated)] shadow-lg"
              >
                {suggestions.map((s, i) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === activeSuggest}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pickSuggestion(s)}
                      className={
                        i === activeSuggest
                          ? "flex w-full items-center gap-3 bg-[var(--bg-soft)] px-3 py-2 text-left"
                          : "flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[var(--bg-soft)]"
                      }
                    >
                      <img
                        src={supplementImageSrc(s.imageFile)}
                        alt=""
                        width={32}
                        height={32}
                        className="h-8 w-8 shrink-0 rounded object-cover"
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{s.name}</span>
                        <span className="block truncate text-xs text-[var(--muted)]">
                          {s.category} · {s.dose}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {nameQuery.trim() && !selected && suggestions.length === 0 && (
              <p className="text-xs text-[var(--muted)]">
                Kein Katalog-Treffer — wird als eigener Name gespeichert.
              </p>
            )}
          </div>

          {selected && (
            <div className="flex items-center gap-3 rounded-lg bg-[var(--bg)]/60 px-3 py-2">
              <img
                src={supplementImageSrc(selected.imageFile)}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 rounded-md object-cover"
              />
              <p className="text-xs text-[var(--muted)] line-clamp-2">{selected.effect}</p>
            </div>
          )}

          <div className="grid gap-1 text-sm">
            <span className="text-[var(--muted)]">Tage</span>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAYS.map((d) => {
                const on = days.includes(d.value);
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDay(d.value)}
                    className={
                      on
                        ? "arc-chrome w-full rounded-full py-2 text-center text-sm font-semibold"
                        : "w-full rounded-full border border-[var(--line)] bg-[var(--bg)] py-2 text-center text-sm text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]"
                    }
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1 text-sm">
              <span className="text-[var(--muted)]">Uhrzeit</span>
              <GlassTimePicker value={timeOfDay} onChange={setTimeOfDay} />
            </div>
            <div className="grid gap-1 text-sm">
              <span className="text-[var(--muted)]">Menge / Dosis</span>
              <div className="flex rounded-md border border-[var(--line)] bg-[var(--bg)] focus-within:border-[var(--accent)]">
                <input
                  value={doseAmount}
                  onChange={(e) => setDoseAmount(e.target.value)}
                  placeholder="z.B. 5"
                  inputMode="decimal"
                  className="min-w-0 flex-1 rounded-l-md bg-transparent px-3 py-2 outline-none"
                />
                <div ref={unitWrapRef} className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setUnitOpen((o) => !o)}
                    aria-haspopup="listbox"
                    aria-expanded={unitOpen}
                    className="flex h-full min-w-[4.75rem] items-center justify-center gap-1 rounded-r-md border-l border-[var(--line)] px-2.5 text-sm font-semibold text-[var(--accent)] hover:bg-[var(--bg-soft)]"
                  >
                    {doseUnit}
                    <span className="text-[10px] text-[var(--muted)]" aria-hidden>
                      ▾
                    </span>
                  </button>
                  {unitOpen && (
                    <ul
                      role="listbox"
                      aria-label="Maßeinheit wählen"
                      className="arc-tabbar-glass absolute right-0 top-full z-40 mt-2 max-h-64 min-w-[10rem] overflow-auto rounded-3xl p-1.5"
                    >
                      {DOSE_UNITS.map((unit) => {
                        const active = unit === doseUnit;
                        return (
                          <li key={unit}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={active}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setDoseUnit(unit);
                                setUnitOpen(false);
                              }}
                              className={
                                active
                                  ? "arc-tab-active arc-tab-glow w-full rounded-full px-3 py-2 text-left text-sm font-semibold text-white"
                                  : "w-full rounded-full px-3 py-2 text-left text-sm text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]"
                              }
                            >
                              {unit}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
            <label className="grid gap-1 text-sm sm:col-span-1">
              <span className="text-[var(--muted)]">Notiz</span>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="optional"
                className={inputClass}
              />
            </label>
          </div>

          <div className="flex justify-center pt-2">
            <button
              type="submit"
              disabled={busy || days.length === 0}
              className="arc-chrome rounded-full px-8 py-2.5 text-sm font-semibold tracking-wide disabled:opacity-50"
            >
              Zum Plan hinzufügen
            </button>
          </div>
        </form>

        {schedules.length > 0 && (
          <ul className="divide-y divide-[var(--line)] rounded-lg border border-[var(--line)]">
            {schedules.map((s) => {
              const cat = s.catalog_id
                ? findCatalogById(s.catalog_id)
                : findCatalogByName(s.name);
              const isToday = s.days.includes(today);
              const already = loggedTodayNames.has(s.name.toLowerCase());
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                  {cat ? (
                    <img
                      src={supplementImageSrc(cat.imageFile)}
                      alt=""
                      width={36}
                      height={36}
                      className="h-9 w-9 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--bg-soft)] text-xs text-[var(--muted)]">
                      —
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{s.name}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {formatDays(s.days)} · {s.time_of_day} · {s.dose || "—"}
                      {s.notes ? ` · ${s.notes}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isToday && (
                      <button
                        type="button"
                        disabled={busy || already}
                        onClick={() => logSchedule(s)}
                        className="arc-chrome rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                      >
                        {already ? "Geloggt" : "Loggen"}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => deleteSchedule(s.id)}
                      className="text-xs text-[var(--muted)] hover:text-[var(--danger)] disabled:opacity-50"
                    >
                      Entfernen
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {dueToday.length > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={logAllDueToday}
            className="w-full rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--accent)] hover:bg-[var(--bg)] disabled:opacity-50"
          >
            Heute fällig loggen ({dueToday.length})
          </button>
        )}
      </section>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      <section className="space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">Katalog</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {SUPPLEMENT_CATALOG.map((s) => (
            <li
              key={s.id}
              className="flex gap-3 rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)]/70 p-3"
            >
              <img
                src={supplementImageSrc(s.imageFile)}
                alt={s.name}
                width={56}
                height={56}
                className="h-14 w-14 shrink-0 rounded-lg object-cover bg-[var(--bg-soft)]"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-[family-name:var(--font-display)] text-sm font-semibold leading-snug">
                    {s.name}
                  </p>
                  <span className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                    {s.category}
                  </span>
                </div>
                <p className="text-xs text-[var(--accent-dim)]">Dosis: {s.dose}</p>
                <p className="text-xs leading-relaxed text-[var(--muted)]">{s.effect}</p>
                <p className="text-[11px] leading-relaxed text-[var(--muted)]/80">{s.nutrition}</p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => logCatalogEntry(s)}
                  className="mt-1 text-xs font-semibold text-[var(--accent)] underline-offset-2 hover:underline disabled:opacity-50"
                >
                  Jetzt loggen
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">Log</h2>
        <ul className="divide-y divide-[var(--line)] rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)]/60">
          {items.length === 0 && (
            <li className="px-4 py-6 text-sm text-[var(--muted)]">Noch nichts geloggt.</li>
          )}
          {items.map((s) => {
            const cat = findCatalogByName(s.name);
            return (
              <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                {cat ? (
                  <img
                    src={supplementImageSrc(cat.imageFile)}
                    alt=""
                    width={36}
                    height={36}
                    className="h-9 w-9 shrink-0 rounded-md object-cover bg-[var(--bg-soft)]"
                  />
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--bg-soft)] text-xs text-[var(--muted)]">
                    —
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-sm text-[var(--muted)]">
                    {s.dose || "—"}
                    {s.notes ? ` · ${s.notes}` : ""}
                  </p>
                </div>
                <span className="text-xs tabular-nums text-[var(--muted)]">
                  {s.time ? new Date(s.time).toLocaleString() : "—"}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
