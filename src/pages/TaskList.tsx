import { useTimeTracking } from "@/hooks/useTimeTracking";
import { TaskItem } from "@/components/TaskItem";
import { NewTaskForm } from "@/components/NewTaskForm";
import { DaySummary } from "@/components/DaySummary";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CircleStop, ClipboardList, LayoutDashboard } from "lucide-react";
import { Link } from "react-router-dom";

const TaskList = () => {
	const {
		isDayStarted,
		dayStartTime,
		currentTask,
		tasks,
		endDay,
		postDay,
		deleteTask,
		startNewTask,
		getTotalDayDuration,
		getCurrentTaskDuration,
	} = useTimeTracking();

	const handleEndDay = () => {
		endDay();
	};

	const handlePostDay = () => {
		postDay();
	};

	const handleNewTask = (
		title: string,
		description?: string,
		project?: string,
		client?: string,
		category?: string
	) => {
		startNewTask(title, description, project, client, category);
	};

	const handleTaskDelete = (taskId: string) => {
		deleteTask(taskId);
	};

	// Show day summary after day ends but before it is posted
	if (!isDayStarted && dayStartTime && tasks.length > 0) {
		return (
			<PageLayout>
				<div className="max-w-4xl mx-auto p-6 space-y-6">
					<DaySummary
						tasks={tasks}
						totalDuration={getTotalDayDuration()}
						dayStartTime={dayStartTime}
						onPostDay={handlePostDay}
					/>
				</div>
			</PageLayout>
		);
	}

	if (!isDayStarted) {
		return (
			<PageLayout
				title="Tasks"
				icon={<ClipboardList className="w-5 h-5" />}
			>
				<div className="max-w-4xl mx-auto pt-4 pb-6 px-4 md:p-6">
					<Card className="bg-muted border-border">
						<CardHeader>
							<CardTitle className="flex items-center space-x-2 text-primary">
								<ClipboardList className="w-5 h-5" />
								<span>No Active Work Day</span>
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<p className="text-foreground">
								Start your work day on the dashboard before adding tasks.
							</p>
							<Button asChild className="w-full">
								<Link to="/" className="flex items-center justify-center space-x-2">
									<LayoutDashboard className="w-4 h-4" />
									<span>Go to Dashboard</span>
								</Link>
							</Button>
						</CardContent>
					</Card>
				</div>
			</PageLayout>
		);
	}

	return (
		<PageLayout
			title="Tasks"
			icon={<ClipboardList className="w-5 h-5" />}
		>
			<div className="max-w-4xl mx-auto pt-4 pb-6 px-4 md:p-6 space-y-6">
				<NewTaskForm onSubmit={handleNewTask} />
				{tasks.length === 0 ? (
					<div className="text-center py-8 text-muted-foreground" aria-live="polite">
						<ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" />
						<p className="font-medium">No tasks yet</p>
						<p className="text-sm mt-1">Use the button above to start tracking your first task.</p>
					</div>
				) : (
					<div className="space-y-4">
						<h2 className="flex justify-between text-lg font-semibold text-foreground" aria-live="polite" aria-atomic="true">
							Tasks ({tasks.length})
							{dayStartTime && (
								<p className="text-sm text-muted-foreground">
									Day started at: {dayStartTime.toLocaleTimeString()}
								</p>
							)}
						</h2>
						{tasks.map((task) => (
							<TaskItem
								key={task.id}
								task={task}
								isActive={currentTask?.id === task.id}
								currentDuration={
									currentTask?.id === task.id ? getCurrentTaskDuration() : 0
								}
								onDelete={handleTaskDelete}
							/>
						))}
					</div>
				)}
				<Button
					variant="outline"
					onClick={handleEndDay}
					className="w-full font-bold bg-destructive/10 border-destructive text-destructive hover:bg-destructive/20 hover:text-destructive"
				>
					<CircleStop className="w-4 h-4" />
					End Day
				</Button>
			</div>
		</PageLayout>
	);
};

export default TaskList;
