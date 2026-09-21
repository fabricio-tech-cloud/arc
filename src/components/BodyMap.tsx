"use client";

import { useEffect, useRef, useState } from "react";
import type { BodyState, MuscleId } from "body-muscles";

type View = "FRONT" | "BACK";

type Props = {
  bodyState: BodyState;
  view?: View;
  size?: "lg" | "sm";
  showToggle?: boolean;
  showHint?: boolean;
  interactive?: boolean;
  className?: string;
  onMuscleClick?: (id: MuscleId, name: string) => void;
  selectedId?: MuscleId | null;
};

export function BodyMap({
  bodyState,
  view: controlledView,
  size = "lg",
  showToggle = true,
  showHint = false,
  interactive = true,
  className = "",
  onMuscleClick,
  selectedId,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<{
    update: (o: Record<string, unknown>) => void;
    destroy: () => void;
  } | null>(null);
  const [view, setView] = useState<View>(controlledView ?? "FRONT");
  const [active, setActive] = useState<{ id: MuscleId; name: string } | null>(null);
  const [ready, setReady] = useState(false);
  const clickRef = useRef(onMuscleClick);
  const interactiveRef = useRef(interactive);
  clickRef.current = onMuscleClick;
  interactiveRef.current = interactive;

  useEffect(() => {
    if (controlledView) setView(controlledView);
  }, [controlledView]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    let cancelled = false;

    (async () => {
      const mod = await import("body-muscles");
      if (cancelled || !hostRef.current) return;

      const ViewSide = mod.ViewSide;
      chartRef.current = new mod.BodyChart(hostRef.current, {
        view: view === "BACK" ? ViewSide.BACK : ViewSide.FRONT,
        bodyState,
        showViewLabel: size === "lg",
        className: `arc-body-map arc-body-map-${size}`,
        onMuscleClick(id: MuscleId, name: string) {
          if (!interactiveRef.current) return;
          setActive({ id, name });
          clickRef.current?.(id, name);
        },
      });
      setReady(true);
    })().catch((err) => {
      console.error("BodyMap init failed", err);
    });

    return () => {
      cancelled = true;
      chartRef.current?.destroy();
      chartRef.current = null;
      setReady(false);
    };
    // Mount once per host
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || !chartRef.current) return;
    const next = { ...bodyState };
    if (selectedId) {
      next[selectedId] = {
        intensity: next[selectedId]?.intensity ?? 1,
        selected: true,
      };
    }
    import("body-muscles").then((mod) => {
      chartRef.current?.update({
        view: view === "BACK" ? mod.ViewSide.BACK : mod.ViewSide.FRONT,
        bodyState: next,
      });
    });
  }, [view, bodyState, selectedId, ready]);

  return (
    <div className={`flex h-full flex-col ${className}`}>
      {showToggle && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-medium tracking-[0.16em] text-[var(--muted)] uppercase">
            Diese Woche
          </p>
          <div className="flex gap-1 rounded-md border border-[var(--line)] bg-[var(--bg)] p-0.5">
            <button
              type="button"
              onClick={() => setView("FRONT")}
              className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                view === "FRONT"
                  ? "bg-[var(--accent)] text-[#0e1110]"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              Front
            </button>
            <button
              type="button"
              onClick={() => setView("BACK")}
              className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                view === "BACK"
                  ? "bg-[var(--accent)] text-[#0e1110]"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              Back
            </button>
          </div>
        </div>
      )}

      <div
        ref={hostRef}
        className={
          size === "lg"
            ? "min-h-[360px] flex-1 rounded-xl border border-[var(--line)] bg-[var(--bg)]/60"
            : "pointer-events-none min-h-[120px] rounded-lg bg-[var(--bg)]/40"
        }
      />

      {showHint && (
        <p className="mt-3 min-h-[1.25rem] text-center text-sm text-[var(--muted)]">
          {active ? (
            <>
              <span className="text-[var(--accent)]">{active.name}</span>
              <span className="mx-1.5 text-[var(--line)]">·</span>
              <span className="font-mono text-xs">{active.id}</span>
            </>
          ) : (
            "Muskel antippen → Gruppe öffnen"
          )}
        </p>
      )}
    </div>
  );
}
