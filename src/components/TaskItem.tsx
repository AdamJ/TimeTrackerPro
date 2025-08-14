import React, { useState } from 'react';
import { Task, useTimeTracking } from '@/contexts/TimeTrackingContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TaskEditDialog } from '@/components/TaskEditDialog';
import { Edit, Trash2, Clock } from 'lucide-react';
import { formatDuration, formatTime } from '@/utils/timeUtil';

interface TaskItemProps {
  task: Task;
  isActive: boolean;
  currentDuration?: number;
  onDelete: (taskId: string) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  isActive,
  currentDuration = 0,
  onDelete
}) => {
  const { categories } = useTimeTracking();
  const [showEditDialog, setShowEditDialog] = useState(false);

  const duration = task.duration || (isActive ? currentDuration : 0);
  const category = categories.find(c => c.id === task.category);

  return (
    <>
      <Card className={`transition-all duration-200 ${isActive ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                {category && (
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                    title={category.name}
                  />
                )}
                <h3 className="font-medium text-gray-900">{task.title}</h3>
                {isActive && (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full font-medium">
                    Active
                  </span>
                )}
              </div>

              {task.description && (
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                  {task.description}
                </p>
              )}

              <div className="flex items-center flex-wrap gap-2 text-sm text-gray-600">
                <span className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>Started: {formatTime(task.startTime)}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span>Duration: {formatDuration(duration)}</span>
                </span>
                {category && (
                  <span
                    className="px-2 py-1 text-xs rounded-full text-white"
                    style={{ backgroundColor: category.color }}
                  >
                    {category.name}
                  </span>
                )}
                {task.project && (
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                    {task.project}
                  </span>
                )}
                {task.client && (
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                    {task.client}
                  </span>
                )}
              </div>
            </div>

            <div className="flex space-x-2 ml-4">
              <Button
                onClick={() => setShowEditDialog(true)}
                size="sm"
                variant="outline"
                className="flex items-center space-x-1"
              >
                <Edit className="w-3 h-3" />
                <span>Edit</span>
              </Button>
              <Button
                onClick={() => onDelete(task.id)}
                size="sm"
                variant="outline"
                className="flex items-center space-x-1 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <TaskEditDialog
        task={task}
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
      />
    </>
  );
};
