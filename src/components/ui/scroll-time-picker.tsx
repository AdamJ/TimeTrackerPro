import * as React from 'react';
import { cn } from '@/lib/util';

interface TimePickerProps {
  value: string; // "HH:MM" 24-hour format
  onValueChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

/**
 * TimePicker - A11y-compliant time input component
 *
 * Uses native HTML5 time input for consistent UX across devices.
 * On mobile, browsers provide native time pickers.
 * On desktop, browsers provide keyboard-accessible time inputs.
 *
 * Time selection is restricted to 15-minute intervals (00, 15, 30, 45).
 *
 * Follows shadcn/ui design tokens and styling conventions.
 */
export const TimePicker = React.forwardRef<HTMLInputElement, TimePickerProps>(
  (
    { value, onValueChange, disabled = false, className, id, ...ariaProps },
    ref
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      if (newValue) {
        onValueChange(newValue);
      }
    };

    return (
      <input
        ref={ref}
        type="time"
        id={id}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        step={900}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'md:text-sm',
          className
        )}
        {...ariaProps}
      />
    );
  }
);

TimePicker.displayName = 'TimePicker';

// Legacy export for backward compatibility during transition
export const ScrollTimePicker = TimePicker;
