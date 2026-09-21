"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function parseTime(value: string): { h: number; m: number } {
  const [hs, ms] = value.split(":");
  const h = Math.min(23, Math.max(0, Number(hs) || 0));
  const m = Math.min(59, Math.max(0, Number(ms) || 0));
  return { h, m };
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

type GlassTimePickerProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function GlassTimePicker({ value, onChange, className = "" }: GlassTimePickerProps) {
  const { h, m } = parseTime(value);
  const minuteSnapped = (Math.round(m / 5) * 5) % 60;
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);

  const display = useMemo(() => `${pad(h)}:${pad(m)}`, [h, m]);

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
    if (hourRef.current) hourRef.current.scrollTop = h * itemH;
    if (minuteRef.current) minuteRef.current.scrollTop = (minuteSnapped / 5) * itemH;
  }, [open, h, minuteSnapped]);

  function setHour(next: number) {
    onChange(`${pad(next)}:${pad(m)}`);
  }

  function setMinute(next: number) {
    onChange(`${pad(h)}:${pad(next)}`);
  }

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-left outline-none focus:border-[var(--accent)]"
      >
        <span className="tabular-nums tracking-wide">{display}</span>
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 text-[var(--muted)]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          aria-hidden
        >
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4.5l3 1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Uhrzeit wählen"
          className="arc-tabbar-glass absolute left-0 top-full z-30 mt-2 w-full min-w-[14rem] rounded-3xl p-3"
        >
          <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-1">
            <div
              className="arc-tab-active pointer-events-none absolute inset-x-1 top-1/2 z-0 h-10 -translate-y-1/2 rounded-full"
              aria-hidden
            />

            <Wheel
              scrollRef={hourRef}
              values={HOURS}
              selected={h}
              onSelect={setHour}
            />
            <span className="relative z-10 pb-0.5 text-center text-lg font-semibold text-white/80">:</span>
            <Wheel
              scrollRef={minuteRef}
              values={MINUTES}
              selected={minuteSnapped}
              onSelect={setMinute}
            />
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

function Wheel({
  values,
  selected,
  onSelect,
  scrollRef,
}: {
  values: number[];
  selected: number;
  onSelect: (v: number) => void;
  scrollRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={scrollRef}
      className="relative z-10 h-[120px] snap-y snap-mandatory overflow-y-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div className="h-10" aria-hidden />
      {values.map((v) => {
        const active = v === selected;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onSelect(v)}
            className={`flex h-10 w-full snap-center items-center justify-center tabular-nums transition ${
              active
                ? "text-base font-semibold text-white arc-tab-glow"
                : "text-sm text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            {pad(v)}
          </button>
        );
      })}
      <div className="h-10" aria-hidden />
    </div>
  );
}
