import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
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
import { Calendar, Clock, Edit, RotateCcw, FileText } from "lucide-react";
import {
	formatDuration,
	formatDurationLong,
	formatTime,
	formatDate,
	generateDailySummary,
} from "@/utils/timeUtil";
import { MarkdownDisplay } from "@/components/MarkdownDisplay";
import { DayRecord } from "@/contexts/TimeTrackingContext";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { getDayStats } from "@/utils/calculationUtils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs";

interface ArchiveItemProps {
	day: DayRecord;
	onEdit: (day: DayRecord) => void;
}

export const ArchiveItem: React.FC<ArchiveItemProps> = ({ day, onEdit }) => {
	const {
		restoreArchivedDay,
		isDayStarted,
		projects,
		categories,
	} = useTimeTracking();

	const [showRestoreDialog, setShowRestoreDialog] = useState(false);

	// Build lookup maps once — shared by dayStats and the task table.
	const projectMap = useMemo(() => new Map(projects.map(p => [p.name, p])), [projects]);
	const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

	// Memoize per-day stats using the pre-built maps so they only recompute
	// when the day data, project rates, or category billing settings change.
	const dayStats = useMemo(
		() => getDayStats(day, projectMap, categoryMap),
		[day, projectMap, categoryMap]
	);

	// Generate daily summary only when task descriptions change.
	const dailySummary = useMemo(() => {
		const descriptions = day.tasks
			.filter(task => task.description)
			.map(task => task.description!);
		return generateDailySummary(descriptions);
	}, [day.tasks]);

	const handleRestore = () => {
		if (isDayStarted) {
			setShowRestoreDialog(true);
		} else {
			restoreArchivedDay(day.id);
		}
	};

	const handleRestoreConfirm = () => {
		restoreArchivedDay(day.id);
		setShowRestoreDialog(false);
	};

	return (
		<Card className="print:shadow-none print:mb-4">
			<CardHeader className="print:pb-2">
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center space-x-2">
						{formatDate(day.startTime)}
					</CardTitle>
					<div className="flex space-x-2 print:hidden">
						<Button
							onClick={handleRestore}
							variant="ghost"
							size="sm"
							aria-label="Restore this day"
							className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
						>
							<RotateCcw className="w-4 h-4 block" />
							<span className="hidden md:block">Restore</span>
						</Button>
						<Button
							onClick={() => onEdit(day)}
							variant="default"
							size="sm"
							aria-label="Edit this day"
							className="flex items-center space-x-2"
						>
							<Edit className="w-4 h-4 block" />
							<span className="hidden md:block">Edit</span>
						</Button>
					</div>
				</div>
			</CardHeader>

			<CardContent className="print:pt-0">
				<div className="space-y-4">
					{/* Day Summary */}
					<div className="space-y-2">
						<div className="flex items-center justify-between text-sm print:text-base">
							<div className="flex items-center space-x-4">
								<span className="text-muted-foreground print:text-black">
									Started: {formatTime(day.startTime)}
								</span>
								<span className="text-muted-foreground print:text-black">
									Ended: {formatTime(day.endTime)}
								</span>
							</div>
							<div className="flex items-center space-x-2">
								<Clock className="w-4 h-4 text-green-600 print:text-black" />
								<span className="font-semibold text-green-600 print:text-black">
									{formatDurationLong(day.totalDuration)}
								</span>
							</div>
						</div>

						{/* Hours Worked and Revenue */}
						<div className="space-y-2 border-t pt-2">
							<div className="flex items-center justify-between text-sm print:text-base">
								<div className="flex items-center space-x-4">
									<span className="text-blue-600 print:text-black font-medium">
										Total{" "}
										<span className="hidden md:d-inline-flex">Hours: </span>
										{dayStats.hoursWorked.toFixed(2)}h
									</span>
									<span className="text-green-600 print:text-black font-medium">
										Billable: {dayStats.billableHours.toFixed(2)}h
									</span>
									<span className="text-muted-foreground print:text-black font-medium">
										Non-billable: {dayStats.nonBillableHours.toFixed(2)}h
									</span>
								</div>
								{dayStats.revenue > 0 && (
									<span className="text-green-600 print:text-black font-semibold">
										Revenue: ${dayStats.revenue.toFixed(2)}
									</span>
								)}
							</div>
						</div>
					</div>

					{/* Daily Summary */}
					{dailySummary && (
						<div className="space-y-2 border-t pt-4">
							<h4 className="font-medium text-foreground flex items-center mb-2">
								<FileText className="w-4 h-4 mr-2" />
								Overview
							</h4>
							<Tabs defaultValue="summary" className="w-full">
								<TabsList className="border-b mb-4">
									<TabsTrigger
										value="summary"
										className="px-3 py-1 text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
									>
										Summary
									</TabsTrigger>
									<TabsTrigger
										value="notes"
										className="px-3 py-1 text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
									>
										Notes
									</TabsTrigger>
								</TabsList>
								<TabsContent value="summary" className="focus-visible:outline-none">
									<div className="bg-muted p-4 rounded-md print:bg-white print:border print:border-border">
										<MarkdownDisplay
											content={dailySummary}
											className="prose-p:text-foreground print:prose-p:text-foreground"
										/>
									</div>
								</TabsContent>
								<TabsContent value="notes" className="focus-visible:outline-none">
									<div className="bg-muted p-4 rounded-md print:bg-white print:border print:border-border">
										{day.notes ? (
											<MarkdownDisplay
												content={day.notes}
												className="prose-p:text-foreground print:prose-p:text-foreground"
											/>
										) : (
											<div className="prose-sm prose-p:leading-relaxed prose-p:my-1 prose-p:text-foreground print:prose-p:text-foreground">
												<p>No notes for this day have been entered.</p>
											</div>
										)}
									</div>
								</TabsContent>
							</Tabs>
						</div>
					)}

					{/* Tasks Table */}
					<div className="print:mt-2">
						<h4 className="font-medium text-foreground print:hidden mb-2">
							Tasks ({day.tasks.length})
						</h4>
						<Table>
							<TableHeader>
								<TableRow className="print:border-black">
									<TableHead className="print:text-black print:font-bold">
										Task
									</TableHead>
									<TableHead className="print:text-black print:font-bold">
										Project
									</TableHead>
									<TableHead className="print:text-black print:font-bold">
										Start<span className="hidden md:d-inline-flex"> Time</span>
									</TableHead>
									<TableHead className="print:text-black print:font-bold">
										End<span className="hidden md:d-inline-flex"> Time</span>
									</TableHead>
									<TableHead className="print:text-black print:font-bold">
										Duration
									</TableHead>
									<TableHead className="print:text-black print:font-bold">
										Value
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{day.tasks.map(task => {
									const project = projectMap.get(task.project ?? "");
									const category = categoryMap.get(task.category ?? "");
									const taskHours = task.duration
										? task.duration / (1000 * 60 * 60)
										: 0;

									// Check if both the project and category are billable
									const projectIsBillable = project?.isBillable !== false;
									const categoryIsBillable = category?.isBillable !== false;
									const isBillable = projectIsBillable && categoryIsBillable;

									const taskValue =
										isBillable && project?.hourlyRate && task.duration
											? taskHours * project.hourlyRate
											: 0;

									return (
										<TableRow key={task.id} className="print:border-black">
											<TableCell className="font-medium print:text-black">
												{task.title}
												<div className="text-sm text-muted-foreground hidden md:block print:text-foreground">
													<MarkdownDisplay
														content={task.description}
														className="prose-sm line-clamp-1 hover:line-clamp-none transition-all duration-200"
													/>
												</div>
											</TableCell>
											<TableCell className="print:text-black">
												{task.project || "-"}
												{project?.hourlyRate && (
													<div className="text-xs text-muted-foreground print:text-foreground">
														${project.hourlyRate}/hr
													</div>
												)}
											</TableCell>
											<TableCell className="print:text-black">
												{formatTime(task.startTime)}
											</TableCell>
											<TableCell className="print:text-black">
												{task.endTime ? formatTime(task.endTime) : "-"}
											</TableCell>
											<TableCell className="print:text-black">
												{formatDuration(task.duration || 0)}
												<div className="text-xs text-gray-500 print:text-gray-600">
													{taskHours.toFixed(2)}h
												</div>
											</TableCell>
											<TableCell className="print:text-black">
												{taskValue > 0 ? (
													<span className="font-medium text-green-600 print:text-black">
														${taskValue.toFixed(2)}
													</span>
												) : (
													"-"
												)}
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</div>
				</div>
			</CardContent>
			<AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Replace active day?</AlertDialogTitle>
						<AlertDialogDescription>
							You currently have an active day. Restoring to this archived day will replace your current work.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleRestoreConfirm}>
							Restore anyway
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Card>
	);
};
