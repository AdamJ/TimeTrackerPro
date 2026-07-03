import React from "react";
import { PlannedTaskStatus } from "@/contexts/TimeTrackingContext";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { KanbanColumn } from "@/components/KanbanColumn";

const COLUMNS: { status: PlannedTaskStatus; title: string }[] = [
  { status: "todo", title: "To Do" },
  { status: "in_progress", title: "In Progress" },
  { status: "blocked", title: "Blocked" },
  { status: "done", title: "Done" },
];

export const KanbanBoard: React.FC = () => {
  const { plannedTasks, isDayStarted, isDayStale } = useTimeTracking();

  const tasksByStatus = (status: PlannedTaskStatus) =>
    [...plannedTasks]
      .filter((t) => t.status === status)
      .sort(
        (a, b) =>
          a.priority - b.priority || a.createdAt.localeCompare(b.createdAt),
      );

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map(({ status, title }) => (
          <KanbanColumn
            key={status}
            status={status}
            title={title}
            tasks={tasksByStatus(status)}
            isDayStarted={isDayStarted}
            isDayStale={isDayStale}
          />
        ))}
      </div>
    </>
  );
};
