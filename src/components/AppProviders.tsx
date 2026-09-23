"use client";

import { SessionCartProvider } from "@/components/SessionCart";
import { SessionCartFab } from "@/components/SessionCartFab";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionCartProvider>
      {children}
      <SessionCartFab />
    </SessionCartProvider>
  );
}
