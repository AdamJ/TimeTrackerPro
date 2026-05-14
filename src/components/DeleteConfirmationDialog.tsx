import React from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

const isIosBuild = import.meta.env.VITE_IOS_BUILD === "true";

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

	if (isIosBuild) {
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
						{/* Destructive action first on iOS (action-sheet convention) */}
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
	}

	return (
		<AlertDialog open={isOpen} onOpenChange={onClose}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete Task</AlertDialogTitle>
					<AlertDialogDescription>
						Are you sure you want to delete &ldquo;{taskTitle}&rdquo;? This action cannot be
						undone.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={onConfirm}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						Delete
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};
