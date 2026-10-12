"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  type ArcDensity,
  getArcDensity,
  subscribeArcDensity,
} from "@/lib/viewport";

const DensityContext = createContext<ArcDensity>("compact");

/** Mirrors viewport width (≥1024 = extended) onto <html> and React context. */
export function ViewportDensityProvider({ children }: { children: React.ReactNode }) {
  const [density, setDensity] = useState<ArcDensity>(() =>
    typeof window === "undefined" ? "compact" : getArcDensity(),
  );

  useEffect(() => subscribeArcDensity(setDensity), []);

  return <DensityContext.Provider value={density}>{children}</DensityContext.Provider>;
}

export function useArcDensity(): ArcDensity {
  return useContext(DensityContext);
}

export function useIsExtendedViewport(): boolean {
  return useArcDensity() === "extended";
}
