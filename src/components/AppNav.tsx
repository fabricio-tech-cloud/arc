"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GROUP_LABELS, parseGroupParam } from "@/lib/muscles";

const links = [
  {
    href: "/",
    label: "Overview",
    icon: (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/workouts",
    label: "Workouts",
    icon: (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M7 8v8M17 8v8M4 10v4M20 10v4M7 12h10" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/journal",
    label: "Journal",
    icon: (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M7 4h10a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2Z" strokeLinejoin="round" />
        <path d="M9 9h6M9 13h4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/supplements",
    label: "Supps",
    icon: (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M9 3h6v4H9V3ZM10 7h4v14a2 2 0 0 1-2 2h0a2 2 0 0 1-2-2V7Z" strokeLinejoin="round" />
        <path d="M10 12h4" strokeLinecap="round" />
      </svg>
    ),
  },
];

function sectionTitle(pathname: string) {
  if (pathname.startsWith("/workouts/groups/")) {
    const slug = pathname.split("/")[3];
    const group = parseGroupParam(slug);
    if (group) return GROUP_LABELS[group];
  }
  if (pathname.startsWith("/workouts")) return "Workouts";
  if (pathname.startsWith("/journal")) return "Journal";
  if (pathname.startsWith("/supplements")) return "Supplements";
  return "Overview";
}

export function AppNav() {
  const pathname = usePathname();
  const section = sectionTitle(pathname);

  return (
    <>
      <header className="animate-rise flex flex-col items-center justify-center pb-2">
        <Link
          href="/"
          className="text-2xl font-normal tracking-[0.08em] text-[var(--text)] uppercase"
          style={{ fontFamily: '"Times New Roman", Times, serif' }}
        >
          ARC
        </Link>
        <p
          className="mt-0.5 text-xs font-normal tracking-wide text-[var(--muted)]"
          style={{ fontFamily: '"Times New Roman", Times, serif' }}
        >
          {section}
        </p>
      </header>

      <nav
        className="arc-tabbar fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2"
        aria-label="Hauptnavigation"
      >
        <div className="arc-tabbar-glass relative flex w-full max-w-[20rem] items-stretch justify-between gap-0.5 rounded-full px-1.5 py-1.5">
          {links.map((link) => {
            const active =
              pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative z-10 flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-full px-1.5 py-1 text-[9px] font-medium tracking-wide transition ${
                  active
                    ? "arc-tab-active text-white arc-tab-glow"
                    : "text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]"
                }`}
              >
                <span className={active ? "opacity-100" : "opacity-80"}>{link.icon}</span>
                <span className="truncate">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
