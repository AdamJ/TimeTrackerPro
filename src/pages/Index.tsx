import { useTimeTracking } from "@/hooks/useTimeTracking";
import { DaySummary } from "@/components/DaySummary";
import { StartDayDialog } from "@/components/StartDayDialog";
import { StaleDayDialog } from "@/components/StaleDayDialog";
import { TaskItem } from "@/components/TaskItem";
import { NewTaskForm } from "@/components/NewTaskForm";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CirclePlay,
  CircleStop,
  Archive as Play,
  ClipboardList,
  PanelRight,
} from "lucide-react";
import { DashboardIcon } from "@radix-ui/react-icons";
import { PageLayout } from "@/components/PageLayout";
import { TaskTrackingPanel } from "@/components/TaskTrackingPanel";
import { useState, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// Stable epoch constant — avoids creating new Date(0) on every render
const EPOCH = new Date(0);

const TimeTrackerContent = () => {
  const {
    isDayStarted,
    isDayStale,
    dayStartTime,
    currentTask,
    tasks,
    archivedDays,
    startDay,
    endDay,
    discardDay,
    postDay,
    deleteTask,
    startNewTask,
    getTotalDayDuration,
    getTotalHoursForPeriod,
    getCurrentTaskDuration,
  } = useTimeTracking();

  const [showStartDayDialog, setShowStartDayDialog] = useState(false);
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);

  const handleStartDay = () => {
    setShowStartDayDialog(true);
  };

  const handleStartDayWithDateTime = (startDateTime: Date) => {
    startDay(startDateTime);
  };

  const handleEndDay = () => {
    endDay();
  };

  const handlePostDay = () => {
    postDay();
  };

  const handleDiscardDay = () => {
    discardDay();
  };

  const handleNewTask = (
    title: string,
    description?: string,
    project?: string,
    client?: string,
    category?: string,
  ) => {
    startNewTask(title, description, project, client, category);
    setShowAddTaskForm(false);
  };

  const totalHours = useMemo(
    () =>
      archivedDays.length > 0 ? getTotalHoursForPeriod(EPOCH, new Date()) : 0,
    [archivedDays, getTotalHoursForPeriod],
  );
  const sortedDays = useMemo(
    () =>
      [...archivedDays].sort(
        (a, b) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
      ),
    [archivedDays],
  );

  const { todoItems, projects, categories, clients, archiveClient, archiveProject } = useTimeTracking();

  const activeTodos = todoItems.filter((item) => !item.completed);
  const completedTodos = todoItems.filter((item) => item.completed);
  const archivedClients = clients.filter((client) => client.archived);

  // Show day summary if day has ended but not yet posted
  if (!isDayStarted && dayStartTime && tasks.length > 0) {
    return (
      <PageLayout>
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <DaySummary
            tasks={tasks}
            totalDuration={getTotalDayDuration()}
            dayStartTime={dayStartTime}
            onPostDay={handlePostDay}
            onDiscardDay={handleDiscardDay}
          />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Dashboard"
      actions={
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <PanelRight className="w-4 h-4" />
              To-Do List
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>To-Do List</SheetTitle>
              <SheetDescription></SheetDescription>
            </SheetHeader>
            <TaskTrackingPanel />
          </SheetContent>
        </Sheet>
      }
    >
      <div className="max-w-6xl mx-auto pt-4 pb-6 px-4 print:p-4 space-y-6">
        <StartDayDialog
          isOpen={showStartDayDialog && !isDayStale}
          onClose={() => setShowStartDayDialog(false)}
          onStartDay={handleStartDayWithDateTime}
        />
        <StaleDayDialog />
        
        {/* Stats */}
        {!isDayStarted && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 print:hidden">
            <Card className="bg-muted border-border">
              <CardHeader>
                <CardTitle>Days Tracked</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-row justify-around">
                <p className="flex flex-col text-center">
                  <span className="text-3xl font-semibold tabular-nums">{sortedDays.length}</span>
                </p>
              </CardContent>
            </Card>
            <Card className="bg-muted border-border">
              <CardHeader>
                <CardTitle>Total Hours</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-row justify-around">
                <p className="flex flex-col text-center">
                  <span className="text-3xl font-semibold tabular-nums">{totalHours}h</span>
                </p>
              </CardContent>
            </Card>
            <Card className="bg-muted border-border">
              <CardHeader>
                <CardTitle>Projects</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-row justify-around">
                <p className="flex flex-col gap-1 text-center">
                  <span className="underline">Active</span>
                  <span className="text-3xl font-semibold tabular-nums">{projects.length}</span>
                </p>
                <p className="flex flex-col gap-1 text-center">
                  <span className="underline">Archived</span>
                  <span className="text-3xl font-semibold tabular-nums">{archiveProject.length}</span>
                </p>
              </CardContent>
            </Card>
            <Card className="bg-muted border-border">
              <CardHeader>
                <CardTitle>Clients</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-row justify-around">
                <p className="flex flex-col gap-1 text-center">
                  <span className="underline">Active</span>
                  <span className="text-3xl font-semibold tabular-nums">{clients.length}</span>
                </p>
                <p className="flex flex-col gap-1 text-center">
                  <span className="underline">Archived</span>
                  <span className="text-3xl font-semibold tabular-nums">{archiveClient.length}</span>
                </p>
              </CardContent>
            </Card>
            <Card className="bg-muted border-border">
              <CardHeader>
                <CardTitle>Categories</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 text-center">
                <p className="flex flex-col gap-1 text-center">
                  <span className="underline">Total</span>
                  <span className="text-3xl font-semibold tabular-nums">{categories.length}</span>
                </p>
              </CardContent>
            </Card>
            <Card className="bg-muted border-border">
              <CardHeader>
                <CardTitle>To-Dos</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-row justify-around">
                <p className="flex flex-col gap-1 text-center">
                  <span className="underline">Total</span>
                  <span className="text-3xl font-semibold tabular-nums">{todoItems.length}</span>
                </p>
                <p className="flex flex-col gap-1 text-center">
                  <span className="underline">Active</span>
                  <span className="text-3xl font-semibold tabular-nums">{activeTodos.length}</span>
                </p>
                <p className="flex flex-col gap-1 text-center">
                  <span className="underline">Completed</span>
                  <span className="text-3xl font-semibold tabular-nums">{completedTodos.length}</span>
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Two-column layout: main content + tracking panel */}
        <div>
          <div className="space-y-6">
            {!isDayStarted ? (
              <Card>
                <CardContent className="flex flex-col gap-2 items-center">
                  <span className="text-2xl font-semibold tabular-nums">Start Your Work Day</span>
                  <p className="py-4 text-foreground">
                    Click the button below to start tracking your work time for today.
                  </p>
                  <Button
                    onClick={handleStartDay}
                    variant="default"
                    className="w-1/2"
                  >
                    <CirclePlay className="w-4 h-4" />
                    <span>Start Day</span>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader className="flex items-center justify-between">
                    <CardTitle>
                      <div className="flex items-center space-x-2">
                        <ClipboardList className="w-5 h-5" />
                        <span>Day In Progress</span>
                        </div>
                      </CardTitle>
                      <CardDescription>
                      {dayStartTime && (
                        <div className="text-foreground">
                          Started at {dayStartTime.toLocaleTimeString()}
                        </div>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full"
                      onClick={() => setShowAddTaskForm(true)}
                      disabled={showAddTaskForm}
                    >
                      <ClipboardList className="w-4 h-4" />
                      Add Task
                    </Button>
                    </CardContent>
                </Card>

                {(tasks.length === 0 || showAddTaskForm) && (
                  <NewTaskForm onSubmit={handleNewTask} onCancel={() => setShowAddTaskForm(false)} defaultOpen={true} />
                )}

                {tasks.length > 0 && (
                  <div className="space-y-3">
                    {tasks.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        isActive={currentTask?.id === task.id}
                        currentDuration={
                          currentTask?.id === task.id
                            ? getCurrentTaskDuration()
                            : 0
                        }
                        onDelete={deleteTask}
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
              </>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

const Index = () => {
  return <TimeTrackerContent />;
};

export default Index;
