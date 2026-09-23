"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { BodyMap } from "@/components/BodyMap";
import {
  EQUIPMENT_LABELS,
  EQUIPMENT_TYPES,
  EXERCISE_REGIONS,
  FOCUS_LABELS,
  GROUP_VIEW,
  REGION_LABELS,
  TRAINING_FOCUSES,
  bodyStateForGroupOnly,
  muscleIdsForGroup,
  type Equipment,
  type ExerciseRegion,
  type MuscleGroupKey,
  type TrainingFocus,
} from "@/lib/muscles";

type CatalogExercise = {
  name: string;
  focus: TrainingFocus;
  equipment: Equipment | null;
  region: ExerciseRegion | null;
  fromCatalog: boolean;
  times: number;
  lastDate: string | null;
  lastWorkoutId: string | null;
};

type GroupPayload = {
  key: MuscleGroupKey;
  label: string;
  slug: string;
  exercises: CatalogExercise[];
};

type FocusOption = TrainingFocus | "all";
type EquipmentOption = Equipment | "all";

const FOCUS_OPTIONS: FocusOption[] = ["all", ...TRAINING_FOCUSES];
const EQUIPMENT_OPTIONS: EquipmentOption[] = ["all", ...EQUIPMENT_TYPES];

function focusLabel(opt: FocusOption) {
  return opt === "all" ? "Alle Ziele" : FOCUS_LABELS[opt];
}

function equipmentLabel(opt: EquipmentOption) {
  return opt === "all" ? "Alle Geräte" : EQUIPMENT_LABELS[opt];
}

export default function MuscleGroupExercises({ groupKey }: { groupKey: MuscleGroupKey }) {
  const [data, setData] = useState<GroupPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focusFilter, setFocusFilter] = useState<FocusOption>("all");
  const [equipmentFilter, setEquipmentFilter] = useState<EquipmentOption>("all");

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setFocusFilter("all");
    setEquipmentFilter("all");
    fetch(`/api/exercises?group=${encodeURIComponent(groupKey)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed");
        if (!cancelled) setData(json as GroupPayload);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed");
      });
    return () => {
      cancelled = true;
    };
  }, [groupKey]);

  const miniState = useMemo(
    () => bodyStateForGroupOnly(groupKey, 7, true),
    [groupKey],
  );

  const label = data?.label;
  const exercises = data?.exercises ?? [];

  const hasRegions = useMemo(
    () => exercises.some((ex) => ex.region != null),
    [exercises],
  );

  const hasEquipment = useMemo(
    () => exercises.some((ex) => ex.equipment != null),
    [exercises],
  );

  const filtered = useMemo(() => {
    return exercises.filter((ex) => {
      if (focusFilter !== "all" && ex.focus !== focusFilter) return false;
      if (equipmentFilter !== "all" && ex.equipment !== equipmentFilter) return false;
      return true;
    });
  }, [exercises, focusFilter, equipmentFilter]);

  const byFocus = useMemo(() => {
    const map: Record<TrainingFocus, CatalogExercise[]> = {
      Hypertrophy: [],
      Strength: [],
      Explosiveness: [],
    };
    for (const ex of filtered) {
      map[ex.focus].push(ex);
    }
    return map;
  }, [filtered]);

  const byRegion = useMemo(() => {
    const map: Record<ExerciseRegion | "Other", CatalogExercise[]> = {
      Upper: [],
      Mid: [],
      Lower: [],
      Full: [],
      Other: [],
    };
    for (const ex of filtered) {
      if (ex.region) map[ex.region].push(ex);
      else map.Other.push(ex);
    }
    return map;
  }, [filtered]);

  return (
    <div className="animate-rise space-y-8">
      <div>
        <Link href="/workouts" className="text-sm text-[var(--muted)] hover:text-[var(--accent)]">
          ← Workouts
        </Link>
        <div className="mt-4 flex items-center gap-4">
          <div className="w-[7.5rem] shrink-0 rounded-[1.75rem] bg-[var(--bg-elevated)] p-2">
            <BodyMap
              bodyState={miniState}
              view={GROUP_VIEW[groupKey]}
              size="sm"
              showToggle={false}
              interactive={false}
              focusIds={muscleIdsForGroup(groupKey)}
            />
          </div>
          <div>
            <h1
              className="text-3xl font-normal text-[var(--text)]"
              style={{ fontFamily: '"Times New Roman", Times, serif' }}
            >
              {label ?? "…"}
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {data
                ? `${filtered.length} ${filtered.length === 1 ? "Übung" : "Übungen"}`
                : "Loading…"}
            </p>
          </div>
        </div>

        {data && exercises.length > 0 && (
          <div className="mt-4">
            <ExerciseFilterPicker
              focus={focusFilter}
              equipment={equipmentFilter}
              onFocusChange={setFocusFilter}
              onEquipmentChange={setEquipmentFilter}
              showEquipment
            />
          </div>
        )}
      </div>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      {!data && !error && (
        <p className="rounded-[1.75rem] bg-[var(--bg-elevated)] px-4 py-6 text-[var(--muted)]">
          Loading exercises…
        </p>
      )}

      {data && exercises.length === 0 && (
        <p className="rounded-[1.75rem] bg-[var(--bg-elevated)] px-4 py-6 text-[var(--muted)]">
          No exercises for this group.
        </p>
      )}

      {data && filtered.length === 0 && exercises.length > 0 && (
        <p className="rounded-[1.75rem] bg-[var(--bg-elevated)] px-4 py-6 text-[var(--muted)]">
          Keine Übungen für diesen Filter.
        </p>
      )}

      {hasRegions &&
        EXERCISE_REGIONS.map((region) => {
          const items = byRegion[region];
          if (!data || items.length === 0) return null;
          return (
            <ExerciseSection
              key={region}
              title={REGION_LABELS[region]}
              items={items}
              showEquipment={hasEquipment}
            />
          );
        })}

      {hasRegions && byRegion.Other.length > 0 && (
        <ExerciseSection title="Weitere" items={byRegion.Other} showEquipment={hasEquipment} />
      )}

      {!hasRegions &&
        TRAINING_FOCUSES.map((focus) => {
          const items = byFocus[focus];
          if (!data || items.length === 0) return null;
          return (
            <ExerciseSection
              key={focus}
              title={FOCUS_LABELS[focus]}
              items={items}
              showEquipment={hasEquipment}
            />
          );
        })}
    </div>
  );
}

function ExerciseFilterPicker({
  focus,
  equipment,
  onFocusChange,
  onEquipmentChange,
  showEquipment,
}: {
  focus: FocusOption;
  equipment: EquipmentOption;
  onFocusChange: (v: FocusOption) => void;
  onEquipmentChange: (v: EquipmentOption) => void;
  showEquipment: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef<HTMLDivElement>(null);
  const equipmentRef = useRef<HTMLDivElement>(null);

  const filterActive = focus !== "all" || equipment !== "all" || open;

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const itemH = 40;
    const focusIdx = FOCUS_OPTIONS.indexOf(focus);
    const eqIdx = EQUIPMENT_OPTIONS.indexOf(equipment);
    if (focusRef.current && focusIdx >= 0) focusRef.current.scrollTop = focusIdx * itemH;
    if (equipmentRef.current && eqIdx >= 0) equipmentRef.current.scrollTop = eqIdx * itemH;
  }, [open, focus, equipment]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Filter wählen"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-2.5 text-left outline-none transition hover:bg-[var(--bg-soft)] focus:border-[var(--accent)]"
      >
        <span className="truncate text-sm tracking-wide text-[var(--text)]">
          {focusLabel(focus)}
        </span>
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
            filterActive
              ? "text-white"
              : "text-white/45"
          }`}
          aria-hidden
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 7h16M7 12h10M10 17h4" strokeLinecap="round" />
          </svg>
        </span>
        <span className="truncate text-right text-sm tracking-wide text-[var(--text)]">
          {showEquipment ? equipmentLabel(equipment) : ""}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Filter wählen"
          className="arc-tabbar-glass absolute left-0 top-full z-30 mt-2 w-full min-w-[14rem] rounded-[1.75rem] p-3"
        >
          <div
            className={`relative grid items-center gap-1 ${
              showEquipment ? "grid-cols-2" : "grid-cols-1"
            }`}
          >
            <div
              className="arc-tab-active pointer-events-none absolute inset-x-1 top-1/2 z-0 h-10 -translate-y-1/2 rounded-full"
              aria-hidden
            />

            <OptionWheel
              scrollRef={focusRef}
              options={FOCUS_OPTIONS}
              selected={focus}
              labelOf={focusLabel}
              onSelect={onFocusChange}
            />

            {showEquipment && (
              <OptionWheel
                scrollRef={equipmentRef}
                options={EQUIPMENT_OPTIONS}
                selected={equipment}
                labelOf={equipmentLabel}
                onSelect={onEquipmentChange}
              />
            )}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="arc-chrome mt-3 w-full rounded-full px-3 py-2 text-sm font-semibold"
          >
            Fertig
          </button>
        </div>
      )}
    </div>
  );
}

