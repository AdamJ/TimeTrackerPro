import { useCallback, useRef } from "react";
import type { TouchEvent } from "react";

interface UseHorizontalSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /** Minimum horizontal travel, in CSS px, to count as a swipe. */
  minDistance?: number;
  /** Ignore gestures that start this close to a screen edge (system back/home gestures). */
  edgeGuard?: number;
}

/**
 * Touch handlers that report a deliberate horizontal swipe. A swipe must travel
 * at least `minDistance` and be mostly horizontal, so vertical scrolling is
 * never mistaken for one. Gestures that start in a portaled child (sheets,
 * menus) or near the screen edge are ignored.
 */
export function useHorizontalSwipe({
  onSwipeLeft,
  onSwipeRight,
  minDistance = 60,
  edgeGuard = 24,
}: UseHorizontalSwipeOptions) {
  const start = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback(
    (e: TouchEvent<HTMLElement>) => {
      start.current = null;
      if (e.touches.length !== 1) return;
      // React events bubble through portals; only react to touches on our own DOM.
      if (!e.currentTarget.contains(e.target as Node)) return;
      const { clientX, clientY } = e.touches[0];
      if (clientX < edgeGuard || clientX > window.innerWidth - edgeGuard) return;
      start.current = { x: clientX, y: clientY };
    },
    [edgeGuard],
  );

  const onTouchEnd = useCallback(
    (e: TouchEvent<HTMLElement>) => {
      const origin = start.current;
      start.current = null;
      if (!origin || e.changedTouches.length === 0) return;
      const dx = e.changedTouches[0].clientX - origin.x;
      const dy = e.changedTouches[0].clientY - origin.y;
      if (Math.abs(dx) < minDistance || Math.abs(dx) < Math.abs(dy) * 2) return;
      if (dx < 0) onSwipeLeft?.();
      else onSwipeRight?.();
    },
    [minDistance, onSwipeLeft, onSwipeRight],
  );

  const onTouchCancel = useCallback(() => {
    start.current = null;
  }, []);

  return { onTouchStart, onTouchEnd, onTouchCancel };
}
