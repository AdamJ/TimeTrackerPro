import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { TimeTrackingProvider } from "@/contexts/TimeTrackingContext";
import { TaskCategory } from "@/config/categories";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { PageLayout } from "@/components/PageLayout";

const CategoryContent: React.FC = () => {
	const { categories, addCategory, updateCategory, deleteCategory, forceSyncToDatabase } =
		useTimeTracking();
	const [editingCategory, setEditingCategory] = useState<TaskCategory | null>(
		null
	);
	const [isAddingNew, setIsAddingNew] = useState(false);
	const [formData, setFormData] = useState({
		name: "",
		description: "",
		color: "#3B82F6",
		isBillable: true,
	});
	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

	const resetForm = () => {
		setFormData({
			name: "",
			description: "",
			color: "#3B82F6",
			isBillable: true,
		});
		setEditingCategory(null);
		setIsAddingNew(false);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		const categoryData = {
			name: formData.name.trim(),
			description: formData.description.trim() || undefined,
			color: formData.color,
			isBillable: formData.isBillable,
		};

		if (editingCategory) {
			updateCategory(editingCategory.id, categoryData);
		} else {
			addCategory(categoryData);
		}

		// Save changes to database
		await forceSyncToDatabase();

		resetForm();
	};

	const handleEdit = (category: TaskCategory) => {
		setEditingCategory(category);
		setFormData({
			name: category.name,
			description: category.description || "",
			color: category.color,
			isBillable: category.isBillable !== false, // Default to true if not specified
		});
		setIsAddingNew(true);
	};

	const handleDeleteConfirm = async () => {
		if (!deleteTargetId) return;
		deleteCategory(deleteTargetId);
		await forceSyncToDatabase();
		setDeleteTargetId(null);
	};

	const predefinedColors = [
		"#3B82F6",
		"#8B5CF6",
		"#10B981",
		"#F59E0B",
		"#EF4444",
		"#06B6D4",
		"#84CC16",
		"#F97316",
		"#6B7280",
		"#EC4899",
	];

	return (
		<PageLayout
			title={<>Categories <span>({categories.length})</span></>}
			icon={<TagIcon className="w-6 h-6" />}
			actions={
				<Button
					onClick={() => setIsAddingNew(true)}
					variant="default"
					disabled={isAddingNew}
				>
					<Plus className="w-4 h-4 sm:mr-2" />
					<span className="hidden sm:block">Add Category</span>
				</Button>
			}
		>
			{/* Add/Edit Project Form */}
			{isAddingNew && (
				<div className="max-w-6xl mx-auto p-6 print:p-4">
					<Card>
						<CardHeader>
							<CardTitle>
								{editingCategory ? "Edit Category" : "Add Category"}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<form onSubmit={handleSubmit} className="space-y-4">
								<div>
									<Label htmlFor="name">
										Category Name <span className="text-destructive">*</span>
									</Label>
									<Input
										id="name"
										value={formData.name}
										onChange={(e) =>
											setFormData((prev) => ({ ...prev, name: e.target.value }))
										}
										placeholder="Enter category name"
										required
									/>
								</div>

								<div>
									<Label htmlFor="description">Description</Label>
									<Textarea
										id="description"
										value={formData.description}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												description: e.target.value,
											}))
										}
										placeholder="Enter category description"
										className="min-h-[80px] resize-none"
									/>
								</div>

								<div>
									<Label htmlFor="color">Category Color</Label>
									<div className="space-y-3">
										<div className="flex items-center space-x-2">
											<Input
												id="color"
												type="color"
												value={formData.color}
												onChange={(e) =>
													setFormData((prev) => ({
														...prev,
														color: e.target.value,
													}))
												}
												className="w-8 h-8 rounded-full"
												style={{ backgroundColor: formData.color }}
											/>
										</div>

										{/* Predefined Colors */}
										<div className="flex flex-wrap gap-2">
											<span className="text-sm text-muted-foreground w-full">
												Quick colors:
											</span>
											{predefinedColors.map((color) => (
												<button
													key={color}
													type="button"
													onClick={() =>
														setFormData((prev) => ({ ...prev, color }))
													}
													className={`w-6 h-6 rounded-full border-2 hover:scale-110 transition-transform ${formData.color === color
														? "border-border"
														: "border-border"
														}`}
													style={{ backgroundColor: color }}
												/>
											))}
										</div>
									</div>
								</div>

								<div className="flex items-center space-x-2">
									<Checkbox
										id="billable"
										checked={formData.isBillable}
										onCheckedChange={(checked) =>
											setFormData((prev) => ({
												...prev,
												isBillable: checked === true,
											}))
										}
									/>
									<Label htmlFor="billable" className="text-sm font-medium">
										Billable category
									</Label>
									<span className="text-xs text-muted-foreground">
										(Tasks in this category can generate revenue)
									</span>
								</div>

								<div className="flex space-x-2">
									<Button type="button" variant="ghost" onClick={resetForm}>
										Cancel
									</Button>
									<Button type="submit">
										{editingCategory ? "Update" : "Add"}
									</Button>
								</div>
							</form>
						</CardContent>
					</Card>
				</div>
			)}
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
		</PageLayout>
	);
};

const Categories: React.FC = () => {
	return (
		<CategoryContent />
	);
};

export default Categories;
