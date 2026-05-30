import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Trash2, Briefcase, RotateCcw } from "lucide-react";
import { Project } from "@/contexts/TimeTrackingContext";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { toast } from "@/hooks/use-toast";

interface ProjectManagementProps {
	isOpen: boolean;
	onClose: () => void;
}

export const ProjectManagement: React.FC<ProjectManagementProps> = ({
	isOpen,
	onClose,
}) => {
	const {
		projects,
		clients,
		addClient,
		persistClients,
		addProject,
		updateProject,
		deleteProject,
		resetProjectsToDefaults,
	} = useTimeTracking();
	const [editingProject, setEditingProject] = useState<Project | null>(null);
	const [isAddingNew, setIsAddingNew] = useState(false);
	const [formData, setFormData] = useState({
		name: "",
		client: "",
		hourlyRate: "",
		color: "#3B82F6",
	});
	const [isAddingClient, setIsAddingClient] = useState(false);
	const [newClientName, setNewClientName] = useState("");
	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
	const [showResetDialog, setShowResetDialog] = useState(false);

	const activeClients = clients.filter((c) => !c.archived);

	const handleAddClientInline = async () => {
		const trimmed = newClientName.trim();
		if (!trimmed) return;
		addClient(trimmed);
		await persistClients();
		setFormData((prev) => ({ ...prev, client: trimmed }));
		setNewClientName("");
		setIsAddingClient(false);
	};

	const resetForm = () => {
		setFormData({
			name: "",
			client: "",
			hourlyRate: "",
			color: "#3B82F6",
		});
		setEditingProject(null);
		setIsAddingNew(false);
		setIsAddingClient(false);
		setNewClientName("");
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		const projectData = {
			name: formData.name.trim(),
			client: formData.client.trim(),
			hourlyRate: formData.hourlyRate
				? parseFloat(formData.hourlyRate)
				: undefined,
			color: formData.color,
		};

		if (editingProject) {
			updateProject(editingProject.id, projectData);
			toast({
				title: "Project updated",
				description: `"${projectData.name}" has been updated.`
			});
		} else {
			addProject(projectData);
			toast({
				title: "Project added",
				description: `"${projectData.name}" has been added.`
			});
		}

		resetForm();
	};

	const handleEdit = (project: Project) => {
		setEditingProject(project);
		setFormData({
			name: project.name,
			client: project.client,
			hourlyRate: project.hourlyRate?.toString() || "",
			color: project.color || "#3B82F6",
		});
		setIsAddingNew(true);
	};

	const handleDeleteConfirm = () => {
		if (!deleteTargetId) return;
		const deletedName = projects.find((p) => p.id === deleteTargetId)?.name;
		deleteProject(deleteTargetId);
		toast({
			title: "Project deleted",
			description: deletedName ? `"${deletedName}" has been removed.` : undefined
		});
		setDeleteTargetId(null);
	};

	const handleResetConfirm = () => {
		resetProjectsToDefaults();
		toast({ title: "Projects reset", description: "Projects have been restored to defaults." });
		setShowResetDialog(false);
	};

	return (
		<>
			<Dialog open={isOpen} onOpenChange={onClose}>
				<DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
					<DialogHeader>
						<div className="flex items-center justify-between">
							<DialogTitle className="flex items-center space-x-2">
								<Briefcase className="w-5 h-5" />
								<span>Project Management</span>
							</DialogTitle>
							<div className="flex items-center space-x-2 my-4">
								{!isAddingNew && (
									<>
										<Button
											onClick={() => setShowResetDialog(true)}
											variant="outline"
											className="w-full"
										>
											<RotateCcw className="w-4 h-4 mr-2" />
											Reset to Defaults
										</Button>
										<Button
											onClick={() => setIsAddingNew(true)}
											className="w-full"
										>
											<Plus className="w-4 h-4 mr-2" />
											Add Project
										</Button>
									</>
								)}
							</div>
						</div>
					</DialogHeader>

					<div className="space-y-6">
						{/* Add/Edit Project Form */}
						{isAddingNew && (
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
													Project Name <span className="text-destructive" aria-hidden="true">*</span>
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
													aria-required="true"
													required
												/>
											</div>
											<div>
												<Label htmlFor="client">
													Client Name <span className="text-destructive" aria-hidden="true">*</span>
												</Label>
												{isAddingClient ? (
													<div className="flex items-center space-x-2">
														<Input
															id="client"
															autoFocus
															value={newClientName}
															onChange={(e) => setNewClientName(e.target.value)}
															placeholder="New client name"
														/>
														<Button
															type="button"
															size="sm"
															onClick={handleAddClientInline}
														>
															Add
														</Button>
														<Button
															type="button"
															size="sm"
															variant="ghost"
															onClick={() => {
																setIsAddingClient(false);
																setNewClientName("");
															}}
														>
															Cancel
														</Button>
													</div>
												) : (
													<Select
														value={formData.client}
														onValueChange={(value) => {
															if (value === "__add_new__") {
																setIsAddingClient(true);
																return;
															}
															setFormData((prev) => ({ ...prev, client: value }));
														}}
													>
														<SelectTrigger id="client">
															<SelectValue placeholder="Select a client" />
														</SelectTrigger>
														<SelectContent>
															{activeClients.map((client) => (
																<SelectItem key={client.id} value={client.name}>
																	{client.name}
																</SelectItem>
															))}
															{/* Legacy/unmanaged client values stay visible but flagged */}
															{formData.client &&
																!clients.some(
																	(client) => client.name === formData.client
																) && (
																	<SelectItem value={formData.client} disabled>
																		{formData.client} (unmanaged)
																	</SelectItem>
																)}
															<SelectItem value="__add_new__">
																+ Add new client
															</SelectItem>
														</SelectContent>
													</Select>
												)}
											</div>
										</div>

										<div className="grid grid-cols-2 gap-4">
											<div>
												<Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
												<Input
													id="hourlyRate"
													type="number"
													step="0.01"
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

										<div className="flex space-x-2">
											<Button type="submit">
												{editingProject ? "Update Project" : "Add Project"}
											</Button>
											<Button type="button" variant="outline" onClick={resetForm}>
												Cancel
											</Button>
										</div>
									</form>
								</CardContent>
							</Card>
						)}

						{/* Projects List */}
						<div className="space-y-4">
							<h3 className="text-lg font-semibold">
								Projects ({projects.length})
							</h3>

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
																		<span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
																			Default
																		</span>
																	)}
																</div>
																<p className="text-sm text-muted-foreground">
																	{project.client}
																</p>
																{project.hourlyRate && (
																	<p className="text-sm text-green-600 font-medium">
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
															aria-label="Edit project"
															onClick={() => handleEdit(project)}
														>
															<Edit className="w-3 h-3" />
														</Button>
														<Button
															size="sm"
															variant="destructive"
															aria-label="Delete project"
															onClick={() => setDeleteTargetId(project.id)}
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
		</>
	);
};
