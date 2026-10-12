"use client";

import { useEffect, useRef, useState } from "react";
import type { BodyState, MuscleId } from "body-muscles";
import { useArcDensity } from "@/components/ViewportDensity";
import type { ArcDensity } from "@/lib/viewport";

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
  /** When set, crop/zoom the SVG to these muscle ids (mini cards). */
  focusIds?: string[];
};

/** Mobile / compact (black shell): light silhouette so the figure stays visible */
const MOBILE_INTENSITY: Record<number, string> = {
  0: "#c8ced6",
  1: "#e8e4f4",
  2: "#d4c8fc",
  3: "#c0abf5",
  4: "#a78bfa",
  5: "#9270ef",
  6: "#7c5cbf",
  7: "#6b47b0",
  8: "#5a359a",
  9: "#4c2a82",
  10: "#3b1f66",
};

/** Desktop / extended: idle white → dark lilac by training intensity */
const DESKTOP_INTENSITY: Record<number, string> = {
  0: "#ffffff",
  1: "#f3f0ff",
  2: "#e8e4f4",
  3: "#d4c8fc",
  4: "#c0abf5",
  5: "#a78bfa",
  6: "#9270ef",
  7: "#7c5cbf",
  8: "#6b47b0",
  9: "#4c2a82",
  10: "#2e184d",
};

function spectrumForDensity(density: ArcDensity) {
  return density === "extended" ? DESKTOP_INTENSITY : MOBILE_INTENSITY;
}

function applyIntensityColors(
  target: Record<number, string>,
  density: ArcDensity,
) {
  const source = spectrumForDensity(density);
  for (let i = 0; i <= 10; i++) {
    target[i] = source[i];
  }
}

async function applyFocusZoom(host: HTMLElement, focusIds: string[], view: View) {
  if (!focusIds.length) return;
  const mod = await import("body-muscles");
  const muscles = view === "BACK" ? mod.BACK_MUSCLES : mod.FRONT_MUSCLES;
  const nameById = new Map(muscles.map((m) => [m.id, m.name]));
  const focusNames = new Set(
    focusIds.map((id) => nameById.get(id)).filter((n): n is string => Boolean(n)),
  );
  if (!focusNames.size) return;

  const svg = host.querySelector("svg.body-chart-svg") as SVGSVGElement | null;
  if (!svg) return;

  const bg = svg.querySelector(".body-chart-background");
  if (bg instanceof SVGElement) bg.style.opacity = "0";

  const label = host.querySelector(".body-chart-view-label");
  if (label instanceof HTMLElement) label.style.display = "none";

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  svg.querySelectorAll("path.body-chart-muscle").forEach((node) => {
    const path = node as SVGPathElement;
    const title = path.querySelector("title")?.textContent ?? "";
    const isFocus = focusNames.has(title);
    if (!isFocus) {
      path.style.opacity = "0";
      path.style.pointerEvents = "none";
      return;
    }
    path.style.opacity = "1";
    const b = path.getBBox();
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  });

  if (!Number.isFinite(minX)) return;

  const padX = Math.max((maxX - minX) * 0.18, 1.2);
  const padY = Math.max((maxY - minY) * 0.18, 1.2);
  const w = Math.max(maxX - minX + padX * 2, 6);
  const h = Math.max(maxY - minY + padY * 2, 6);
  svg.setAttribute("viewBox", `${minX - padX} ${minY - padY} ${w} ${h}`);
  svg.style.maxHeight = "150px";
  svg.style.maxWidth = "100%";
  svg.style.width = "100%";
}

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
  focusIds,
}: Props) {
  const density = useArcDensity();
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
  const focusRef = useRef(focusIds);
  const bodyStateRef = useRef(bodyState);
  clickRef.current = onMuscleClick;
  interactiveRef.current = interactive;
  focusRef.current = focusIds;
  bodyStateRef.current = bodyState;

  useEffect(() => {
    if (controlledView) setView(controlledView);
  }, [controlledView]);

  // Recreate chart when compact ↔ extended changes so fills pick up the right palette
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    let cancelled = false;

    (async () => {
      const mod = await import("body-muscles");
      if (cancelled || !hostRef.current) return;

      applyIntensityColors(mod.INTENSITY_COLORS, density);

      const ViewSide = mod.ViewSide;
      chartRef.current = new mod.BodyChart(hostRef.current, {
        view: view === "BACK" ? ViewSide.BACK : ViewSide.FRONT,
        bodyState: bodyStateRef.current,
        showViewLabel: size === "lg",
        className: `arc-body-map arc-body-map-${size}`,
        onMuscleClick(id: MuscleId, name: string) {
          if (!interactiveRef.current) return;
          setActive({ id, name });
          clickRef.current?.(id, name);
        },
      });

      if (focusRef.current?.length) {
        requestAnimationFrame(() => {
          if (!cancelled && hostRef.current) {
            void applyFocusZoom(hostRef.current, focusRef.current!, view);
          }
        });
      }
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
    // view is applied via update effect; density remounts for palette swap
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [density, size]);

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
      applyIntensityColors(mod.INTENSITY_COLORS, density);
      chartRef.current?.update({
        view: view === "BACK" ? mod.ViewSide.BACK : mod.ViewSide.FRONT,
        bodyState: next,
      });
      if (focusIds?.length && hostRef.current) {
        requestAnimationFrame(() => {
          if (hostRef.current) void applyFocusZoom(hostRef.current, focusIds, view);
        });
      }
    });
  }, [view, bodyState, selectedId, ready, focusIds, density]);

  return (
    <div className={`flex h-full flex-col ${className}`}>
      {showToggle && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-medium tracking-[0.16em] text-[var(--muted)] uppercase lg:text-white">
            This week
          </p>
          <div className="arc-tabbar-glass relative grid grid-cols-2 rounded-full p-0.5">
            <span
              aria-hidden
              className={`arc-tab-active pointer-events-none absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-full transition-transform duration-300 ease-out ${
                view === "BACK" ? "translate-x-full" : "translate-x-0"
              }`}
            />
            <button
              type="button"
              onClick={() => setView("FRONT")}
              className={`relative z-10 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-300 ${
                view === "FRONT"
                  ? "text-white arc-tab-glow"
                  : "text-[var(--muted)] hover:text-[var(--text)] lg:text-white/55 lg:hover:text-white"
              }`}
            >
              Front
            </button>
            <button
              type="button"
              onClick={() => setView("BACK")}
              className={`relative z-10 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-300 ${
                view === "BACK"
                  ? "text-white arc-tab-glow"
                  : "text-[var(--muted)] hover:text-[var(--text)] lg:text-white/55 lg:hover:text-white"
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
            ? "mx-auto min-h-[320px] w-full max-w-sm"
            : "pointer-events-none flex min-h-[132px] items-center justify-center overflow-hidden rounded-[1.75rem]"
        }
      />

      {showHint && (
        <p className="mt-3 min-h-[1.25rem] text-center text-sm text-[var(--muted)] lg:text-white/80">
          {active ? (
            <>
              <span className="text-[var(--accent)] lg:text-white">{active.name}</span>
              <span className="mx-1.5 text-[var(--line)] lg:text-white/35">·</span>
              <span className="font-mono text-xs lg:text-white/70">{active.id}</span>
            </>
          ) : (
            "Tap a muscle to see this week's training"
          )}
        </p>
      )}
    </div>
  );
}
