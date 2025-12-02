import React, { useState } from 'react';
import {
  TimeTrackingProvider,
  DayRecord
} from '@/contexts/TimeTrackingContext';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { ArchiveItem } from '@/components/ArchiveItem';
import { ArchiveEditDialog } from '@/components/ArchiveEditDialog';
import { ExportDialog } from '@/components/ExportDialog';
import { ProjectManagement } from '@/components/ProjectManagement';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Archive as ArchiveIcon, Database } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import SiteNavigationMenu from '@/components/Navigation';

const ArchiveContent: React.FC = () => {
  const {
    archivedDays,
    getTotalHoursForPeriod,
    getRevenueForPeriod,
    getHoursWorkedForDay,
    getBillableHoursForDay,
    getNonBillableHoursForDay
  } = useTimeTracking();
  const [editingDay, setEditingDay] = useState<DayRecord | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showProjectManagement, setShowProjectManagement] = useState(false);

  // Sort archived days from newest to oldest
  const sortedDays = [...archivedDays].sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );

  // Calculate summary stats
  const totalHours =
    archivedDays.length > 0
      ? getTotalHoursForPeriod(new Date(0), new Date())
      : 0;
  const totalHoursWorked = archivedDays.reduce((sum, day) => sum + getHoursWorkedForDay(day), 0);
  const totalBillableHours = archivedDays.reduce((sum, day) => sum + getBillableHoursForDay(day), 0);
  const totalNonBillableHours = archivedDays.reduce((sum, day) => sum + getNonBillableHoursForDay(day), 0);
  const totalRevenue =
    archivedDays.length > 0 ? getRevenueForPeriod(new Date(0), new Date()) : 0;

  const handleEdit = (day: DayRecord) => {
    setEditingDay(day);
  };

  const handleCloseEdit = () => {
    setEditingDay(null);
  };

  const { user, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Navigation Header */}
      <SiteNavigationMenu />
      {/* Main Content */}
      <div className="max-w-6xl mx-auto pt-4 pb-2 px-4 md:p-6 print:p-2">
        <div className="flex items-center justify-between">
          <h1 className="md:text-2xl font-bold text-gray-900 flex items-center space-x-1">
            <Database className="w-6 h-6" />
            <span>Archive</span>
            {isAuthenticated && user?.email && (
              <>
                &nbsp;<span className="hidden md:block">for {user.email}</span>
              </>
            )}
          </h1>
        </div>
      </div>
      <div className="max-w-6xl mx-auto p-6 print:p-2">
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
          <div className="space-y-6 print:space-y-0">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 print:hidden">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {sortedDays.length}
                  </div>
                  <div className="text-sm text-gray-600">
                    Total Days Tracked
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-600">
                    {totalBillableHours.toFixed(1)}h
                  </div>
                  <div className="text-sm text-gray-600">Billable Hours</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-gray-600">
                    {totalNonBillableHours.toFixed(1)}h
                  </div>
                  <div className="text-sm text-gray-600">Non-billable Hours</div>
                  <div className="text-xs text-gray-500">
                    {totalHoursWorked.toFixed(1)}h total work
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-purple-600">
                    ${totalRevenue.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">Total Revenue</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-orange-600">
                    ${totalBillableHours > 0 ? (totalRevenue / totalBillableHours).toFixed(2) : '0.00'}
                  </div>
                  <div className="text-sm text-gray-600">Avg Billable Rate</div>
                </CardContent>
              </Card>
            </div>

            {/* Archived Days */}
            <div className="space-y-4">
              {sortedDays.map((day) => (
                <ArchiveItem key={day.id} day={day} onEdit={handleEdit} />
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
