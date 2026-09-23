"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const EDGE_PX = 28;
const TRIGGER_PX = 72;
const HINT_INTERVAL_MS = 4500;

export function SwipeBack({ href = "/workouts" }: { href?: string }) {
  const router = useRouter();
  const startX = useRef(0);
  const startY = useRef(0);
  const active = useRef(false);
  const axis = useRef<"h" | "v" | null>(null);
  const dragX = useRef(0);
  const [pull, setPull] = useState(0);
  const [hinting, setHinting] = useState(false);

  useEffect(() => {
    let hintTimer: ReturnType<typeof setTimeout> | null = null;
    let cycleTimer: ReturnType<typeof setInterval> | null = null;

    function playHint() {
      if (active.current) return;
      setHinting(true);
      hintTimer = setTimeout(() => setHinting(false), 1100);
    }

    const first = setTimeout(playHint, 1200);
    cycleTimer = setInterval(playHint, HINT_INTERVAL_MS);

    return () => {
      clearTimeout(first);
      if (hintTimer) clearTimeout(hintTimer);
      if (cycleTimer) clearInterval(cycleTimer);
    };
  }, []);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (e.clientX > EDGE_PX) return;
      active.current = true;
      axis.current = null;
      startX.current = e.clientX;
      startY.current = e.clientY;
      dragX.current = 0;
      setPull(0);
      setHinting(false);
    }

    function onPointerMove(e: PointerEvent) {
      if (!active.current) return;
      const dx = e.clientX - startX.current;
      const dy = e.clientY - startY.current;

      if (!axis.current) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        axis.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
        if (axis.current === "v") {
          active.current = false;
          setPull(0);
          return;
        }
      }

      if (axis.current !== "h") return;
      const next = Math.max(0, Math.min(120, dx));
      dragX.current = next;
      setPull(next);
    }

    function finish() {
      if (!active.current) return;
      const shouldGo = axis.current === "h" && dragX.current >= TRIGGER_PX;
      active.current = false;
      axis.current = null;
      dragX.current = 0;
      setPull(0);
      if (shouldGo) router.push(href);
    }

    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", finish, { passive: true });
    window.addEventListener("pointercancel", finish, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  }, [href, router]);

  const progress = Math.min(1, pull / TRIGGER_PX);

  return (
    <div
      className="pointer-events-none fixed inset-y-0 left-0 z-40 flex w-10 items-center justify-start"
      aria-hidden
    >
      <div
        className={`swipe-back-arrow flex h-9 w-9 items-center justify-center text-[var(--muted)] ${
          hinting && pull === 0 ? "swipe-back-hint" : ""
        }`}
        style={{
          opacity: pull > 0 ? 0.35 + progress * 0.65 : hinting ? undefined : 0,
          transform:
            pull > 0
              ? `translateX(${8 + pull * 0.35}px) scale(${0.85 + progress * 0.2})`
              : undefined,
          color: progress >= 1 ? "var(--accent)" : undefined,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M11.5 3.5L6 9l5.5 5.5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
