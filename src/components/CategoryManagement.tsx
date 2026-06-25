import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle
} from "@/components/ui/dialog";
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
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit, Trash2, Tag } from "lucide-react";
import { TaskCategory } from "@/config/categories";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { useUndoableDelete } from "@/hooks/useUndoableDelete";
import { CategorySheet } from "@/components/CategorySheet";

interface CategoryManagementProps {
	isOpen: boolean;
	onClose: () => void;
}

export const CategoryManagement: React.FC<CategoryManagementProps> = ({
	isOpen,
	onClose
}) => {
	const { categories, deleteCategory, restoreDeletedCategory, forceSyncToDatabase } =
		useTimeTracking();
	const { confirmDelete } = useUndoableDelete<TaskCategory>();
	const [editingCategory, setEditingCategory] = useState<TaskCategory | null>(
		null
	);
	const [sheetOpen, setSheetOpen] = useState(false);
	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

	const handleOpenAdd = () => {
		setEditingCategory(null);
		setSheetOpen(true);
	};

	const handleEdit = (category: TaskCategory) => {
		setEditingCategory(category);
		setSheetOpen(true);
	};

	const handleDeleteConfirm = async () => {
		if (!deleteTargetId) return;
		const deletedCategory = categories.find((c) => c.id === deleteTargetId);
		deleteCategory(deleteTargetId);
		await forceSyncToDatabase();
		if (deletedCategory) {
			confirmDelete(deletedCategory, (category) => {
				restoreDeletedCategory(category);
				void forceSyncToDatabase();
			}, {
				title: "Category deleted",
				description: `"${deletedCategory.name}" has been removed.`
			});
		}
		setDeleteTargetId(null);
	};

	return (
		<>
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<div className="flex items-center justify-between">
						<DialogTitle className="flex items-center space-x-2">
							<Tag className="w-5 h-5" />
							<span>Category Management</span>
						</DialogTitle>
						<div className="flex items-center space-x-2 my-4">
							<Button onClick={handleOpenAdd} className="w-full">
								<Plus className="w-4 h-4 mr-2" />
								Add Category
							</Button>
						</div>
					</div>
				</DialogHeader>

				<div className="space-y-6">
					{/* Categories List */}
					<div className="space-y-4">
						<h3 className="text-lg font-semibold">
							Categories ({categories.length})
						</h3>

						{categories.length === 0 ? (
							<Card>
								<CardContent className="text-center py-8">
									<Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
									<p className="text-muted-foreground">
										No categories yet. Add your first category to get started!
									</p>
								</CardContent>
							</Card>
						) : (
							<div className="grid gap-4">
								{categories.map((category) => (
									<Card
										key={category.id}
										className="border-l-4"
										style={{ borderLeftColor: category.color }}
									>
										<CardContent className="p-4">
											<div className="flex items-center justify-between">
												<div className="flex-1">
													<div className="flex items-center space-x-3">
														<div
															className="w-4 h-4 rounded-full"
															style={{ backgroundColor: category.color }}
														/>
														<div>
															<div className="flex items-center space-x-2">
																<h4 className="font-semibold text-foreground">
																	{category.name}
																</h4>
																<span className={`px-2 py-1 text-xs rounded-full ${
																	category.isBillable !== false
																		? 'bg-green-100 text-green-800'
																		: 'bg-muted text-muted-foreground'
																}`}>
																	{category.isBillable !== false ? 'Billable' : 'Non-billable'}
																</span>
															</div>
															{category.description && (
																<p className="text-sm text-muted-foreground mt-1">
																	{category.description}
																</p>
															)}
														</div>
													</div>
												</div>

												<div className="flex space-x-2">
													<Button
														size="sm"
														variant="outline"
														onClick={() => handleEdit(category)}
													>
														<Edit className="w-3 h-3" />
													</Button>
													<Button
														size="sm"
														variant="outline"
														onClick={() => setDeleteTargetId(category.id)}
														className="text-red-600 hover:text-red-700"
													>
														<Trash2 className="w-3 h-3" />
													</Button>
												</div>
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
		<AlertDialog open={deleteTargetId !== null} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete this category?</AlertDialogTitle>
					<AlertDialogDescription>
						You'll have a few seconds to undo this from the confirmation toast.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleDeleteConfirm}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						Delete
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>

		<CategorySheet
			open={sheetOpen}
			onOpenChange={(open) => {
				setSheetOpen(open);
				if (!open) setEditingCategory(null);
			}}
			mode={editingCategory ? "edit" : "add"}
			category={editingCategory ?? undefined}
		/>
		</>
	);
};
