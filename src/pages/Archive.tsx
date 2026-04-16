import React, { useState, useMemo } from 'react';
import {
  TimeTrackingProvider,
  DayRecord
} from '@/contexts/TimeTrackingContext';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import {
  getHoursWorkedForDay as calcHoursWorked,
  getBillableHoursForDay as calcBillableHours,
  getNonBillableHoursForDay as calcNonBillableHours,
  getRevenueForDay as calcRevenue
} from '@/utils/calculationUtils';
import { ArchiveItem } from '@/components/ArchiveItem';
import { ArchiveEditDialog } from '@/components/ArchiveEditDialog';
import { ExportDialog } from '@/components/ExportDialog';
import { ProjectManagement } from '@/components/ProjectManagement';
import { ArchiveFilter, ArchiveFilterState } from '@/components/ArchiveFilter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Flex } from '@radix-ui/themes';
import { Badge } from '@/components/ui/badge';
import { Archive as ArchiveIcon, Database } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PageLayout } from "@/components/PageLayout";

const ArchiveContent: React.FC = () => {
  const {
    archivedDays,
    projects,
    categories
  } = useTimeTracking();
  const [editingDay, setEditingDay] = useState<DayRecord | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showProjectManagement, setShowProjectManagement] = useState(false);
  const [filters, setFilters] = useState<ArchiveFilterState>({
    startDate: '',
    endDate: '',
    project: '',
    category: ''
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
      (a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  }, [archivedDays, filters]);

  // Calculate summary stats based on filtered days — memoized so they only
  // recompute when filteredDays, projects, or categories actually change.
  const { totalHoursWorked, totalBillableHours, totalNonBillableHours, totalRevenue } = useMemo(() => ({
    totalHoursWorked: filteredDays.reduce((sum, day) => sum + calcHoursWorked(day), 0),
    totalBillableHours: filteredDays.reduce((sum, day) => sum + calcBillableHours(day, projects, categories), 0),
    totalNonBillableHours: filteredDays.reduce((sum, day) => sum + calcNonBillableHours(day, projects, categories), 0),
    totalRevenue: filteredDays.reduce((sum, day) => sum + calcRevenue(day, projects, categories), 0)
  }), [filteredDays, projects, categories]);

  const handleEdit = (day: DayRecord) => {
    setEditingDay(day);
  };

  const handleCloseEdit = () => {
    setEditingDay(null);
  };

  const { user, isAuthenticated } = useAuth();

  return (
    <PageLayout
      title={
        <>
          <span>Archive</span>
          {isAuthenticated && user?.email && (
            <span className="hidden md:block text-base font-normal text-muted-foreground">
              for {user.email}
            </span>
          )}
        </>
      }
      icon={<ArchiveIcon className="w-6 h-6" />}
    >
      <div className="max-w-6xl mx-auto p-6 print:p-2">
        {filteredDays.length === 0 && archivedDays.length === 0 ? (
          <Card className="text-center py-12 print:hidden">
            <CardContent>
              <ArchiveIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <CardTitle className="mb-2">No Archived Days</CardTitle>
              <p className="text-muted-foreground mb-4">
                Complete and post your first day to see it in the archive.
              </p>
              <Link to="/">
                <Button>Start Tracking Time</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4 md:space-y-6 print:space-y-0">
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
                  <ArchiveIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <CardTitle className="mb-2">No Results Found</CardTitle>
                  <p className="text-muted-foreground mb-4">
                    No archived days match your filter criteria.
                  </p>
                  <Button
                    onClick={() =>
                      setFilters({
                        startDate: '',
                        endDate: '',
                        project: '',
                        category: ''
                      })
                    }
                  >
                    Reset Filters
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Summary Stats */}
                <div className="d-flex md:hidden">
                  <Flex gap="2" wrap="wrap" justify="between">
                    <Badge variant="secondary" color="indigo">
                      {filteredDays.length} days
                    </Badge>
                    <Badge variant="default" color="green">
                      {totalBillableHours.toFixed(1)}h billable
                    </Badge>
                    <Badge variant="default" color="gray">
                      {totalNonBillableHours.toFixed(1)}h non-billable
                    </Badge>
                    <Badge variant="default" color="purple">
                      ${totalRevenue.toFixed(2)} revenue
                    </Badge>
                  </Flex>
                </div>
                <div className="hidden md:grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 print:hidden">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-primary">
                        {filteredDays.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Days Shown</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-chart-2">
                        {totalBillableHours.toFixed(1)}h
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Billable Hours
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-muted-foreground">
                        {totalNonBillableHours.toFixed(1)}h
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Non-billable Hours
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {totalHoursWorked.toFixed(1)}h total work
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-chart-4">
                        ${totalRevenue.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Revenue</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-chart-5">
                        $
                        {totalBillableHours > 0
                          ? (totalRevenue / totalBillableHours).toFixed(2)
                          : '0.00'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Avg Billable Rate
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Archived Days */}
                <div className="space-y-4">
                  {filteredDays.map(day => (
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
    </PageLayout>
  );
};

const Archive: React.FC = () => {
  return <ArchiveContent />;
};

export default Archive;
