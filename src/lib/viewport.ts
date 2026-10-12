/** Compact ↔ extended shell breakpoint (CSS `lg` / 1024px). */
export const EXTENDED_MIN_WIDTH = 1024;

export const EXTENDED_MEDIA = `(min-width: ${EXTENDED_MIN_WIDTH}px)`;

export type ArcDensity = "compact" | "extended";

export function getArcDensity(): ArcDensity {
  if (typeof window === "undefined") return "compact";
  return window.matchMedia(EXTENDED_MEDIA).matches ? "extended" : "compact";
}

export function isExtendedViewport(): boolean {
  return getArcDensity() === "extended";
}

/** Keep <html data-arc-density> in sync with the browser viewport width. */
export function syncDocumentDensity(density: ArcDensity = getArcDensity()) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.arcDensity = density;
}

export function subscribeArcDensity(onChange: (density: ArcDensity) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia(EXTENDED_MEDIA);
  const fire = () => {
    const density: ArcDensity = mq.matches ? "extended" : "compact";
    syncDocumentDensity(density);
    onChange(density);
  };
  fire();
  mq.addEventListener("change", fire);
  return () => mq.removeEventListener("change", fire);
}
