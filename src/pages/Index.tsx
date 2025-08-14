import React from 'react';
import { TimeTrackingProvider, useTimeTracking, Task } from '@/contexts/TimeTrackingContext';
import { DaySummary } from '@/components/DaySummary';
import { NewTaskForm } from '@/components/NewTaskForm';
import { TaskItem } from '@/components/TaskItem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Archive as ArchiveIcon, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDuration, formatTime, formatDate } from '@/utils/timeUtil';

const TimeTrackerContent = () => {
  const {
    isDayStarted,
    dayStartTime,
    currentTask,
    tasks,
    currentTime,
    startDay,
    endDay,
    startNewTask,
    updateTask,
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

  // Calculate running timer for navigation
  const runningTime = isDayStarted ? getTotalDayDuration() : 0;

  // Show day summary if day has ended but not yet posted
  if (!isDayStarted && dayStartTime && tasks.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                <Clock className="w-6 h-6" />
                <span>TimeTracker</span>
              </h1>

              <Link
                to="/archive"
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
              >
                <ArchiveIcon className="w-4 h-4" />
                <span>View Archive</span>
              </Link>
            </div>
          </div>
        </nav>

        <div className="max-w-4xl mx-auto p-6">
          <DaySummary
            tasks={tasks}
            totalDuration={getTotalDayDuration()}
            dayStartTime={dayStartTime}
            onPostDay={handlePostDay}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
              <Clock className="w-6 h-6" />
              <span>TimeTracker</span>
              {isDayStarted && (
                <span className="text-lg text-blue-600 ml-4">
                  {formatDuration(runningTime)}
                </span>
              )}
            </h1>

            <div className="flex space-x-4">
              <Link
                to="/archive"
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
              >
                <ArchiveIcon className="w-4 h-4" />
                <span>Archive</span>
              </Link>
              <Link
                to="/settings"
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
              >
                <span>Settings</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
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
