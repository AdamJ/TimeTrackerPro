import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, Edit, Trash2, Tag, TagIcon } from "lucide-react";
import { TaskCategory } from "@/config/categories";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { PageLayout } from "@/components/PageLayout";
import { CategorySheet } from "@/components/CategorySheet";

const CategoryContent: React.FC = () => {
	const { categories, deleteCategory, forceSyncToDatabase } =
		useTimeTracking();
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
		deleteCategory(deleteTargetId);
		await forceSyncToDatabase();
		setDeleteTargetId(null);
	};

	return (
		<PageLayout
			title={<>Categories <span>({categories.length})</span></>}
			icon={<TagIcon className="w-6 h-6" />}
			actions={
				<Button onClick={handleOpenAdd} variant="default">
					<Plus className="w-4 h-4 sm:mr-2" />
					<span className="hidden sm:block">Add Category</span>
				</Button>
			}
		>
			<div className="max-w-6xl mx-auto p-6 print:p-4">
				{/* Categories List */}
				<div className="space-y-4">
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
															<span className={`px-2 py-1 text-xs rounded-full ${category.isBillable !== false
																? "bg-chart-2/20 text-chart-2"
																: "bg-muted text-foreground"
																}`}>
																{category.isBillable !== false ? "Billable" : "Non-billable"}
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
													className="text-destructive hover:text-destructive/80"
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
			<AlertDialog open={deleteTargetId !== null} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete this category?</AlertDialogTitle>
						<AlertDialogDescription>
							This action cannot be undone.
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
		</PageLayout>
	);
};

const Categories: React.FC = () => {
	return (
		<CategoryContent />
	);
};

export default Categories;
