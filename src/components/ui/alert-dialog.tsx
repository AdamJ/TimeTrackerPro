import * as React from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"

import { cn } from "@/lib/util"
import { Button, type ButtonProps } from "@/components/ui/button"
import {
  FULL_SCREEN_PANEL_CLASSES,
  FullScreenContext,
  PINNED_FOOTER_CLASSES,
  useFullScreenPanel,
} from "@/components/ui/full-screen-panel"

const AlertDialog = AlertDialogPrimitive.Root

const AlertDialogTrigger = AlertDialogPrimitive.Trigger

const AlertDialogPortal = AlertDialogPrimitive.Portal

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    ref={ref}
  />
))
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName

const ALERT_CENTERED_CLASSES =
  "group/alert-dialog-content fixed left-[50%] top-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] data-[size=sm]:max-w-xs sm:data-[size=default]:max-w-lg sm:rounded-lg"

// Full screen below md; from md up the same centered alert as before.
const ALERT_FULL_SCREEN_CLASSES = `group/alert-dialog-content ${FULL_SCREEN_PANEL_CLASSES} gap-4 md:max-w-[calc(100%-2rem)] md:gap-4 md:p-6 md:data-[size=sm]:max-w-xs md:data-[size=default]:max-w-lg`

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content> & {
    size?: "default" | "sm"
    /** Fill the screen below md (on by default); pass false to keep a centered alert. */
    fullScreenOnMobile?: boolean
  }
>(({ className, size = "default", fullScreenOnMobile = true, style, children, ...props }, ref) => {
  const { isFullScreen, style: fullScreenStyle } = useFullScreenPanel(fullScreenOnMobile)

  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        ref={ref}
        data-size={size}
        className={cn(
          fullScreenOnMobile ? ALERT_FULL_SCREEN_CLASSES : ALERT_CENTERED_CLASSES,
          className
        )}
        style={{ ...fullScreenStyle, ...style }}
        {...props}
      >
        <FullScreenContext.Provider value={isFullScreen}>
          {children}
        </FullScreenContext.Provider>
      </AlertDialogPrimitive.Content>
    </AlertDialogPortal>
  )
})
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName

const AlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "grid grid-rows-[auto_1fr] place-items-center gap-1.5 text-center has-data-[slot=alert-dialog-media]:grid-rows-[auto_auto_1fr] has-data-[slot=alert-dialog-media]:gap-x-6 sm:group-data-[size=default]/alert-dialog-content:place-items-start sm:group-data-[size=default]/alert-dialog-content:text-left sm:has-data-[slot=alert-dialog-media]:group-data-[size=default]/alert-dialog-content:grid-rows-[auto_1fr]",
      className
    )}
    {...props}
  />
)
AlertDialogHeader.displayName = "AlertDialogHeader"

const AlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const fullScreen = React.useContext(FullScreenContext)
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 group-data-[size=sm]/alert-dialog-content:grid group-data-[size=sm]/alert-dialog-content:grid-cols-2 sm:flex-row sm:justify-end",
        fullScreen && PINNED_FOOTER_CLASSES,
        className
      )}
      {...props}
    />
  )
}
AlertDialogFooter.displayName = "AlertDialogFooter"

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold sm:group-has-data-[slot=alert-dialog-media]/alert-dialog-content:group-data-[size=default]/alert-dialog-content:col-start-2",
      className
    )}
    {...props}
  />
))
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
AlertDialogDescription.displayName =
  AlertDialogPrimitive.Description.displayName

const AlertDialogMedia = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="alert-dialog-media"
    className={cn(
      "mb-2 inline-flex size-16 items-center justify-center rounded-md bg-muted sm:group-data-[size=default]/alert-dialog-content:row-span-2 [svg:not([class*='size-'])]:*:size-8",
      className
    )}
    {...props}
  />
)
AlertDialogMedia.displayName = "AlertDialogMedia"

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action> &
    Pick<ButtonProps, "variant" | "size">
>(({ className, variant = "default", size = "default", ...props }, ref) => (
  <Button variant={variant} size={size} asChild>
    <AlertDialogPrimitive.Action ref={ref} className={cn(className)} {...props} />
  </Button>
))
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel> &
    Pick<ButtonProps, "variant" | "size">
>(({ className, variant = "outline", size = "default", ...props }, ref) => (
  <Button variant={variant} size={size} asChild>
    <AlertDialogPrimitive.Cancel ref={ref} className={cn(className)} {...props} />
  </Button>
))
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogMedia,
  AlertDialogAction,
  AlertDialogCancel,
}
