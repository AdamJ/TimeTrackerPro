import React, { useRef, useState } from "react";
import { PlannedTask, PlannedTaskStatus } from "@/contexts/TimeTrackingContext";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { useHaptics } from "@/hooks/useHaptics";
import { useLongPress } from "@/hooks/useLongPress";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmationDialog } from "@/components/DeleteConfirmationDialog";
import { PlannedTaskDialog } from "@/components/PlannedTaskDialog";
import { MarkdownDisplay } from "@/components/MarkdownDisplay";
import { Badge } from "@radix-ui/themes";
import { ArrowRight, Edit, Trash2, Play, MoveRight } from "lucide-react";

interface PlannedTaskCardProps {
	task: PlannedTask;
	isDayStarted: boolean;
	isDayStale: boolean;
}

const STATUS_LABELS: Record<PlannedTaskStatus, string> = {
	todo: "To Do",
	in_progress: "In Progress",
	done: "Done",
	blocked: "Blocked",
};

const OTHER_STATUSES = (current: PlannedTaskStatus): PlannedTaskStatus[] =>
	(["todo", "in_progress", "done", "blocked"] as PlannedTaskStatus[]).filter(
		(s) => s !== current
	);

export const PlannedTaskCard: React.FC<PlannedTaskCardProps> = ({
	task,
	isDayStarted,
	isDayStale,
}) => {
	const { categories, deletePlannedTask, movePlannedTask, pullPlannedTaskToDay } =
		useTimeTracking();
	const { lightImpact, mediumImpact } = useHaptics();
	const contextMenuTriggerRef = useRef<HTMLDivElement>(null);
	const [showEditDialog, setShowEditDialog] = useState(false);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);

	const longPressHandlers = useLongPress(() => {
		mediumImpact();
		if (contextMenuTriggerRef.current) {
			contextMenuTriggerRef.current.dispatchEvent(
				new MouseEvent("contextmenu", { bubbles: true, cancelable: true })
			);
		}
	});

	const category = categories.find((c) => c.id === task.category);
	const canPull = isDayStarted && !isDayStale && task.status !== "done";

	return (
		<>
			<ContextMenu>
				<ContextMenuTrigger asChild>
					<div ref={contextMenuTriggerRef} {...longPressHandlers}>
						<Card className="hover:shadow-md transition-all duration-200">
							<CardContent className="p-3">
								<div className="flex items-start justify-between gap-2">
									<div className="flex-1 min-w-0">
										<h3 className="font-semibold text-foreground text-sm leading-snug">
											{task.title}
										</h3>

										{task.description && (
											<div className="mt-1 text-xs text-muted-foreground line-clamp-2">
												<MarkdownDisplay content={task.description} />
											</div>
										)}

										<div className="flex flex-wrap gap-1 mt-2">
											{category && (
												<Badge
													radius="full"
													size="1"
													style={{ backgroundColor: category.color, color: "#fff" }}
												>
													{category.name}
												</Badge>
											)}
											{task.project && (
												<Badge color="gray" variant="outline" radius="full" size="1">
													{task.project}
												</Badge>
											)}
											{task.client && (
												<Badge color="cyan" radius="full" size="1">
													{task.client}
												</Badge>
											)}
											{task.linkedTaskId && (
												<Badge color="green" variant="soft" radius="full" size="1">
													<ArrowRight className="w-2.5 h-2.5 inline mr-0.5" />
													Pulled to day
												</Badge>
											)}
										</div>
									</div>

									<div className="flex flex-col gap-1 shrink-0">
										{canPull && (
											<Button
												size="sm"
												variant="outline"
												onClick={() => pullPlannedTaskToDay(task.id)}
												className="h-7 px-2 text-xs"
												title="Pull to active day and start timing"
											>
												<Play className="w-3 h-3 mr-1" />
												Pull
											</Button>
										)}

										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button
													size="sm"
													variant="ghost"
													onClick={() => lightImpact()}
													className="h-7 px-2 text-xs"
													title="Move to another column"
												>
													<MoveRight className="w-3 h-3 mr-1" />
													Move
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												{OTHER_STATUSES(task.status).map((s) => (
													<DropdownMenuItem
														key={s}
														onClick={() => movePlannedTask(task.id, s)}
													>
														{STATUS_LABELS[s]}
													</DropdownMenuItem>
												))}
											</DropdownMenuContent>
										</DropdownMenu>

										<Button
											size="sm"
											variant="ghost"
											onClick={() => { lightImpact(); setShowEditDialog(true); }}
											className="h-7 px-2 text-xs"
											aria-label={`Edit: ${task.title}`}
										>
											<Edit className="w-3 h-3" />
										</Button>

										<Button
											size="sm"
											variant="ghost"
											onClick={() => { mediumImpact(); setShowDeleteDialog(true); }}
											className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
											aria-label={`Delete: ${task.title}`}
										>
											<Trash2 className="w-3 h-3" />
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				</ContextMenuTrigger>

				<ContextMenuContent>
					{canPull && (
						<>
							<ContextMenuItem onClick={() => pullPlannedTaskToDay(task.id)}>
								<Play className="w-4 h-4 mr-2" />
								Pull to Day
							</ContextMenuItem>
							<ContextMenuSeparator />
						</>
					)}
					<ContextMenuItem onClick={() => { lightImpact(); setShowEditDialog(true); }}>
						<Edit className="w-4 h-4 mr-2" />
						Edit Task
					</ContextMenuItem>
					<ContextMenuSub>
						<ContextMenuSubTrigger>
							<MoveRight className="w-4 h-4 mr-2" />
							Move to
						</ContextMenuSubTrigger>
						<ContextMenuSubContent>
							{OTHER_STATUSES(task.status).map((s) => (
								<ContextMenuItem key={s} onClick={() => movePlannedTask(task.id, s)}>
									{STATUS_LABELS[s]}
								</ContextMenuItem>
							))}
						</ContextMenuSubContent>
					</ContextMenuSub>
					<ContextMenuSeparator />
					<ContextMenuItem
						onClick={() => { mediumImpact(); setShowDeleteDialog(true); }}
						className="text-destructive focus:text-destructive"
					>
						<Trash2 className="w-4 h-4 mr-2" />
						Delete Task
					</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>

			<PlannedTaskDialog
				task={task}
				isOpen={showEditDialog}
				onClose={() => setShowEditDialog(false)}
			/>

			<DeleteConfirmationDialog
				isOpen={showDeleteDialog}
				onClose={() => setShowDeleteDialog(false)}
				onConfirm={() => {
					deletePlannedTask(task.id);
					setShowDeleteDialog(false);
				}}
				taskTitle={task.title}
			/>
		</>
	);
};
