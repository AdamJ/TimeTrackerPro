import React from "react";
import {
	AdaptiveDialog,
	AdaptiveDialogContent,
	AdaptiveDialogHeader,
	AdaptiveDialogTitle,
	AdaptiveDialogDescription,
	AdaptiveDialogFooter,
} from "@/components/ui/adaptive-dialog";
import { Button } from "@/components/ui/button";
import { useHaptics } from "@/hooks/useHaptics";

interface DeleteConfirmationDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
	taskTitle: string;
}

export const DeleteConfirmationDialog: React.FC<
	DeleteConfirmationDialogProps
> = ({ isOpen, onClose, onConfirm, taskTitle }) => {
	const { heavyImpact } = useHaptics();

	return (
		<AdaptiveDialog open={isOpen} onOpenChange={onClose} snapPoints={[0.3]}>
			<AdaptiveDialogContent>
				<AdaptiveDialogHeader>
					<AdaptiveDialogTitle>Delete Task</AdaptiveDialogTitle>
					<AdaptiveDialogDescription>
						Are you sure you want to delete &ldquo;{taskTitle}&rdquo;? This action cannot be
						undone.
					</AdaptiveDialogDescription>
				</AdaptiveDialogHeader>
				<AdaptiveDialogFooter>
					<Button
						onClick={() => {
							heavyImpact();
							onConfirm();
							onClose();
						}}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						Delete
					</Button>
					<Button variant="outline" onClick={onClose}>
						Cancel
					</Button>
				</AdaptiveDialogFooter>
			</AdaptiveDialogContent>
		</AdaptiveDialog>
	);
};
