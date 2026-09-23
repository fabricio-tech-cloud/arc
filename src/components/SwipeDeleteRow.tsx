"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const DELETE_W = 76;

export function SwipeDeleteRow({
  open,
  onOpenChange,
  onDelete,
  actionLabel = "Löschen",
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
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
    pointerId.current = e.pointerId;
    startX.current = e.clientX;
    startY.current = e.clientY;
    startOffset.current = open ? -DELETE_W : 0;
    axis.current = null;
    draggingRef.current = true;
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!draggingRef.current || pointerId.current !== e.pointerId) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    if (!axis.current) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      axis.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
      if (axis.current === "v") {
        try {
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
          /* already released */
        }
        pointerId.current = null;
        draggingRef.current = false;
        setDragging(false);
        const reset = open ? -DELETE_W : 0;
        offsetRef.current = reset;
        setOffset(reset);
        return;
      }
    }
    if (axis.current !== "h") return;
    e.preventDefault();
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
    if (axis.current !== "h") {
      const reset = open ? -DELETE_W : 0;
      offsetRef.current = reset;
      setOffset(reset);
      return;
    }
    const shouldOpen = offsetRef.current < -DELETE_W / 2;
    onOpenChange(shouldOpen);
    const next = shouldOpen ? -DELETE_W : 0;
    offsetRef.current = next;
    setOffset(next);
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
          dragging ? "cursor-grabbing" : "cursor-grab"
        } ${dragging ? "" : "transition-transform duration-200 ease-out"}`}
        style={{ transform: `translateX(${offset}px)`, touchAction: "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
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
