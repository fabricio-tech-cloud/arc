"use client";

import { WEEKDAYS } from "@/lib/supplements";

type Props = {
  days: number[];
  onToggle: (day: number) => void;
  className?: string;
};

/** Minimal weekday chips — active: white + accent underline (SessionSlotPlanner style). */
export function WeekdayToggle({ days, onToggle, className = "" }: Props) {
  return (
    <div className={`grid grid-cols-7 gap-1 ${className}`}>
      {WEEKDAYS.map((d) => {
        const on = days.includes(d.value);
        return (
          <button
            key={d.value}
            type="button"
            onClick={() => onToggle(d.value)}
            aria-pressed={on}
            aria-label={d.label}
            className={`relative pb-2 pt-1 text-center text-[13px] font-medium tracking-wide transition ${
              on ? "text-white" : "text-white/35 hover:text-white/60"
            }`}
          >
            {d.label.slice(0, 2)}
            <span
              aria-hidden
              className={`pointer-events-none absolute inset-x-1.5 bottom-0 h-[2px] rounded-full transition ${
                on
                  ? "bg-[var(--accent)] opacity-90 shadow-[0_0_8px_rgba(200,206,214,0.35)]"
                  : "bg-transparent"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
