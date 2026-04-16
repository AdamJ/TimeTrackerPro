import React, { useState } from "react";
import { TimeTrackingProvider, Project } from "@/contexts/TimeTrackingContext";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Edit, Briefcase, Trash2, RotateCcw, Plus } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { Badge } from "@radix-ui/themes";

const ProjectContent: React.FC = () => {
	const {
		projects,
		addProject,
		updateProject,
		deleteProject,
		resetProjectsToDefaults,
		forceSyncToDatabase,
	} = useTimeTracking();
	const [editingProject, setEditingProject] = useState<Project | null>(null);
	const [isAddingNew, setIsAddingNew] = useState(false);
	const [formData, setFormData] = useState({
		name: "",
		client: "",
		hourlyRate: "",
		color: "#3B82F6",
		isBillable: true,
	});
	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
	const [showResetDialog, setShowResetDialog] = useState(false);

	const resetForm = () => {
		setFormData({
			name: "",
			client: "",
			hourlyRate: "",
			color: "#3B82F6",
			isBillable: true,
		});
		setEditingProject(null);
		setIsAddingNew(false);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		const projectData = {
			name: formData.name.trim(),
			client: formData.client.trim(),
			hourlyRate: formData.hourlyRate
				? parseFloat(formData.hourlyRate)
				: undefined,
			color: formData.color,
			isBillable: formData.isBillable,
		};

		if (editingProject) {
			updateProject(editingProject.id, projectData);
		} else {
			addProject(projectData);
		}

		// Save changes to database
		await forceSyncToDatabase();

		resetForm();
	};

	const handleEdit = (project: Project) => {
		setEditingProject(project);
		setFormData({
			name: project.name,
			client: project.client,
			hourlyRate: project.hourlyRate?.toString() || "",
			color: project.color || "#3B82F6",
			isBillable: project.isBillable !== false, // Default to true if not specified
		});
		setIsAddingNew(true);
	};

	const handleDeleteConfirm = async () => {
		if (!deleteTargetId) return;
		deleteProject(deleteTargetId);
		await forceSyncToDatabase();
		setDeleteTargetId(null);
	};

	const handleResetConfirm = () => {
		resetProjectsToDefaults();
		setShowResetDialog(false);
	};

	return (
		<PageLayout
			title={<>Project List <span>({projects.length})</span></>}
			icon={<Briefcase className="w-6 h-6" />}
			actions={
				!isAddingNew ? (
					<div className="flex space-x-2">
						<Button
							onClick={() => setShowResetDialog(true)}
							variant="outline"
						>
							<RotateCcw className="w-4 h-4 sm:mr-2" />
							Reset to Defaults
						</Button>
						<Button onClick={() => setIsAddingNew(true)}>
							<Plus className="w-4 h-4 sm:mr-2" />
							Add Project
						</Button>
					</div>
				) : undefined
			}
		>
			{/* Add/Edit Project Form */}
			{isAddingNew && (
				<div className="max-w-6xl mx-auto p-6 print:p-4">
					<Card>
						<CardHeader>
							<CardTitle>
								{editingProject ? "Edit Project" : "Add New Project"}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<form onSubmit={handleSubmit} className="space-y-4">
								<div className="grid grid-cols-2 gap-4">
									<div>
										<Label htmlFor="name">
											Project Name <span className="text-destructive">*</span>
										</Label>
										<Input
											id="name"
											value={formData.name}
											onChange={(e) =>
												setFormData((prev) => ({
													...prev,
													name: e.target.value,
												}))
											}
											placeholder="Enter project name"
											required
										/>
									</div>
									<div>
										<Label htmlFor="client">
											Client Name <span className="text-destructive">*</span>
										</Label>
										<Input
											id="client"
											value={formData.client}
											onChange={(e) =>
												setFormData((prev) => ({
													...prev,
													client: e.target.value,
												}))
											}
											placeholder="Enter client name"
											required
										/>
									</div>
								</div>
								<div className="grid grid-cols-2 gap-4">
									<div>
										<Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
										<Input
											id="hourlyRate"
											type="number"
											step="01.00"
											value={formData.hourlyRate}
											onChange={(e) =>
												setFormData((prev) => ({
													...prev,
													hourlyRate: e.target.value,
												}))
											}
											placeholder="0.00"
										/>
									</div>
									<div>
										<Label htmlFor="color">Project Color</Label>
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
												className="w-16 h-10"
											/>
											<span className="text-sm text-muted-foreground">
												{formData.color}
											</span>
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
										Billable project
									</Label>
									<span className="text-xs text-muted-foreground">
										(Tasks in this project can generate revenue)
									</span>
								</div>

								<div className="flex space-x-2">
									<Button type="button" variant="ghost" onClick={resetForm}>
										Cancel
									</Button>
									<Button type="submit" variant="default">
										{editingProject ? "Update Project" : "Add Project"}
									</Button>
								</div>
							</form>
						</CardContent>
					</Card>
				</div>
			)}
			<div className="max-w-6xl mx-auto p-6 print:p-4">
				{/* Projects List */}
				<div className="space-y-6">
					{projects.length === 0 ? (
						<Card>
							<CardContent className="text-center py-8">
								<Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
								<p className="text-muted-foreground">
									No projects yet. Add your first project to get started!
								</p>
							</CardContent>
						</Card>
					) : (
						<div className="grid gap-4">
							{projects.map((project) => (
								<Card
									key={project.id}
									className="border-l-4"
									style={{ borderLeftColor: project.color }}
								>
									<CardContent className="p-4">
										<div className="flex items-center justify-between">
											<div className="flex-1">
												<div className="flex items-center space-x-3">
													<div
														className="w-4 h-4 rounded-full"
														style={{ backgroundColor: project.color }}
													/>
													<div>
														<div className="flex items-center space-x-2">
															<h4 className="font-semibold text-foreground">
																{project.name}
															</h4>
															{project.id.startsWith("default-") && (
																<Badge variant="surface" color="blue">
																	Default
																</Badge>
															)}
															{project.isBillable !== false ? (
																<Badge variant="surface" color="green">
																	Billable
																</Badge>
															) : (
																<Badge variant="surface" color="gray">
																	Non-billable
																</Badge>
															)}
														</div>
														<p className="text-sm text-muted-foreground">
															{project.client}
														</p>
														{project.hourlyRate && (
															<p className="text-sm text-chart-2 font-medium">
																${project.hourlyRate}/hour
															</p>
														)}
													</div>
												</div>
											</div>
											<div className="flex space-x-2">
												<Button
													size="sm"
													variant="outline"
													onClick={() => handleEdit(project)}
												>
													<Edit className="w-3 h-3" />
												</Button>
												<Button
													size="sm"
													variant="outline"
													onClick={() => setDeleteTargetId(project.id)}
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
						<AlertDialogTitle>Delete this project?</AlertDialogTitle>
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

			<AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Reset projects to defaults?</AlertDialogTitle>
						<AlertDialogDescription>
							This will remove any custom projects you've added. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleResetConfirm}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Reset
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</PageLayout>
	);
};

const ProjectList: React.FC = () => {
	return (
		<ProjectContent />
	);
};

export default ProjectList;
