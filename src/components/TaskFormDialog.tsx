import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TaskFormDialogProps {
  open: boolean;
  /** Called when the dialog is dismissed (Cancel, Escape, the Close button, or clicking outside). */
  onClose: () => void;
  title: string;
  description: string;
  submitLabel: string;
  submitDisabled?: boolean;
  /** Called when the form is submitted (Enter in a field, or the submit button). */
  onSubmit: () => void;
  children: React.ReactNode;
}

/**
 * The shell every task form lives in: a modal dialog (full screen on phones,
 * centered from md up) wrapping a real <form> with Cancel and a submit button
 * pinned to the bottom. Used by "Start New Task" and the planned-task form.
 */
export const TaskFormDialog: React.FC<TaskFormDialogProps> = ({
  open,
  onClose,
  title,
  description,
  submitLabel,
  submitDisabled = false,
  onSubmit,
  children,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="md:max-h-[90dvh] md:max-w-xl md:overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {/* noValidate: the fields validate themselves and explain errors inline,
            instead of the browser's own pop-up bubbles. On phones the form fills the
            screen so the footer sits at the bottom: an error message appearing on
            blur must not move the submit button out from under a tap. */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-1 flex-col gap-3 md:block md:flex-none md:space-y-3"
        >
          {children}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              // keep the title field from validating (blur) when Cancel is pressed
              onMouseDown={(e) => e.preventDefault()}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitDisabled}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
