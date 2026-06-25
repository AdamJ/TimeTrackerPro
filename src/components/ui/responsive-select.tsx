import * as React from "react"

import { cn } from "@/lib/util"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface ResponsiveSelectOption {
  value: string
  label: React.ReactNode
  /** Plain-text label used for the native `<option>` on mobile when `label` is not a string. */
  textLabel?: string
  disabled?: boolean
}

export interface ResponsiveSelectProps {
  value?: string
  onValueChange: (value: string) => void
  options: ResponsiveSelectOption[]
  placeholder?: string
  id?: string
  className?: string
  disabled?: boolean
  "aria-label"?: string
}

/**
 * Renders a native `<select>` on mobile widths (so iOS/Android show their
 * platform picker UI) and the Radix `Select` on desktop. Keeps a single
 * flat-option API so callers don't duplicate the responsive branch.
 */
export const ResponsiveSelect: React.FC<ResponsiveSelectProps> = ({
  value,
  onValueChange,
  options,
  placeholder,
  id,
  className,
  disabled,
  "aria-label": ariaLabel,
}) => {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <select
        id={id}
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onValueChange(e.target.value)}
        aria-label={ariaLabel}
        className={cn(
          "flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      >
        {placeholder && (
          <option value="" disabled hidden={!!value}>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.textLabel ??
              (typeof option.label === "string" ? option.label : option.value)}
          </option>
        ))}
      </select>
    )
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger id={id} className={className} aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
