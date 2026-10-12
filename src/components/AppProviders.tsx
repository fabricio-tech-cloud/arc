"use client";

import { SessionCartProvider } from "@/components/SessionCart";
import { SessionCartFab } from "@/components/SessionCartFab";
import { ViewportDensityProvider } from "@/components/ViewportDensity";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ViewportDensityProvider>
      <SessionCartProvider>
        {children}
        <SessionCartFab />
      </SessionCartProvider>
    </ViewportDensityProvider>
  );
}
