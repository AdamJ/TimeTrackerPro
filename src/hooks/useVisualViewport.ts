import { useEffect, useState } from "react";

export interface VisualViewportBox {
  /** Distance from the top of the layout viewport to the top of the visible area. */
  top: number;
  /** Height of the visible area; shrinks when the on-screen keyboard opens. */
  height: number;
}

/**
 * Tracks the visible part of the screen. On iOS the on-screen keyboard overlays
 * the page without resizing the layout viewport (so `dvh` does not shrink); the
 * visual viewport does, which makes it the way to keep a full-screen panel
 * above the keyboard. Returns null when disabled or unsupported.
 */
export function useVisualViewport(enabled: boolean): VisualViewportBox | null {
  const [box, setBox] = useState<VisualViewportBox | null>(null);

  useEffect(() => {
    const viewport = typeof window === "undefined" ? undefined : window.visualViewport;
    if (!enabled || !viewport) {
      setBox(null);
      return;
    }
    const update = () => setBox({ top: viewport.offsetTop, height: viewport.height });
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, [enabled]);

  return box;
}
