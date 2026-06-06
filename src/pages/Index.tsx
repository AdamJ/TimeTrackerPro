import { useTimeTracking } from "@/hooks/useTimeTracking";
import { DaySummary } from "@/components/DaySummary";
import { StartDayDialog } from "@/components/StartDayDialog";
import { StaleDayDialog } from "@/components/StaleDayDialog";
import { TaskItem } from "@/components/TaskItem";
import { NewTaskForm } from "@/components/NewTaskForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CirclePlay, CircleStop, Archive as Play, ClipboardList } from "lucide-react";
import { DashboardIcon } from "@radix-ui/react-icons";
import { PageLayout } from "@/components/PageLayout";
import { TaskTrackingPanel } from "@/components/TaskTrackingPanel";
import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

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
    category?: string
  ) => {
    startNewTask(title, description, project, client, category);
    setShowAddTaskForm(false);
  };

  const totalHours = useMemo(
    () => archivedDays.length > 0 ? getTotalHoursForPeriod(EPOCH, new Date()) : 0,
    [archivedDays, getTotalHoursForPeriod]
  );
  const sortedDays = useMemo(
    () => [...archivedDays].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()),
    [archivedDays]
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
    <PageLayout title="Dashboard" icon={<DashboardIcon className="w-6 h-6" />}>
      <div className="max-w-6xl mx-auto pt-4 pb-6 px-4 md:p-6 print:p-4 space-y-6">
        <StartDayDialog
          isOpen={showStartDayDialog && !isDayStale}
          onClose={() => setShowStartDayDialog(false)}
          onStartDay={handleStartDayWithDateTime}
        />
        <StaleDayDialog />

        {/* Stats (always visible) */}
        {!isDayStarted && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 print:hidden">
            <Card className="bg-muted border-border">
              <CardHeader>
                <CardTitle>Days Tracked</CardTitle>
              </CardHeader>
              <CardContent>
                {sortedDays.length}
              </CardContent>
            </Card>
            <Card className="bg-muted border-border">
              <CardHeader>
                <CardTitle>Total Hours</CardTitle>
              </CardHeader>
              <CardContent>
                {totalHours}h
              </CardContent>
            </Card>
          </div>
        )}

        {/* Two-column layout: main content + tracking panel */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
          {/* Left column: day actions */}
          <div className="space-y-6">
            {!isDayStarted ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-primary">
                    <Play className="w-5 h-5" />
                    <span>Start Your Work Day</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4">
                    Click the button below to start tracking your work time for
                    today.
                  </p>
                  <Button
                    onClick={handleStartDay}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center space-x-2 py-3"
                  >
                    <CirclePlay className="w-4 h-4" />
                    <span>Start Day</span>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-primary">
                      <span className="flex items-center space-x-2">
                        <ClipboardList className="w-5 h-5" />
                        <span>Day In Progress</span>
                      </span>
                      {dayStartTime && (
                        <span className="text-sm font-normal text-muted-foreground">
                          Started at {dayStartTime.toLocaleTimeString()}
                        </span>
                      )}
                    </CardTitle>
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
                  <NewTaskForm onSubmit={handleNewTask} defaultOpen={true} />
                )}

                {tasks.length > 0 && (
                  <div className="space-y-3">
                    {tasks.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        isActive={currentTask?.id === task.id}
                        currentDuration={currentTask?.id === task.id ? getCurrentTaskDuration() : 0}
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

          {/* Right column: task tracking panel (always visible) */}
          <div className="lg:sticky lg:top-6">
            <Sheet>
              <SheetTrigger asChild>
                <Button>Open To-Do List</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>To-Do List</SheetTitle>
                  <SheetDescription></SheetDescription>
                </SheetHeader>
                <TaskTrackingPanel />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

const Index = () => {
  return (
    <TimeTrackerContent />
  );
};

export default Index;
