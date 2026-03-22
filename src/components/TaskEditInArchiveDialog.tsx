import React, { useState, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarkdownDisplay } from "@/components/MarkdownDisplay";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from "@/components/ui/select";
import { TimePicker } from "@/components/ui/scroll-time-picker";
import { Task } from "@/contexts/TimeTrackingContext";
import { useTimeTracking } from "@/hooks/useTimeTracking";

interface TaskEditInArchiveDialogProps {
	task: Task;
	isOpen: boolean;
	onClose: () => void;
	onSave: (task: Task) => void;
}

function roundToNearest15Minutes(date: Date): Date {
	const rounded = new Date(date);
	const minutes = rounded.getMinutes();
	const roundedMinutes = Math.round(minutes / 15) * 15;
	rounded.setMinutes(roundedMinutes);
	rounded.setSeconds(0);
	rounded.setMilliseconds(0);
	return rounded;
}

function formatTimeForInput(date: Date): string {
	const rounded = roundToNearest15Minutes(date);
	const hours = rounded.getHours().toString().padStart(2, "0");
	const minutes = rounded.getMinutes().toString().padStart(2, "0");
	return `${hours}:${minutes}`;
}

function parseTimeInput(timeStr: string, baseDate: Date): Date {
	if (!timeStr || !timeStr.includes(":")) return baseDate;

	const [hoursStr, minutesStr] = timeStr.split(":");
	const hours = parseInt(hoursStr, 10);
	const minutes = parseInt(minutesStr, 10);

	if (isNaN(hours) || isNaN(minutes)) return baseDate;

	const newDate = new Date(baseDate);
	newDate.setHours(hours, minutes, 0, 0);
	return newDate;
}

export const TaskEditInArchiveDialog: React.FC<TaskEditInArchiveDialogProps> = ({
	task,
	isOpen,
	onClose,
	onSave
}) => {
	const { projects, categories } = useTimeTracking();
	const [formData, setFormData] = useState({
		title: "",
		description: "",
		project: "none",
		category: "none"
	});

	const [timeData, setTimeData] = useState({
		startTime: "",
		endTime: ""
	});

	useEffect(() => {
		if (isOpen && task) {
			const projectId = projects.find(p => p.name === task.project)?.id || "none";

			setFormData({
				title: task.title || "",
				description: task.description || "",
				project: projectId,
				category: task.category || "none"
			});

			setTimeData({
				startTime: formatTimeForInput(task.startTime),
				endTime: task.endTime ? formatTimeForInput(task.endTime) : ""
			});
		}
	}, [task, projects, isOpen]);

	const handleSave = () => {
		const selectedProject =
			formData.project !== "none"
				? projects.find(p => p.id === formData.project)
				: undefined;
		const selectedCategory =
			formData.category !== "none"
				? categories.find(c => c.id === formData.category)
				: undefined;

		const newStartTime = parseTimeInput(timeData.startTime, task.startTime);
		const newEndTime = timeData.endTime
			? parseTimeInput(timeData.endTime, task.startTime)
			: undefined;

		const updatedTask: Task = {
			...task,
			title: formData.title.trim(),
			description: formData.description.trim() || undefined,
			project: selectedProject?.name || undefined,
			client: selectedProject?.client || undefined,
			category: selectedCategory?.id || undefined,
			startTime: newStartTime,
			endTime: newEndTime,
			duration: newEndTime
				? newEndTime.getTime() - newStartTime.getTime()
				: task.duration
		};

		onSave(updatedTask);
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Edit Task</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<div>
						<Label>
							Task Title <span className="text-destructive">*</span>
						</Label>
						<Input
							value={formData.title}
							onChange={e =>
								setFormData(prev => ({ ...prev, title: e.target.value }))
							}
							placeholder="Enter task title"
						/>
					</div>

					<div>
						<Label htmlFor="task-description">Description</Label>
						<Tabs defaultValue="edit" className="w-full">
							<TabsList className="grid w-full grid-cols-2">
								<TabsTrigger value="edit">Edit</TabsTrigger>
								<TabsTrigger value="preview">Preview</TabsTrigger>
							</TabsList>
							<TabsContent value="edit">
								<Textarea
									id="task-description"
									value={formData.description}
									onChange={e =>
										setFormData(prev => ({
											...prev,
											description: e.target.value
										}))
									}
									placeholder="Enter task description (optional, supports Markdown)"
									className="min-h-[80px] resize-none"
								/>
							</TabsContent>
							<TabsContent value="preview">
								<div className="w-full min-h-[80px] p-3 border rounded-md bg-background">
									{formData.description ? (
										<MarkdownDisplay content={formData.description} />
									) : (
										<p className="text-sm text-muted-foreground">
											No description to preview
										</p>
									)}
								</div>
							</TabsContent>
						</Tabs>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label>Category</Label>
							<Select
								value={formData.category}
								onValueChange={value =>
									setFormData(prev => ({ ...prev, category: value }))
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select category" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">No category</SelectItem>
									{categories.map(category => (
										<SelectItem key={category.id} value={category.id}>
											<div className="flex items-center space-x-2">
												<div
													className="w-3 h-3 rounded-full"
													style={{ backgroundColor: category.color }}
												/>
												<span>{category.name}</span>
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div>
							<Label>Project</Label>
							<Select
								value={formData.project}
								onValueChange={value =>
									setFormData(prev => ({ ...prev, project: value }))
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select project" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">No project</SelectItem>
									{projects.map(project => (
										<SelectItem key={project.id} value={project.id}>
											<div className="flex flex-col">
												<span>{project.name}</span>
												<span className="text-sm text-muted-foreground">
													{project.client}
												</span>
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label htmlFor="archive-task-start-time">Start Time</Label>
							<TimePicker
								id="archive-task-start-time"
								value={timeData.startTime}
								onValueChange={value =>
									setTimeData(prev => ({ ...prev, startTime: value }))
								}
								aria-label="Task start time"
							/>
						</div>

						<div>
							<Label htmlFor="archive-task-end-time">End Time</Label>
							<TimePicker
								id="archive-task-end-time"
								value={timeData.endTime}
								onValueChange={value =>
									setTimeData(prev => ({ ...prev, endTime: value }))
								}
								aria-label="Task end time"
							/>
						</div>
					</div>

					<div className="flex justify-end space-x-2">
						<Button variant="outline" onClick={onClose}>
							Cancel
						</Button>
						<Button
							onClick={handleSave}
							disabled={!formData.title.trim()}
							variant="default"
						>
							Save Changes
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};
