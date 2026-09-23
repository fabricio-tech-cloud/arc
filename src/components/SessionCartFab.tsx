"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSessionCart } from "@/components/SessionCart";

export function SessionCartFab() {
  const { count } = useSessionCart();
  const pathname = usePathname();

  if (count === 0) return null;
  if (pathname.startsWith("/workouts/session")) return null;

  return (
    <Link
      href="/workouts/session"
      className="arc-tabbar-glass fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full text-[var(--accent)] shadow-lg transition hover:bg-white/10 sm:right-6"
      aria-label={`Session mit ${count} Übungen öffnen`}
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path
          d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1Z"
          strokeLinejoin="round"
        />
        <path
          d="M8 6H7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-1"
          strokeLinejoin="round"
        />
        <path d="M9 11h6M9 15h4" strokeLinecap="round" />
      </svg>
      <span className="arc-chrome absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold">
        {count}
      </span>
    </Link>
  );
}
