import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TimePicker } from '@/components/ui/scroll-time-picker';
import { Calendar, Clock } from 'lucide-react';

interface StartDayDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onStartDay: (date: Date, time: string) => void;
}

// Helper functions
function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTimeForInput(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export const StartDayDialog: React.FC<StartDayDialogProps> = ({
  isOpen,
  onClose,
  onStartDay
}) => {
  const now = new Date();
  const [selectedDate, setSelectedDate] = useState(formatDateForInput(now));
  const [selectedTime, setSelectedTime] = useState(formatTimeForInput(now));

  // Reset to current date/time when dialog opens
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      setSelectedDate(formatDateForInput(now));
      setSelectedTime(formatTimeForInput(now));
    }
  }, [isOpen]);

  const handleStartDay = () => {
    // Parse the selected date and time
    const [year, month, day] = selectedDate.split('-').map(Number);
    const [hours, minutes] = selectedTime.split(':').map(Number);

    const startDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
    onStartDay(startDateTime, selectedTime);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span>Start Your Work Day</span>
          </DialogTitle>
          <DialogDescription>
            Choose the date and time when you started working today.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full"
            />
          </div>

          <div>
            <Label htmlFor="start-time">Start Time</Label>
            <TimePicker
              id="start-time"
              value={selectedTime}
              onValueChange={setSelectedTime}
              aria-label="Select start time for your work day"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleStartDay}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Clock className="w-4 h-4 mr-2" />
            Start Day
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
