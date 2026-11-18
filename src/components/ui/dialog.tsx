import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/util"
import { useIsMobile } from "@/hooks/use-mobile"
import { useVisualViewport } from "@/hooks/useVisualViewport"

const Dialog = DialogPrimitive.Root

// True while the enclosing DialogContent is rendered full screen (fullScreenOnMobile
// on a small screen), so DialogFooter can pin itself above the keyboard.
const FullScreenContext = React.createContext(false)

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const CENTERED_CLASSES =
  "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-2 border bg-background px-4 py-4 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg"

// Below md the panel fills the screen (a centered modal leaves no room for the
// on-screen keyboard); from md up it is the usual centered modal.
const FULL_SCREEN_CLASSES =
  "fixed inset-0 z-50 grid h-dvh w-full content-start gap-2 overflow-y-auto overscroll-contain bg-background px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-8 data-[state=closed]:slide-out-to-bottom-8 md:inset-auto md:left-[50%] md:top-[50%] md:h-auto md:max-w-lg md:translate-x-[-50%] md:translate-y-[-50%] md:content-normal md:overflow-visible md:rounded-lg md:border md:p-4 md:data-[state=open]:zoom-in-95 md:data-[state=closed]:zoom-out-95 md:data-[state=closed]:slide-out-to-left-1/2 md:data-[state=closed]:slide-out-to-top-[48%] md:data-[state=open]:slide-in-from-left-1/2 md:data-[state=open]:slide-in-from-top-[48%]"

interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /** Fill the whole screen below md, sized to the visible area so the keyboard never covers it. */
  fullScreenOnMobile?: boolean
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, fullScreenOnMobile = false, style, ...props }, ref) => {
  const isMobile = useIsMobile()
  const isFullScreen = fullScreenOnMobile && isMobile
  const visible = useVisualViewport(isFullScreen)
  const fullScreenStyle: React.CSSProperties | undefined =
    isFullScreen && visible
      ? { top: visible.top, bottom: "auto", height: visible.height }
      : undefined

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          fullScreenOnMobile ? FULL_SCREEN_CLASSES : CENTERED_CLASSES,
          className
        )}
        style={{ ...fullScreenStyle, ...style }}
        {...props}
      >
        <FullScreenContext.Provider value={isFullScreen}>
          {children}
        </FullScreenContext.Provider>
        <DialogPrimitive.Close
          className={cn(
            "absolute right-1 top-1 rounded-sm py-2 px-2 ring-offset-background transition-opacity hover:bg-accent focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground",
            fullScreenOnMobile &&
              "max-md:top-[max(0.25rem,env(safe-area-inset-top))] max-md:right-[max(0.25rem,env(safe-area-inset-right))]"
          )}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left pr-8",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const fullScreen = React.useContext(FullScreenContext)
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
        // Pinned to the bottom of the scrolling full-screen panel so the actions
        // stay reachable above the on-screen keyboard. Sticky offsets are measured
        // from the panel's content box, so -bottom-4 cancels its pb-4 and keeps
        // the footer flush with the bottom edge (no scrolled content showing under it).
        fullScreen &&
          "sticky -bottom-4 z-10 -mx-4 gap-2 border-t bg-background px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:space-x-0",
        className
      )}
      {...props}
    />
  )
}
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
