import { TimeTrackingProvider } from '@/contexts/TimeTrackingContext';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { DaySummary } from '@/components/DaySummary';
import { NewTaskForm } from '@/components/NewTaskForm';
import { TaskItem } from '@/components/TaskItem';
import { StartDayDialog } from '@/components/StartDayDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CirclePlay, CircleStop, Archive as Play } from 'lucide-react';
import { DashboardIcon } from '@radix-ui/react-icons';
import SiteNavigationMenu from '@/components/Navigation';
import { useState } from 'react';

const TimeTrackerContent = () => {
  const {
    isDayStarted,
    dayStartTime,
    currentTask,
    tasks,
    startDay,
    endDay,
    startNewTask,
    deleteTask,
    postDay,
    getTotalDayDuration,
    getCurrentTaskDuration
  } = useTimeTracking();

  const [showStartDayDialog, setShowStartDayDialog] = useState(false);

  const handleStartDay = () => {
    setShowStartDayDialog(true);
  };

  const handleStartDayWithDateTime = (startDateTime: Date) => {
    startDay(startDateTime);
  };

  const handleEndDay = () => {
    endDay();
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

  const handlePostDay = () => {
    postDay();
  };
  const { archivedDays, getTotalHoursForPeriod } = useTimeTracking();
  const totalHours =
    archivedDays.length > 0
      ? getTotalHoursForPeriod(new Date(0), new Date())
      : 0;
  const sortedDays = [...archivedDays].sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );

  // Calculate running timer for navigation
  const runningTime = isDayStarted ? getTotalDayDuration() : 0;

  // Debug logging to understand state
  console.log('🔍 Index component state:', {
    isDayStarted,
    dayStartTime,
    tasksLength: tasks.length,
    shouldShowSummary: !isDayStarted && dayStartTime && tasks.length > 0
  });

  // Show day summary if day has ended but not yet posted
  if (!isDayStarted && dayStartTime && tasks.length > 0) {
    return (
      <>
        <SiteNavigationMenu />
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <DaySummary
            tasks={tasks}
            totalDuration={getTotalDayDuration()}
            dayStartTime={dayStartTime}
            onPostDay={handlePostDay}
          />
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <SiteNavigationMenu />
      {/* Main Content */}
      {!isDayStarted ? (
      <div className="max-w-6xl mx-auto pt-4 pb-2 px-4 md:p-6 print:p-4">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="md:text-2xl font-bold text-gray-900 flex items-center space-x-1">
              <DashboardIcon className="w-6 h-6 mr-1" />
              <span>Dashboard</span>
            </h1>
          </div>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {sortedDays.length}
                </div>
                <div className="text-sm text-gray-600">Days Tracked</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">
                  {totalHours}h
                </div>
                <div className="text-sm text-gray-600">Total Hours</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      ) : null}
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <StartDayDialog
          isOpen={showStartDayDialog}
          onClose={() => setShowStartDayDialog(false)}
          onStartDay={handleStartDayWithDateTime}
        />
        {!isDayStarted ? (
          <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-blue-800">
                <Play className="w-5 h-5" />
                <span>Start Your Work Day</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Click the button below to start tracking your work time for
                today.
              </p>
              <Button
                onClick={handleStartDay}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center space-x-2 py-3"
              >
                <CirclePlay className="w-4 h-4" />
                <span>Start Day</span>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <NewTaskForm onSubmit={handleNewTask} />
            {tasks.length > 0 && (
              <div className="space-y-4">
                <h2 className="flex justify-between text-lg font-semibold text-gray-900">Tasks ({tasks.length})
                  {dayStartTime && (
                    <p className="text-sm text-gray-600">
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
                className="w-full font-bold bg-red-50 border-red-700 text-red-700 hover:bg-red-100 hover:text-red-700"
              >
                <CircleStop className="w-4 h-4" />
                End Day
              </Button>
          </>
        )}
      </div>
    </div>
  );
};

const Index = () => {
  return (
    <TimeTrackingProvider>
      <TimeTrackerContent />
    </TimeTrackingProvider>
  );
};

export default Index;
