import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Calendar } from 'lucide-react';
import { Task } from '@/contexts/TimeTrackingContext';
import { formatDuration, formatTime, formatDate } from '@/utils/timeUtil';

interface DaySummaryProps {
  tasks: Task[];
  totalDuration: number;
  dayStartTime: Date;
  onPostDay: () => void;
}

export const DaySummary: React.FC<DaySummaryProps> = ({
  tasks,
  totalDuration,
  dayStartTime,
  onPostDay
}) => {
  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-green-800">
            <Calendar className="w-5 h-5" />
            <span>Day Complete!</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <p>{formatDate(dayStartTime)}</p>
              <p>Started at {formatTime(dayStartTime)}</p>
            </div>

            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="text-2xl font-bold text-blue-600">
                {formatDuration(totalDuration)}
              </span>
              <span className="text-gray-600">total time</span>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Tasks completed:</h4>
              <div className="space-y-1">
                {tasks.map((task) => (
                  <div key={task.id} className="flex justify-between text-sm">
                    <span className="text-gray-700">{task.title}</span>
                    <span className="text-gray-600">
                      {formatDuration(task.duration || 0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={onPostDay}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              Post Time to Archive
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
