import { TimeTrackingProvider } from '@/contexts/TimeTrackingContext';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { DaySummary } from '@/components/DaySummary';
import { NewTaskForm } from '@/components/NewTaskForm';
import { TaskItem } from '@/components/TaskItem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Archive as ArchiveIcon, Play, CogIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDuration } from '@/utils/timeUtil';
import { DashboardIcon } from '@radix-ui/react-icons';
import SiteNavigationMenu from '@/components/Navigation';

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

  const handleStartDay = () => {
    startDay();
  };

  const handleEndDay = () => {
    endDay();
  };

  const handleNewTask = (title: string, description?: string, project?: string, client?: string, category?: string) => {
    startNewTask(title, description, project, client, category);
  };

  const handleTaskDelete = (taskId: string) => {
    deleteTask(taskId);
  };

  const handlePostDay = () => {
    postDay();
  };
  const { archivedDays, getTotalHoursForPeriod, getRevenueForPeriod } = useTimeTracking();
  const totalHours = archivedDays.length > 0 ? getTotalHoursForPeriod(new Date(0), new Date()) : 0;
  const sortedDays = [...archivedDays].sort((a, b) =>
    new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );


  // Calculate running timer for navigation
  const runningTime = isDayStarted ? getTotalDayDuration() : 0;

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
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <DashboardIcon className="w-6 h-6" />
            <span>Dashboard</span>
          </h1>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">{sortedDays.length}</div>
                <div className="text-sm text-gray-600">Days Tracked</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">{totalHours}h</div>
                <div className="text-sm text-gray-600">Total Hours</div>
              </CardContent>
            </Card>
          </div>

          {/* Archived Days */}
          {/* <div className="space-y-4">
            {sortedDays.map((day) => (
              <ArchiveItem
                key={day.id}
                day={day}
                onEdit={handleEdit}
              />
            ))}
          </div> */}
        </div>
      </div>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
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
                Click the button below to start tracking your work time for today.
              </p>
              <Button
                onClick={handleStartDay}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center space-x-2 py-3"
              >
                <Play className="w-4 h-4" />
                <span>Start Day</span>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <NewTaskForm onSubmit={handleNewTask} />

            {tasks.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Tasks</h2>
                {tasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    isActive={currentTask?.id === task.id}
                    currentDuration={currentTask?.id === task.id ? getCurrentTaskDuration() : 0}
                    onDelete={handleTaskDelete}
                  />
                ))}
              </div>
            )}

            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4">
                <Button
                  onClick={handleEndDay}
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                >
                  End Day
                </Button>
              </CardContent>
            </Card>
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
