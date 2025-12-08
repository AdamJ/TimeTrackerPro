import React, { useState, useMemo } from 'react';
import {
  TimeTrackingProvider,
  DayRecord
} from '@/contexts/TimeTrackingContext';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { ArchiveItem } from '@/components/ArchiveItem';
import { ArchiveEditDialog } from '@/components/ArchiveEditDialog';
import { ExportDialog } from '@/components/ExportDialog';
import { ProjectManagement } from '@/components/ProjectManagement';
import { ArchiveFilter, ArchiveFilterState } from '@/components/ArchiveFilter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Archive as ArchiveIcon, Database } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import SiteNavigationMenu from '@/components/Navigation';

const ArchiveContent: React.FC = () => {
  const {
    archivedDays,
    getHoursWorkedForDay,
    getBillableHoursForDay,
    getNonBillableHoursForDay,
    getRevenueForDay,
    projects,
    categories
  } = useTimeTracking();
  const [editingDay, setEditingDay] = useState<DayRecord | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showProjectManagement, setShowProjectManagement] = useState(false);
  const [filters, setFilters] = useState<ArchiveFilterState>({
    startDate: "",
    endDate: "",
    project: "",
    category: ""
  });

  // Filter and sort archived days
  const filteredDays = useMemo(() => {
    let filtered = [...archivedDays];

    // Apply date range filter
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(day => {
        const dayDate = new Date(day.startTime);
        dayDate.setHours(0, 0, 0, 0);
        return dayDate >= startDate;
      });
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(day => {
        const dayDate = new Date(day.startTime);
        return dayDate <= endDate;
      });
    }

    // Apply project filter
    if (filters.project) {
      filtered = filtered.filter(day =>
        day.tasks.some(task => task.project === filters.project)
      );
    }

    // Apply category filter
    if (filters.category) {
      filtered = filtered.filter(day =>
        day.tasks.some(task => task.category === filters.category)
      );
    }

    // Sort from newest to oldest
    return filtered.sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  }, [archivedDays, filters]);

  // Calculate summary stats based on filtered days
  const totalHoursWorked = filteredDays.reduce((sum, day) => sum + getHoursWorkedForDay(day), 0);
  const totalBillableHours = filteredDays.reduce((sum, day) => sum + getBillableHoursForDay(day), 0);
  const totalNonBillableHours = filteredDays.reduce((sum, day) => sum + getNonBillableHoursForDay(day), 0);
  const totalRevenue = filteredDays.reduce((sum, day) => sum + getRevenueForDay(day), 0);

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
        {filteredDays.length === 0 && archivedDays.length === 0 ? (
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
            {/* Filter Component */}
            <ArchiveFilter
              filters={filters}
              onFilterChange={setFilters}
              projects={projects}
              categories={categories}
            />

            {filteredDays.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <ArchiveIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <CardTitle className="mb-2">No Results Found</CardTitle>
                  <p className="text-gray-600 mb-4">
                    No archived days match your filter criteria.
                  </p>
                  <Button onClick={() => setFilters({ startDate: "", endDate: "", project: "", category: "" })}>
                    Reset Filters
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Summary Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 print:hidden">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-blue-600">
                        {filteredDays.length}
                      </div>
                      <div className="text-sm text-gray-600">
                        Days Shown
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
                  {filteredDays.map((day) => (
                    <ArchiveItem key={day.id} day={day} onEdit={handleEdit} />
                  ))}
                </div>
              </>
            )}
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
