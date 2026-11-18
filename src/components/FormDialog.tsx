import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FormDialogProps {
  open: boolean;
  /** Called when the dialog is dismissed (Cancel, Escape, the Close button, or clicking outside). */
  onClose: () => void;
  title: string;
  description: string;
  submitLabel: string;
  submitDisabled?: boolean;
  /** While true both buttons are disabled and the submit button shows a spinner and `submittingLabel`. */
  isSubmitting?: boolean;
  submittingLabel?: string;
  /** Called when the form is submitted (Enter in a field, or the submit button). */
  onSubmit: () => void | Promise<void>;
  children: React.ReactNode;
}

/**
 * The shell every form dialog lives in (task forms and the project, client, and category forms): a modal dialog (full screen on phones,
 * centered from md up) wrapping a real <form> with Cancel and a submit button
 * pinned to the bottom. Used by every create/edit form.
 */
export const FormDialog: React.FC<FormDialogProps> = ({
  open,
  onClose,
  title,
  description,
  submitLabel,
  submitDisabled = false,
  isSubmitting = false,
  submittingLabel = "Saving...",
  onSubmit,
  children,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void onSubmit();
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
              // same reason as the submit button: don't blur (and validate) the field on press
              onMouseDown={(e) => e.preventDefault()}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitDisabled || isSubmitting}
              // Pressing the button must not blur the focused field: blur validation would
              // show an error and shift the layout before the click lands (the press and
              // release of a real click are 50-150ms apart), losing the first tap or click.
              // Submitting validates anyway and focuses the first invalid field.
              onMouseDown={(e) => e.preventDefault()}
            >
              {isSubmitting && <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? submittingLabel : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
