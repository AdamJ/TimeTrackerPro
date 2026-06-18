import React from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteConfirmationDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
	taskTitle: string;
}

export const DeleteConfirmationDialog: React.FC<
	DeleteConfirmationDialogProps
> = ({ isOpen, onClose, onConfirm, taskTitle }) => {
	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete Task</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete &ldquo;{taskTitle}&rdquo;? This action cannot be
						undone.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Cancel
					</Button>
					<Button
						onClick={() => {
							onConfirm();
							onClose();
						}}
						className="bg-destructive text-destructive-foreground hover:opacity-90"
					>
						Delete
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
