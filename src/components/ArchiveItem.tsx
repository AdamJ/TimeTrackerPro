import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Calendar, Clock, Edit, RotateCcw } from 'lucide-react';
import { formatDuration, formatTime, formatDate } from '@/utils/timeUtil';
import { DayRecord } from '@/contexts/TimeTrackingContext';
import { useTimeTracking } from '@/hooks/useTimeTracking';

interface ArchiveItemProps {
  day: DayRecord;
  onEdit: (day: DayRecord) => void;
}

export const ArchiveItem: React.FC<ArchiveItemProps> = ({ day, onEdit }) => {
  const {
    restoreArchivedDay,
    isDayStarted,
    getHoursWorkedForDay,
    getRevenueForDay,
    getBillableHoursForDay,
    getNonBillableHoursForDay,
    projects,
    categories
  } = useTimeTracking();

  const handleRestore = () => {
    if (isDayStarted) {
      if (
        !confirm(
          'You currently have an active day. Restoring to this day will replace your current work. Continue restoring?'
        )
      ) {
        return;
      }
    }
    restoreArchivedDay(day.id);
  };

  return (
    <Card className="print:shadow-none print:mb-4">
      <CardHeader className="print:pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-600 print:text-black" />
            <span>{formatDate(day.startTime)}</span>
          </CardTitle>
          <div className="flex space-x-2 print:hidden">
            <Button
              onClick={handleRestore}
              variant="ghost"
              size="sm"
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Restore</span>
            </Button>
            <Button
              onClick={() => onEdit(day)}
              variant="default"
              size="sm"
              className="flex items-center space-x-2"
            >
              <Edit className="w-4 h-4" />
              <span>Edit</span>
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
                <span className="text-gray-600 print:text-black">
                  Started: {formatTime(day.startTime)}
                </span>
                <span className="text-gray-600 print:text-black">
                  Ended: {formatTime(day.endTime)}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-green-600 print:text-black" />
                <span className="font-semibold text-green-600 print:text-black">
                  {formatDuration(day.totalDuration)} total
                </span>
              </div>
            </div>

            {/* Hours Worked and Revenue */}
            <div className="space-y-2 border-t pt-2">
              <div className="flex items-center justify-between text-sm print:text-base">
                <div className="flex items-center space-x-4">
                  <span className="text-blue-600 print:text-black font-medium">
                    Total Hours: {getHoursWorkedForDay(day).toFixed(2)}h
                  </span>
                  <span className="text-green-600 print:text-black font-medium">
                    Billable: {getBillableHoursForDay(day).toFixed(2)}h
                  </span>
                  <span className="text-gray-600 print:text-black font-medium">
                    Non-billable: {getNonBillableHoursForDay(day).toFixed(2)}h
                  </span>
                </div>
                {getRevenueForDay(day) > 0 && (
                  <span className="text-green-600 print:text-black font-semibold">
                    Revenue: ${getRevenueForDay(day).toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tasks Table */}
          <div className="print:mt-2">
            <h4 className="font-medium text-gray-900 print:text-black mb-2">
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
                    Start Time
                  </TableHead>
                  <TableHead className="print:text-black print:font-bold">
                    End Time
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
                {day.tasks.map((task) => {
                  const project = projects.find((p) => p.name === task.project);
                  const category = categories.find((c) => c.name === task.category);
                  const taskHours = task.duration ? task.duration / (1000 * 60 * 60) : 0;

                  // Check if both the project and category are billable
                  const projectIsBillable = project?.isBillable !== false;
                  const categoryIsBillable = category?.isBillable !== false;
                  const isBillable = projectIsBillable && categoryIsBillable;

                  const taskValue = isBillable && project?.hourlyRate && task.duration ?
                    taskHours * project.hourlyRate : 0;

                  return (
                    <TableRow key={task.id} className="print:border-black">
                      <TableCell className="font-medium print:text-black">
                        {task.title}
                        <div className="font-medium text-sm italic text-gray-400 print:text-gray-600">
                          {task.description}
                        </div>
                      </TableCell>
                      <TableCell className="print:text-black">
                        {task.project || '-'}
                        {project?.hourlyRate && (
                          <div className="text-xs text-gray-500 print:text-gray-600">
                            ${project.hourlyRate}/hr
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="print:text-black">
                        {formatTime(task.startTime)}
                      </TableCell>
                      <TableCell className="print:text-black">
                        {task.endTime ? formatTime(task.endTime) : '-'}
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
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