function OptionWheel<T extends string>({
  options,
  selected,
  labelOf,
  onSelect,
  scrollRef,
}: {
  options: readonly T[];
  selected: T;
  labelOf: (v: T) => string;
  onSelect: (v: T) => void;
  scrollRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={scrollRef}
      className="relative z-10 h-[120px] snap-y snap-mandatory overflow-y-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div className="h-10" aria-hidden />
      {options.map((opt) => {
        const active = opt === selected;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onSelect(opt)}
            className={`flex h-10 w-full snap-center items-center justify-center px-1 text-center transition ${
              active
                ? "text-sm font-semibold text-white arc-tab-glow"
                : "text-xs text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            {labelOf(opt)}
          </button>
        );
      })}
      <div className="h-10" aria-hidden />
    </div>
  );
}

function ExerciseSection({
  title,
  items,
  showEquipment,
}: {
  title: string;
  items: CatalogExercise[];
  showEquipment?: boolean;
}) {
  return (
    <section className="space-y-3">
      <h2
        className="text-lg font-normal tracking-wide text-[var(--text)]"
        style={{ fontFamily: '"Times New Roman", Times, serif' }}
      >
        {title}
      </h2>
      <ul className="divide-y divide-white/8 rounded-[1.75rem] bg-[var(--bg-elevated)]">
        {items.map((ex) => (
          <li key={ex.name} className="flex items-center justify-between gap-3 px-4 py-3.5">
            <div className="min-w-0">
              <p className="font-medium">{ex.name}</p>
              <p className="text-xs tabular-nums text-[var(--muted)]">
                {showEquipment && ex.equipment
                  ? `${EQUIPMENT_LABELS[ex.equipment]} · `
                  : null}
                {ex.times > 0
                  ? `${ex.times}× logged${ex.lastDate ? ` · last ${ex.lastDate}` : ""}`
                  : "Not logged yet"}
              </p>
            </div>
            {ex.lastWorkoutId ? (
              <Link
                href={`/workouts/${ex.lastWorkoutId}`}
                className="shrink-0 text-xs text-[var(--muted)] hover:text-[var(--accent)]"
              >
                Session →
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
