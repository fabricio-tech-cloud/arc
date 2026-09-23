"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { MuscleGroupKey } from "@/lib/muscles";

export type CartSetDraft = {
  reps: string;
  weight: string;
  rir: string;
  failure: boolean;
};

export type CartItem = {
  name: string;
  muscleGroup: MuscleGroupKey;
  sets: CartSetDraft[];
};

type SessionCartContextValue = {
  items: CartItem[];
  count: number;
  has: (name: string) => boolean;
  toggle: (item: Pick<CartItem, "name" | "muscleGroup">) => void;
  remove: (name: string) => void;
  setSets: (name: string, sets: CartSetDraft[]) => void;
  clear: () => void;
};

const STORAGE_KEY = "arc-session-cart";

const SessionCartContext = createContext<SessionCartContextValue | null>(null);

function emptySet(): CartSetDraft {
  return { reps: "", weight: "", rir: "", failure: false };
}

function normalizeSet(raw: Partial<CartSetDraft> | null | undefined): CartSetDraft {
  return {
    reps: typeof raw?.reps === "string" ? raw.reps : "",
    weight: typeof raw?.weight === "string" ? raw.weight : "",
    rir: typeof raw?.rir === "string" ? raw.rir : "",
    failure: Boolean(raw?.failure),
  };
}

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item) => item && typeof item.name === "string" && typeof item.muscleGroup === "string",
      )
      .map((item) => ({
        ...item,
        sets: Array.isArray(item.sets) ? item.sets.map(normalizeSet) : [emptySet()],
      }));
  } catch {
    return [];
  }
}

export function SessionCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(loadCart());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, ready]);

  const has = useCallback(
    (name: string) => items.some((item) => item.name === name),
    [items],
  );

  const toggle = useCallback((item: Pick<CartItem, "name" | "muscleGroup">) => {
    setItems((prev) => {
      const exists = prev.some((p) => p.name === item.name);
      if (exists) return prev.filter((p) => p.name !== item.name);
      return [
        ...prev,
        { name: item.name, muscleGroup: item.muscleGroup, sets: [emptySet()] },
      ];
    });
  }, []);

  const remove = useCallback((name: string) => {
    setItems((prev) => prev.filter((p) => p.name !== name));
  }, []);

  const setSets = useCallback((name: string, sets: CartSetDraft[]) => {
    setItems((prev) =>
      prev.map((item) => (item.name === name ? { ...item, sets } : item)),
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({
      items,
      count: items.length,
      has,
      toggle,
      remove,
      setSets,
      clear,
    }),
    [items, has, toggle, remove, setSets, clear],
  );

  return (
    <SessionCartContext.Provider value={value}>{children}</SessionCartContext.Provider>
  );
}

export function useSessionCart() {
  const ctx = useContext(SessionCartContext);
  if (!ctx) throw new Error("useSessionCart must be used within SessionCartProvider");
  return ctx;
}
