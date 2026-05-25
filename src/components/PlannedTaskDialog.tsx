import React, { useState, useEffect } from "react";
import {
	AdaptiveDialog,
	AdaptiveDialogContent,
	AdaptiveDialogFooter,
	AdaptiveDialogHeader,
	AdaptiveDialogTitle,
} from "@/components/ui/adaptive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarkdownDisplay } from "@/components/MarkdownDisplay";
import { Save } from "lucide-react";
import { PlannedTask, PlannedTaskStatus } from "@/contexts/TimeTrackingContext";
import { useTimeTracking } from "@/hooks/useTimeTracking";

interface PlannedTaskDialogProps {
	task?: PlannedTask;
	isOpen: boolean;
	onClose: () => void;
	defaultStatus?: PlannedTaskStatus;
}

const STATUS_LABELS: Record<PlannedTaskStatus, string> = {
	todo: "To Do",
	in_progress: "In Progress",
	done: "Done",
	blocked: "Blocked",
};

export const PlannedTaskDialog: React.FC<PlannedTaskDialogProps> = ({
	task,
	isOpen,
	onClose,
	defaultStatus = "todo",
}) => {
	const { addPlannedTask, updatePlannedTask, projects, categories } = useTimeTracking();

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [status, setStatus] = useState<PlannedTaskStatus>(defaultStatus);
	const [project, setProject] = useState("none");
	const [category, setCategory] = useState("none");
	const [descTab, setDescTab] = useState<"edit" | "preview">("edit");
	const [hasChanges, setHasChanges] = useState(false);

	const isEditMode = !!task;

	useEffect(() => {
		if (isOpen) {
			if (task) {
				setTitle(task.title);
				setDescription(task.description ?? "");
				setStatus(task.status);
				setProject(projects.find((p) => p.name === task.project)?.id ?? "none");
				setCategory(task.category ?? "none");
			} else {
				setTitle("");
				setDescription("");
				setStatus(defaultStatus);
				setProject("none");
				setCategory("none");
			}
			setDescTab("edit");
			setHasChanges(false);
		}
	}, [isOpen, task, projects, defaultStatus]);

	useEffect(() => {
		if (!isOpen || !task) return;
		const originalProject = projects.find((p) => p.name === task.project)?.id ?? "none";
		const changed =
			title !== task.title ||
			description !== (task.description ?? "") ||
			status !== task.status ||
			project !== originalProject ||
			category !== (task.category ?? "none");
		setHasChanges(changed);
	}, [title, description, status, project, category, task, projects, isOpen]);

	const handleSave = () => {
		if (!title.trim()) return;

		const selectedProject = projects.find((p) => p.id === project);
		const data = {
			title: title.trim(),
			description: description.trim() || undefined,
			project: selectedProject?.name,
			client: selectedProject?.client,
			category: category === "none" ? undefined : category,
			priority: task?.priority ?? 0,
			linkedTaskId: task?.linkedTaskId,
		};

		if (isEditMode && task) {
			updatePlannedTask(task.id, { ...data, status });
		} else {
			addPlannedTask(data);
		}
		onClose();
	};

	const canSave = title.trim().length > 0 && (!isEditMode || hasChanges);

	return (
		<AdaptiveDialog open={isOpen} onOpenChange={onClose} snapPoints={[0.85, 1]}>
			<AdaptiveDialogContent className="max-w-lg">
				<AdaptiveDialogHeader>
					<AdaptiveDialogTitle>
						{isEditMode ? "Edit Planned Task" : "New Planned Task"}
					</AdaptiveDialogTitle>
				</AdaptiveDialogHeader>

				<div className="space-y-4 py-2">
					<div>
						<Label htmlFor="planned-title">Title *</Label>
						<Input
							id="planned-title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="What needs to be done?"
							onKeyDown={(e) => e.key === "Enter" && canSave && handleSave()}
						/>
					</div>

					<div>
						<Label>Description</Label>
						<Tabs value={descTab} onValueChange={(v) => setDescTab(v as "edit" | "preview")}>
							<TabsList className="mb-2">
								<TabsTrigger value="edit">Edit</TabsTrigger>
								<TabsTrigger value="preview" disabled={!description.trim()}>
									Preview
								</TabsTrigger>
							</TabsList>
							<TabsContent value="edit">
								<Textarea
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									placeholder="Optional details, links, checklist items..."
									rows={4}
								/>
							</TabsContent>
							<TabsContent value="preview">
								<div className="min-h-[96px] rounded-md border border-input bg-background px-3 py-2">
									<MarkdownDisplay content={description} />
								</div>
							</TabsContent>
						</Tabs>
					</div>

					{isEditMode && (
						<div>
							<Label htmlFor="planned-status">Status</Label>
							<Select value={status} onValueChange={(v) => setStatus(v as PlannedTaskStatus)}>
								<SelectTrigger id="planned-status">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{(Object.keys(STATUS_LABELS) as PlannedTaskStatus[]).map((s) => (
										<SelectItem key={s} value={s}>
											{STATUS_LABELS[s]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

					<div>
						<Label htmlFor="planned-category">Category</Label>
						<Select value={category} onValueChange={setCategory}>
							<SelectTrigger id="planned-category">
								<SelectValue placeholder="No category" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">No category</SelectItem>
								{categories.map((c) => (
									<SelectItem key={c.id} value={c.id}>
										{c.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div>
						<Label htmlFor="planned-project">Project</Label>
						<Select value={project} onValueChange={setProject}>
							<SelectTrigger id="planned-project">
								<SelectValue placeholder="No project" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">No project</SelectItem>
								{projects.map((p) => (
									<SelectItem key={p.id} value={p.id}>
										{p.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				<AdaptiveDialogFooter>
					<Button variant="outline" onClick={onClose}>
						Cancel
					</Button>
					<Button onClick={handleSave} disabled={!canSave}>
						<Save className="w-4 h-4 mr-1" />
						{isEditMode ? "Save Changes" : "Add Task"}
					</Button>
				</AdaptiveDialogFooter>
			</AdaptiveDialogContent>
		</AdaptiveDialog>
	);
};
