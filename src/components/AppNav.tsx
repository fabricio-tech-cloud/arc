"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BorderBeam } from "border-beam";
import { ThinkingOrb } from "thinking-orbs";
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
  if (pathname.startsWith("/profile")) return "Profile";
  if (pathname.includes("/live")) return "Live";
  if (pathname.startsWith("/workouts/groups/")) {
    const slug = pathname.split("/")[3];
    const group = parseGroupParam(slug);
    if (group) return GROUP_LABELS[group];
  }
  if (pathname.startsWith("/workouts/session")) return "Session";
  if (pathname.startsWith("/workouts")) return "Workouts";
  if (pathname.startsWith("/journal")) return "Journal";
  if (pathname.startsWith("/supplements")) return "Supplements";
  return "Overview";
}

export function AppNav() {
  const pathname = usePathname();
  const section = sectionTitle(pathname);
  const activeIndex = Math.max(
    0,
    links.findIndex(
      (link) => pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href)),
    ),
  );

  return (
    <>
      <header className="animate-rise relative flex flex-col items-center justify-center pb-2">
        <Link
          href="/profile"
          aria-label="Profile"
          className="absolute right-0 top-0 z-20 flex h-8 w-8 items-center justify-center rounded-full text-white/45 transition hover:bg-white/8 hover:text-white/80"
        >
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7">
            <circle cx="12" cy="8" r="3.25" />
            <path d="M5.5 19.5c1.6-3.2 4-4.75 6.5-4.75s4.9 1.55 6.5 4.75" strokeLinecap="round" />
          </svg>
        </Link>
        <span
          className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-[58%] scale-x-[1.65] opacity-55"
          aria-hidden
        >
          <ThinkingOrb state="composing" size={64} theme="dark" />
        </span>
        <Link
          href="/"
          className="relative z-10 text-2xl font-normal tracking-[0.08em] text-[var(--text)] uppercase"
          style={{ fontFamily: "var(--font-logo), sans-serif" }}
        >
          ARC
        </Link>
        <p
          className="relative z-10 mt-0.5 text-xs font-normal tracking-wide text-[var(--muted)]"
          style={{ fontFamily: "var(--font-logo), sans-serif" }}
        >
          {section}
        </p>
      </header>

      <nav
        className="arc-tabbar fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2"
        aria-label="Hauptnavigation"
      >
        <div className="relative w-full max-w-[20rem]">
          <div className="arc-tabbar-glass relative grid w-full grid-cols-4 rounded-full p-1.5">
            <span
              aria-hidden
              className="arc-tab-active pointer-events-none absolute inset-y-1.5 left-1.5 w-[calc((100%-0.75rem)/4)] rounded-full transition-transform duration-300 ease-out"
              style={{ transform: `translateX(${activeIndex * 100}%)` }}
            />
            {links.map((link, i) => {
              const active = i === activeIndex;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative z-10 flex min-w-0 flex-col items-center gap-0.5 rounded-full px-1.5 py-1 text-[9px] font-medium tracking-wide transition-colors duration-300 ${
                    active
                      ? "text-white arc-tab-glow"
                      : "text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                >
                  <span className={active ? "opacity-100" : "opacity-80"}>{link.icon}</span>
                  <span className="truncate">{link.label}</span>
                </Link>
              );
            })}
          </div>
          {/* Overlay above glass. Default BorderBeam masks paint invisible here; use a
              box-shadow + rotating conic border without mask-composite. */}
          <BorderBeam
            className="pointer-events-none"
            style={{ position: "absolute", inset: 0, zIndex: 20 }}
            size="md"
            borderRadius={28}
            colorVariant="ice"
            theme="dark"
            strength={1}
            duration={2.8}
            aria-hidden
            css={`
              [data-beam="{id}"] {
                overflow: visible !important;
              }
              [data-beam="{id}"]::before,
              [data-beam="{id}"] [data-beam-bloom] {
                display: none !important;
                content: none !important;
              }
              [data-beam="{id}"][data-active]::after,
              [data-beam="{id}"][data-fading]::after {
                content: "" !important;
                position: absolute !important;
                inset: 0 !important;
                border-radius: 28px !important;
                border: 2px solid transparent !important;
                padding: 0 !important;
                background: conic-gradient(
                  from var(--beam-angle-{id}),
                  transparent 0%,
                  transparent 58%,
                  rgba(186, 230, 253, 0.25) 68%,
                  rgba(224, 242, 254, 0.9) 80%,
                  #fff 88%,
                  rgba(224, 242, 254, 0.9) 93%,
                  rgba(186, 230, 253, 0.25) 97%,
                  transparent 100%
                ) border-box !important;
                -webkit-mask:
                  linear-gradient(#fff 0 0) padding-box,
                  linear-gradient(#fff 0 0) !important;
                -webkit-mask-composite: xor !important;
                mask:
                  linear-gradient(#fff 0 0) padding-box,
                  linear-gradient(#fff 0 0) !important;
                mask-composite: exclude !important;
                opacity: 1 !important;
                filter: drop-shadow(0 0 5px rgba(186, 230, 253, 0.45)) !important;
                z-index: 5 !important;
                pointer-events: none !important;
                clip-path: none !important;
              }
            `}
          >
            <div className="h-full w-full rounded-full" />
          </BorderBeam>
        </div>
      </nav>
    </>
  );
}
