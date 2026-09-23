"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const DELETE_W = 76;
const AXIS_THRESHOLD = 6;

export function SwipeDeleteRow({
  open,
  onOpenChange,
  onDelete,
  onTap,
  actionLabel = "Löschen",
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
  /** Fired on a real tap (not a swipe). Prefer this over nested Links. */
  onTap?: () => void;
  actionLabel?: string;
  children: ReactNode;
}) {
  const startX = useRef(0);
  const startY = useRef(0);
  const startOffset = useRef(0);
  const axis = useRef<"h" | "v" | null>(null);
  const pointerId = useRef<number | null>(null);
  const offsetRef = useRef(0);
  const draggingRef = useRef(false);
  const swipedRef = useRef(false);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!dragging) {
      const next = open ? -DELETE_W : 0;
      offsetRef.current = next;
      setOffset(next);
    }
  }, [open, dragging]);

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // Don't start a swipe from form controls / nested buttons / links
    const target = e.target as HTMLElement | null;
    if (target?.closest("input, textarea, select, button, a, label")) return;
    pointerId.current = e.pointerId;
    startX.current = e.clientX;
    startY.current = e.clientY;
    startOffset.current = open ? -DELETE_W : 0;
    axis.current = null;
    swipedRef.current = false;
    draggingRef.current = true;
    setDragging(true);
    // Do not capture yet — capturing on down suppresses child/link clicks.
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!draggingRef.current || pointerId.current !== e.pointerId) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    if (!axis.current) {
      if (Math.abs(dx) < AXIS_THRESHOLD && Math.abs(dy) < AXIS_THRESHOLD) return;
      axis.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
      if (axis.current === "v") {
        pointerId.current = null;
        draggingRef.current = false;
        setDragging(false);
        const reset = open ? -DELETE_W : 0;
        offsetRef.current = reset;
        setOffset(reset);
        return;
      }
      // Horizontal swipe confirmed — now capture so we keep receiving moves.
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    if (axis.current !== "h") return;
    e.preventDefault();
    swipedRef.current = true;
    const next = Math.min(0, Math.max(-DELETE_W, startOffset.current + dx));
    offsetRef.current = next;
    setOffset(next);
  }

  function endDrag(e: React.PointerEvent) {
    if (pointerId.current !== e.pointerId) return;
    pointerId.current = null;
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }

    if (axis.current === "h") {
      const shouldOpen = offsetRef.current < -DELETE_W / 2;
      onOpenChange(shouldOpen);
      const next = shouldOpen ? -DELETE_W : 0;
      offsetRef.current = next;
      setOffset(next);
      return;
    }

    // Pure tap — close if open, otherwise let onClick handle navigation.
    const reset = open ? -DELETE_W : 0;
    offsetRef.current = reset;
    setOffset(reset);
  }

  function onClick(e: React.MouseEvent) {
    if (swipedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      swipedRef.current = false;
      return;
    }
    if (open) {
      e.preventDefault();
      e.stopPropagation();
      onOpenChange(false);
      return;
    }
    if (onTap) {
      e.preventDefault();
      e.stopPropagation();
      onTap();
    }
  }

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex" style={{ width: DELETE_W }}>
        <button
          type="button"
          onClick={onDelete}
          className="flex h-full w-full items-center justify-center bg-[#ff3b30] px-1 text-center text-[13px] font-semibold leading-tight text-white"
        >
          {actionLabel}
        </button>
      </div>
      <div
        className={`relative bg-[var(--bg-elevated)] touch-pan-y select-none ${
          dragging ? "cursor-grabbing" : onTap ? "cursor-pointer" : "cursor-default"
        } ${dragging ? "" : "transition-transform duration-200 ease-out"}`}
        style={{ transform: `translateX(${offset}px)`, touchAction: "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={onClick}
      >
        <div
          className="min-w-0 py-3 pr-4"
          style={{
            paddingLeft: `calc(1rem + ${Math.max(0, -offset)}px)`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
