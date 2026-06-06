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
  Info,
} from "lucide-react";
import { getBillableHoursForDay, getNonBillableHoursForDay } from "@/utils/calculationUtils";
import { DashboardIcon } from "@radix-ui/react-icons";
import { PageLayout } from "@/components/PageLayout";
import { TaskTrackingPanel } from "@/components/TaskTrackingPanel";
import { useState, useMemo, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTrigger, PopoverTitle } from "@/components/ui/popover";

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

  const { todoItems, projects, categories, clients, archiveClient, archiveProject } = useTimeTracking();

  const billableHours = useMemo(
    () => archivedDays.reduce((sum, day) => sum + getBillableHoursForDay(day, projects, categories), 0),
    [archivedDays, projects, categories],
  );

  const nonBillableHours = useMemo(
    () => archivedDays.reduce((sum, day) => sum + getNonBillableHoursForDay(day, projects, categories), 0),
    [archivedDays, projects, categories],
  );

  const sortedDays = useMemo(
    () =>
      [...archivedDays].sort(
        (a, b) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
      ),
    [archivedDays],
  );

  const activeTodos = todoItems.filter((item) => !item.completed);
  const completedTodos = todoItems.filter((item) => item.completed);
  const archivedClients = clients.filter((client) => client.archived);

  const pageActions = useMemo(
    () => (
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
    ),
    []
  );

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
      actions={pageActions}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:grid-cols-3 print:hidden">
            <Card>
              <CardHeader>
                <CardDescription>Days Tracked</CardDescription>
                <CardTitle className="text-3xl font-semibold tabular-numbs">
                  {sortedDays.length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Total Hours</CardDescription>
                <CardTitle className="text-3xl font-semibold tabular-numbs">
                  {totalHours}h
                </CardTitle>
                <CardAction>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost">
                        <Info size={16} />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start">
                      <PopoverHeader>
                        <PopoverTitle>Total Hours</PopoverTitle>
                      </PopoverHeader>
                      <div className="px-4 pb-4 space-y-2 text-sm">
                        <div className="flex justify-between gap-8">
                          <span className="text-muted-foreground">Billable</span>
                          <span className="font-medium tabular-nums">{billableHours}h</span>
                        </div>
                        <div className="flex justify-between gap-8">
                          <span className="text-muted-foreground">Non-billable</span>
                          <span className="font-medium tabular-nums">{nonBillableHours}h</span>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </CardAction>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Projects</CardDescription>
                <CardTitle className="text-3xl font-semibold tabular-numbs">
                  {projects.length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>
                  Clients
                </CardDescription>
                <CardTitle className="text-3xl font-semibold tabular-numbs">
                  {clients.length}
                </CardTitle>
                <CardAction>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost">
                        <Info size={16} />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start">
                      <PopoverHeader>
                        <PopoverTitle>Stats</PopoverTitle>
                      </PopoverHeader>
                      <div className="px-4 pb-4 space-y-2 text-sm">
                        <div className="flex justify-between gap-8">
                          <span className="text-muted-foreground">Archived</span>
                          <span className="font-medium tabular-nums">{archivedClients.length}</span>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </CardAction>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Categories</CardDescription>
                <CardTitle className="text-3xl font-semibold tabular-numbs">
                  {categories.length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>To-Dos</CardDescription>
                <CardTitle className="text-3xl font-semibold tabular-numbs">
                  {activeTodos.length}
                </CardTitle>
                <CardAction>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost">
                        <Info size={16} />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start">
                      <PopoverHeader>
                        <PopoverTitle>To-Dos</PopoverTitle>
                      </PopoverHeader>
                      <div className="px-4 pb-4 space-y-2 text-sm">
                        <div className="flex justify-between gap-8">
                          <span className="text-muted-foreground">Total</span>
                          <span className="font-medium tabular-nums">{todoItems.length}</span>
                        </div>
                        <div className="flex justify-between gap-8">
                          <span className="text-muted-foreground">Completed</span>
                          <span className="font-medium tabular-nums">{completedTodos.length}</span>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </CardAction>
              </CardHeader>
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
