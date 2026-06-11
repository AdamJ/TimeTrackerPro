import React, { useState, useEffect } from "react";
import {
	AdaptiveDialog,
	AdaptiveDialogContent,
	AdaptiveDialogHeader,
	AdaptiveDialogTitle,
	AdaptiveDialogDescription,
	AdaptiveDialogFooter,
} from "@/components/ui/adaptive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { TimePicker } from "@/components/ui/scroll-time-picker";
import { MarkdownDisplay } from "@/components/MarkdownDisplay";
import { Badge } from "@/components/ui/badge";
import { DayRecord, Task } from "@/contexts/TimeTrackingContext";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { useHaptics } from "@/hooks/useHaptics";
import { formatDuration } from "@/utils/timeUtil";
import { Calendar, Plus, Trash2, Loader2, Copy } from "lucide-react";

interface BackdatedEntryDialogProps {
	isOpen: boolean;
	onClose: () => void;
}

interface BackdatedTask {
	id: string;
	title: string;
	description: string;
	startTime: string;
	endTime: string;
	category: string;
	project: string;
}

function getYesterday(): string {
	const d = new Date();
	d.setDate(d.getDate() - 1);
	const year = d.getFullYear();
	const month = (d.getMonth() + 1).toString().padStart(2, "0");
	const day = d.getDate().toString().padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function getMaxDate(): string {
	return getYesterday();
}

function buildDate(dateStr: string, timeStr: string): Date {
	const [year, month, day] = dateStr.split("-").map(Number);
	const [hours, minutes] = timeStr.split(":").map(Number);
	return new Date(year, month - 1, day, hours || 0, minutes || 0, 0, 0);
}

function calcDurationMs(start: string, end: string): number {
	if (!start || !end) return 0;
	const [sh, sm] = start.split(":").map(Number);
	const [eh, em] = end.split(":").map(Number);
	const startMs = sh * 60 * 60 * 1000 + sm * 60 * 1000;
	const endMs = eh * 60 * 60 * 1000 + em * 60 * 1000;
	return Math.max(0, endMs - startMs);
}

function makeBlankTask(): BackdatedTask {
	return {
		id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
		title: "",
		description: "",
		startTime: "09:00",
		endTime: "10:00",
		category: "",
		project: "",
	};
}

export const BackdatedEntryDialog: React.FC<BackdatedEntryDialogProps> = ({
	isOpen,
	onClose,
}) => {
	const { projects, categories, addBackdatedDay } = useTimeTracking();
	const { successNotify, errorNotify } = useHaptics();

	const [selectedDate, setSelectedDate] = useState(getYesterday());
	const [dayStartTime, setDayStartTime] = useState("09:00");
	const [dayEndTime, setDayEndTime] = useState("17:00");
	const [notes, setNotes] = useState("");
	const [notesTab, setNotesTab] = useState<"edit" | "preview">("edit");
	const [tasks, setTasks] = useState<BackdatedTask[]>([makeBlankTask()]);
	const [isSaving, setIsSaving] = useState(false);
	const [errors, setErrors] = useState<string[]>([]);

	useEffect(() => {
		if (isOpen) {
			setSelectedDate(getYesterday());
			setDayStartTime("09:00");
			setDayEndTime("17:00");
			setNotes("");
			setNotesTab("edit");
			setTasks([makeBlankTask()]);
			setIsSaving(false);
			setErrors([]);
		}
	}, [isOpen]);

	const totalDuration = tasks.reduce(
		(sum, t) => sum + calcDurationMs(t.startTime, t.endTime),
		0
	);

	const validate = (): string[] => {
		const errs: string[] = [];
		if (!selectedDate) {
			errs.push("Please select a date.");
		} else {
			const chosen = new Date(selectedDate + "T00:00:00");
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			if (chosen >= today) {
				errs.push("Date must be before today.");
			}
		}
		if (tasks.length === 0) {
			errs.push("Add at least one task.");
		}
		tasks.forEach((task, i) => {
			if (!task.title.trim()) {
				errs.push(`Task ${i + 1} needs a title.`);
			}
			if (task.startTime && task.endTime) {
				const dur = calcDurationMs(task.startTime, task.endTime);
				if (dur <= 0) {
					errs.push(`Task ${i + 1} end time must be after start time.`);
				}
			}
		});
		return errs;
	};

	const handleSave = async () => {
		const errs = validate();
		if (errs.length > 0) {
			setErrors(errs);
			errorNotify();
			return;
		}
		setErrors([]);
		setIsSaving(true);

		try {
			const builtTasks: Task[] = tasks.map(t => {
				const projectData = projects.find(p => p.id === t.project);
				const startTime = buildDate(selectedDate, t.startTime);
				const endTime = t.endTime ? buildDate(selectedDate, t.endTime) : undefined;
				const duration = endTime
					? endTime.getTime() - startTime.getTime()
					: undefined;

				return {
					id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
					title: t.title.trim(),
					description: t.description.trim() || undefined,
					startTime,
					endTime,
					duration,
					category: t.category || undefined,
					project: projectData?.name,
					client: projectData?.client,
				};
			});

			const dayStartDate = buildDate(selectedDate, dayStartTime);
			const dayEndDate = buildDate(selectedDate, dayEndTime);

			const dayRecord: DayRecord = {
				id: Date.now().toString(),
				date: dayStartDate.toDateString(),
				tasks: builtTasks,
				totalDuration: builtTasks.reduce((s, t) => s + (t.duration ?? 0), 0),
				startTime: dayStartDate,
				endTime: dayEndDate,
				notes: notes.trim() || undefined,
			};

			await addBackdatedDay(dayRecord);
			successNotify();
			onClose();
		} catch {
			// addBackdatedDay already shows a toast and calls errorNotify
		} finally {
			setIsSaving(false);
		}
	};

	const addTask = () => {
		const last = tasks[tasks.length - 1];
		const newTask = makeBlankTask();
		if (last) {
			newTask.startTime = last.endTime || "09:00";
			const [h, m] = newTask.startTime.split(":").map(Number);
			const endH = h + 1;
			newTask.endTime = `${endH.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
		}
		setTasks(prev => [...prev, newTask]);
	};

	const removeTask = (id: string) => {
		setTasks(prev => prev.filter(t => t.id !== id));
	};

	const duplicateTask = (id: string) => {
		setTasks(prev => {
			const idx = prev.findIndex(t => t.id === id);
			if (idx === -1) return prev;
			const src = prev[idx];
			const copy: BackdatedTask = {
				...src,
				id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
				title: src.title ? `${src.title} (copy)` : "",
			};
			const next = [...prev];
			next.splice(idx + 1, 0, copy);
			return next;
		});
	};

	const updateTask = (id: string, field: keyof BackdatedTask, value: string) => {
		setTasks(prev =>
			prev.map(t => (t.id === id ? { ...t, [field]: value } : t))
		);
	};

	const isValid = errors.length === 0;

	return (
		<AdaptiveDialog open={isOpen} onOpenChange={onClose} snapPoints={[0.85, 1]}>
			<AdaptiveDialogContent className="max-w-[90dvw] max-h-[90dvh] overflow-y-auto">
				<AdaptiveDialogHeader>
					<AdaptiveDialogTitle className="flex items-center space-x-2">
						<Calendar className="w-5 h-5" />
						<span>Add Past Entry</span>
					</AdaptiveDialogTitle>
					<AdaptiveDialogDescription>
						Record time you worked on a previous day.
					</AdaptiveDialogDescription>
				</AdaptiveDialogHeader>

				<div className="space-y-6 py-4">
					{errors.length > 0 && (
						<div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive space-y-1">
							{errors.map((e, i) => (
								<p key={i}>{e}</p>
							))}
						</div>
					)}

					{/* Day Details */}
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-base">Day Details</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<Label htmlFor="backdate-date">Date</Label>
								<Input
									id="backdate-date"
									type="date"
									value={selectedDate}
									max={getMaxDate()}
									onChange={e => setSelectedDate(e.target.value)}
									className="w-full"
								/>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label htmlFor="backdate-start">Day Start</Label>
									<TimePicker
										id="backdate-start"
										value={dayStartTime}
										onValueChange={setDayStartTime}
										aria-label="Day start time"
									/>
								</div>
								<div>
									<Label htmlFor="backdate-end">Day End</Label>
									<TimePicker
										id="backdate-end"
										value={dayEndTime}
										onValueChange={setDayEndTime}
										aria-label="Day end time"
									/>
								</div>
							</div>
							<div>
								<Label htmlFor="backdate-notes">Notes (optional)</Label>
								<Tabs
									value={notesTab}
									onValueChange={v => setNotesTab(v as "edit" | "preview")}
									className="w-full"
								>
									<TabsList className="grid w-full grid-cols-2">
										<TabsTrigger value="edit">Edit</TabsTrigger>
										<TabsTrigger value="preview">Preview</TabsTrigger>
									</TabsList>
									<TabsContent value="edit">
										<Textarea
											id="backdate-notes"
											value={notes}
											onChange={e => setNotes(e.target.value)}
											placeholder="Add notes about this day (optional, supports Markdown)"
											className="min-h-[80px] resize-none"
										/>
									</TabsContent>
									<TabsContent value="preview">
										<div className="w-full min-h-[80px] p-3 border rounded-md bg-background">
											{notes ? (
												<MarkdownDisplay content={notes} />
											) : (
												<p className="text-sm text-muted-foreground">
													No notes to preview
												</p>
											)}
										</div>
									</TabsContent>
								</Tabs>
							</div>
						</CardContent>
					</Card>

					{/* Tasks */}
					<Card>
						<CardHeader className="pb-3">
							<div className="flex items-center justify-between">
								<CardTitle className="text-base">
									Tasks
									{totalDuration > 0 && (
										<Badge variant="secondary" className="ml-2 text-xs font-normal">
											{formatDuration(totalDuration)} total
										</Badge>
									)}
								</CardTitle>
								<Button
									type="button"
									onClick={addTask}
									size="sm"
									variant="outline"
								>
									<Plus className="w-4 h-4 mr-1" />
									Add Task
								</Button>
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							{tasks.map((task, index) => {
								const taskDuration = calcDurationMs(task.startTime, task.endTime);
								return (
									<div
										key={task.id}
										className="relative space-y-3 rounded-md border p-4"
									>
										<div className="flex items-center justify-between">
											<span className="text-sm font-medium text-muted-foreground">
												Task {index + 1}
											</span>
											<div className="flex items-center gap-2">
												{taskDuration > 0 && (
													<Badge variant="outline" className="text-xs">
														{formatDuration(taskDuration)}
													</Badge>
												)}
												<Button
													type="button"
													onClick={() => duplicateTask(task.id)}
													size="sm"
													variant="ghost"
													className="h-7 w-7 p-0"
													aria-label={`Duplicate task ${index + 1}`}
												>
													<Copy className="w-3.5 h-3.5" />
												</Button>
												{tasks.length > 1 && (
													<Button
														type="button"
														onClick={() => removeTask(task.id)}
														size="sm"
														variant="ghost"
														className="h-7 w-7 p-0 text-destructive hover:text-destructive"
														aria-label={`Remove task ${index + 1}`}
													>
														<Trash2 className="w-3.5 h-3.5" />
													</Button>
												)}
											</div>
										</div>

										<div>
											<Label htmlFor={`task-title-${task.id}`}>
												Title <span className="text-destructive">*</span>
											</Label>
											<Input
												id={`task-title-${task.id}`}
												value={task.title}
												onChange={e => updateTask(task.id, "title", e.target.value)}
												placeholder="What did you work on?"
											/>
										</div>

										<div className="grid grid-cols-2 gap-4">
											<div>
												<Label htmlFor={`task-start-${task.id}`}>Start Time</Label>
												<TimePicker
													id={`task-start-${task.id}`}
													value={task.startTime}
													onValueChange={v => updateTask(task.id, "startTime", v)}
													aria-label={`Task ${index + 1} start time`}
												/>
											</div>
											<div>
												<Label htmlFor={`task-end-${task.id}`}>End Time</Label>
												<TimePicker
													id={`task-end-${task.id}`}
													value={task.endTime}
													onValueChange={v => updateTask(task.id, "endTime", v)}
													aria-label={`Task ${index + 1} end time`}
												/>
											</div>
										</div>

										<div className="grid grid-cols-2 gap-4">
											{categories.length > 0 && (
												<div>
													<Label htmlFor={`task-cat-${task.id}`}>Category</Label>
													<Select
														value={task.category}
														onValueChange={v => updateTask(task.id, "category", v)}
													>
														<SelectTrigger
															id={`task-cat-${task.id}`}
															aria-label={`Task ${index + 1} category`}
														>
															<SelectValue placeholder="Category" />
														</SelectTrigger>
														<SelectContent>
															{categories.map(cat => (
																<SelectItem key={cat.id} value={cat.id}>
																	<div className="flex items-center gap-2">
																		<div
																			className="w-3 h-3 rounded-full shrink-0"
																			style={{ backgroundColor: cat.color }}
																		/>
																		{cat.name}
																	</div>
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												</div>
											)}
											{projects.length > 0 && (
												<div>
													<Label htmlFor={`task-proj-${task.id}`}>Project</Label>
													<Select
														value={task.project}
														onValueChange={v => updateTask(task.id, "project", v)}
													>
														<SelectTrigger
															id={`task-proj-${task.id}`}
															aria-label={`Task ${index + 1} project`}
														>
															<SelectValue placeholder="Project" />
														</SelectTrigger>
														<SelectContent>
															{projects.map(proj => (
																<SelectItem key={proj.id} value={proj.id}>
																	{proj.name}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												</div>
											)}
										</div>

										<div>
											<Label htmlFor={`task-desc-${task.id}`}>
												Description (optional)
											</Label>
											<Textarea
												id={`task-desc-${task.id}`}
												value={task.description}
												onChange={e =>
													updateTask(task.id, "description", e.target.value)
												}
												placeholder="Additional details (supports Markdown)"
												className="min-h-[60px] resize-none"
											/>
										</div>
									</div>
								);
							})}
						</CardContent>
					</Card>
				</div>

				<AdaptiveDialogFooter>
					<Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
						Cancel
					</Button>
					<Button
						type="button"
						onClick={handleSave}
						disabled={isSaving || !isValid}
					>
						{isSaving ? (
							<>
								<Loader2 className="w-4 h-4 mr-2 animate-spin" />
								Saving...
							</>
						) : (
							"Save Entry"
						)}
					</Button>
				</AdaptiveDialogFooter>
			</AdaptiveDialogContent>
		</AdaptiveDialog>
	);
};
