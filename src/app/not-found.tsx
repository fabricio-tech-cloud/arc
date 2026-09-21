"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Fallback for unknown routes — always offer a path back to Overview (`/`). */
export default function NotFound() {
  // #region agent log
  useEffect(() => {
    fetch("http://127.0.0.1:7581/ingest/071442a9-190c-4bcb-8cac-9d7d41291d6c", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "15a754" },
      body: JSON.stringify({
        sessionId: "15a754",
        runId: "post-fix",
        hypothesisId: "A",
        location: "not-found.tsx",
        message: "NotFound rendered",
        data: { path: window.location.pathname },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }, []);
  // #endregion

  return (
    <div className="animate-rise mx-auto max-w-lg space-y-4 text-center">
      <p className="text-sm text-[var(--muted)]">Seite nicht gefunden</p>
      <h1 className="text-2xl font-semibold text-white">Diese Seite gibt es nicht</h1>
      <Link
        href="/"
        className="inline-flex rounded-full bg-[#1c1c1e] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#222224]"
      >
        Zur Overview
      </Link>
    </div>
  );
}
