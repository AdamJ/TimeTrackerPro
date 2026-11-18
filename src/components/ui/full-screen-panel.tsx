import * as React from "react"

import { useIsMobile } from "@/hooks/use-mobile"
import { useVisualViewport } from "@/hooks/useVisualViewport"

// True while the enclosing dialog panel is rendered full screen (small screens),
// so a footer can pin itself to the bottom edge above the keyboard.
export const FullScreenContext = React.createContext(false)

// Below md a dialog fills the screen (a centered modal leaves no room for the
// on-screen keyboard); from md up it is the usual centered modal. The panel is a
// flex column so a footer can sit at the bottom with mt-auto, and a grid again
// from md up.
export const FULL_SCREEN_PANEL_CLASSES =
  "fixed inset-0 z-50 flex h-dvh w-full flex-col gap-2 overflow-y-auto overscroll-contain bg-background px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-8 data-[state=closed]:slide-out-to-bottom-8 md:inset-auto md:left-[50%] md:top-[50%] md:grid md:h-auto md:max-w-lg md:translate-x-[-50%] md:translate-y-[-50%] md:overflow-visible md:rounded-lg md:border md:p-4 md:data-[state=open]:zoom-in-95 md:data-[state=closed]:zoom-out-95 md:data-[state=closed]:slide-out-to-left-1/2 md:data-[state=closed]:slide-out-to-top-[48%] md:data-[state=open]:slide-in-from-left-1/2 md:data-[state=open]:slide-in-from-top-[48%]"

// Footer pinned to the bottom of a full-screen panel. Sticky offsets are measured
// from the panel's content box, so -bottom-4 cancels its pb-4 and keeps the
// footer flush with the bottom edge (no scrolled content showing under it).
// mt-auto drops it to the bottom of the screen when the content is short.
export const PINNED_FOOTER_CLASSES =
  "sticky -bottom-4 z-10 -mx-4 mt-auto gap-2 border-t bg-background px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:space-x-0"

/**
 * Whether a dialog should render full screen right now, and the inline style that
 * sizes it to the visible area (the iOS keyboard overlays the page without
 * shrinking dvh, but it does shrink the visual viewport).
 */
export function useFullScreenPanel(enabled: boolean) {
  const isMobile = useIsMobile()
  const isFullScreen = enabled && isMobile
  const visible = useVisualViewport(isFullScreen)
  const style: React.CSSProperties | undefined =
    isFullScreen && visible
      ? { top: visible.top, bottom: "auto", height: visible.height }
      : undefined
  return { isFullScreen, style }
}
