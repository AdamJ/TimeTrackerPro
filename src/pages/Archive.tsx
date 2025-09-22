import React, { useState } from 'react';
import { useTimeTracking, TimeTrackingProvider } from '@/contexts/TimeTrackingContext';
import { ArchiveItem } from '@/components/ArchiveItem';
import { ArchiveEditDialog } from '@/components/ArchiveEditDialog';
import { ExportDialog } from '@/components/ExportDialog';
import { ProjectManagement } from '@/components/ProjectManagement';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Archive as ArchiveIcon, Printer, ArrowLeft, Download, Briefcase, CogIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DayRecord } from '@/contexts/TimeTrackingContext';
import SiteNavigationMenu from '@/components/Navigation';

const ArchiveContent: React.FC = () => {
  const { archivedDays, getTotalHoursForPeriod, getRevenueForPeriod } = useTimeTracking();
  const [editingDay, setEditingDay] = useState<DayRecord | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showProjectManagement, setShowProjectManagement] = useState(false);

  // Sort archived days from newest to oldest
  const sortedDays = [...archivedDays].sort((a, b) =>
    new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );

  // Calculate summary stats
  const totalHours = archivedDays.length > 0 ? getTotalHoursForPeriod(new Date(0), new Date()) : 0;
  const totalRevenue = archivedDays.length > 0 ? getRevenueForPeriod(new Date(0), new Date()) : 0;

  const handlePrint = () => {
    window.print();
  };

  const handleEdit = (day: DayRecord) => {
    setEditingDay(day);
  };

  const handleCloseEdit = () => {
    setEditingDay(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Navigation Header */}
      <SiteNavigationMenu />
      <div className="max-w-6xl mx-auto pt-6 pb-0 pl-6 print:hidden">
        <Link
          to="/"
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 print:hidden"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Timer</span>
        </Link>
      </div>
      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-6 print:p-4">
        {sortedDays.length === 0 ? (
          <Card className="text-center py-12 print:hidden">
            <CardContent>
              <ArchiveIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <CardTitle className="mb-2">No Archived Days</CardTitle>
              <p className="text-gray-600 mb-4">
                Complete and post your first day to see it in the archive.
              </p>
              <Link to="/">
                <Button>Start Tracking Time</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-600">{sortedDays.length}</div>
                  <div className="text-sm text-gray-600">Total Days Tracked</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-600">{totalHours}h</div>
                  <div className="text-sm text-gray-600">Total Hours</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-purple-600">${totalRevenue}</div>
                  <div className="text-sm text-gray-600">Total Revenue</div>
                </CardContent>
              </Card>
            </div>

            {/* Archived Days */}
            <div className="space-y-4">
              {sortedDays.map((day) => (
                <ArchiveItem
                  key={day.id}
                  day={day}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      {editingDay && (
        <ArchiveEditDialog
          day={editingDay}
          isOpen={!!editingDay}
          onClose={handleCloseEdit}
        />
      )}

      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
      />

      <ProjectManagement
        isOpen={showProjectManagement}
        onClose={() => setShowProjectManagement(false)}
      />
    </div>
  );
};

const Archive: React.FC = () => {
  return (
    <TimeTrackingProvider>
      <ArchiveContent />
    </TimeTrackingProvider>
  );
};

export default Archive;
