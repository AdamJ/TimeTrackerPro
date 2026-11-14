import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

interface SignOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignOut: (keepLocalCopy: boolean) => void;
}

export const SignOutDialog: React.FC<SignOutDialogProps> = ({ open, onOpenChange, onSignOut }) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Sign out of Timetraked?</AlertDialogTitle>
        <AlertDialogDescription>
          Your data stays saved in your account. Choose whether this device keeps a copy you can
          use without signing in. On a shared device, remove it.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction variant="outline" onClick={() => onSignOut(false)}>
          Remove from this device
        </AlertDialogAction>
        <AlertDialogAction onClick={() => onSignOut(true)}>
          Keep a copy
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
