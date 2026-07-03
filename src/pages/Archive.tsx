import React, { useState, useMemo, useCallback } from "react";
import {
  TimeTrackingProvider,
  DayRecord
} from "@/contexts/TimeTrackingContext";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { getDayStats } from "@/utils/calculationUtils";
import { ArchiveItem } from "@/components/ArchiveItem";
import { ArchiveEditDialog } from "@/components/ArchiveEditDialog";
import { BackdatedEntryDialog } from "@/components/BackdatedEntryDialog";
import { ExportDialog } from "@/components/ExportDialog";
import { ArchiveFilter, ArchiveFilterState } from "@/components/ArchiveFilter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Archive as ArchiveIcon, Database, CirclePlus } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { PageLayout } from "@/components/PageLayout";

const ArchiveContent: React.FC = () => {
  const {
    archivedDays,
    projects,
    categories
  } = useTimeTracking();
  const [editingDay, setEditingDay] = useState<DayRecord | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showBackdatedEntry, setShowBackdatedEntry] = useState(false);
  const [filters, setFilters] = useState<ArchiveFilterState>({
    startDate: "",
    endDate: "",
    project: "",
    category: ""
  });

  const filteredDays = useMemo(() => {
    let filtered = [...archivedDays];

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

    if (filters.project) {
      filtered = filtered.filter(day =>
        day.tasks.some(task => task.project === filters.project)
      );
    }

    if (filters.category) {
      filtered = filtered.filter(day =>
        day.tasks.some(task => task.category === filters.category)
      );
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  }, [archivedDays, filters]);

  const { totalHoursWorked, totalBillableHours, totalNonBillableHours, totalRevenue } = useMemo(() => {
    const projectMap = new Map(projects.map(p => [p.name, p]));
    const categoryMap = new Map(categories.map(c => [c.id, c]));
    return filteredDays.reduce(
      (acc, day) => {
        const stats = getDayStats(day, projectMap, categoryMap);
        return {
          totalHoursWorked: acc.totalHoursWorked + stats.hoursWorked,
          totalBillableHours: acc.totalBillableHours + stats.billableHours,
          totalNonBillableHours: acc.totalNonBillableHours + stats.nonBillableHours,
          totalRevenue: acc.totalRevenue + stats.revenue
        };
      },
      { totalHoursWorked: 0, totalBillableHours: 0, totalNonBillableHours: 0, totalRevenue: 0 }
    );
  }, [filteredDays, projects, categories]);

  const handleEdit = (day: DayRecord) => {
    setEditingDay(day);
  };

  const handleCloseEdit = () => {
    setEditingDay(null);
  };

  const { user, isAuthenticated } = useAuth();

  const pageTitle = useMemo(() => <span>Archive</span>, []);
  const pageBadge = useMemo(
    () => <Badge variant="outline">{archivedDays.length}</Badge>,
    [archivedDays.length]
  );
  const openBackdatedEntry = useCallback(() => setShowBackdatedEntry(true), []);
  const pageActions = useMemo(
    () => (
      <Button onClick={openBackdatedEntry} size="sm" variant="outline">
        <CirclePlus className="w-4 h-4 mr-2" />
        Add Past Entry
      </Button>
    ),
    [openBackdatedEntry]
  );

  return (
    <PageLayout
      title={pageTitle}
      badge={pageBadge}
      actions={pageActions}
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
                        startDate: "",
                        endDate: "",
                        project: "",
                        category: ""
                      })
                    }
                  >
                    Reset Filters
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex md:hidden">
                  <div className="flex gap-2 flex-wrap justify-between">
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
                  </div>
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
                          : "0.00"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Avg Billable Rate
                      </div>
                    </CardContent>
                  </Card>
                </div>

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

      <BackdatedEntryDialog
        isOpen={showBackdatedEntry}
        onClose={() => setShowBackdatedEntry(false)}
      />

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
    </PageLayout>
  );
};

const Archive: React.FC = () => {
  return <ArchiveContent />;
};

export default Archive;
