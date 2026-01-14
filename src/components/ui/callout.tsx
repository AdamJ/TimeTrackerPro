import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/util"

const calloutVariants = cva(
  "relative w-full rounded-xl border p-4 transition-all duration-200 ease-in-out flex gap-3 items-start",
  {
    variants: {
      variant: {
        default: "bg-white/50 border-gray-200 text-gray-900 shadow-sm backdrop-blur-sm",
        outline: "bg-transparent border-gray-200 text-gray-900",
        soft: "border-transparent text-gray-900",
        surface: "bg-white border-gray-200 text-gray-900 shadow-sm",
        info: "bg-blue-50/80 border-blue-200 text-blue-900 shadow-sm shadow-blue-100/50 backdrop-blur-sm",
        warning: "bg-orange-50/80 border-orange-200 text-orange-900 shadow-sm shadow-orange-100/50 backdrop-blur-sm",
        error: "bg-red-50/80 border-red-200 text-red-900 shadow-sm shadow-red-100/50 backdrop-blur-sm",
        success: "bg-green-50/80 border-green-200 text-green-900 shadow-sm shadow-green-100/50 backdrop-blur-sm",
      },
      size: {
        "1": "p-2.5 text-xs",
        "2": "p-4 text-sm",
        "3": "p-6 text-base",
      },
    },
    compoundVariants: [
      {
        variant: "soft",
        className: "bg-gray-100",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "2",
    },
  }
)

interface CalloutRootProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof calloutVariants> { }

const CalloutRoot = React.forwardRef<HTMLDivElement, CalloutRootProps>(
  ({ className, variant, size, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(calloutVariants({ variant, size }), className)}
      {...props}
    />
  )
)
CalloutRoot.displayName = "CalloutRoot"

const CalloutIcon = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex-shrink-0 mt-0.5 opacity-80", className)}
    {...props}
  />
))
CalloutIcon.displayName = "CalloutIcon"

const CalloutText = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm leading-relaxed flex-1", className)}
    {...props}
  />
))
CalloutText.displayName = "CalloutText"

export const Callout = {
  Root: CalloutRoot,
  Icon: CalloutIcon,
  Text: CalloutText,
}

export { CalloutRoot, CalloutIcon, CalloutText }
