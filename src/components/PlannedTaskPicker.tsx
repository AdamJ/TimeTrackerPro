import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Play } from "lucide-react";

const MAX_VISIBLE = 5;

/**
 * Empty-day state for the Dashboard: lists planned tasks that can be started
 * right away so a day doesn't need a hand-typed first task. In-progress tasks
 * come first (resume), then to-do by priority.
 */
export const PlannedTaskPicker: React.FC = () => {
  const { plannedTasks, pullPlannedTaskToDay, addPlannedTaskToDay } = useTimeTracking();

  const candidates = useMemo(
    () =>
      plannedTasks
        .filter((t) => t.status === "in_progress" || t.status === "todo")
        .sort(
          (a, b) =>
            Number(b.status === "in_progress") - Number(a.status === "in_progress") ||
            a.priority - b.priority ||
            a.createdAt.localeCompare(b.createdAt),
        ),
    [plannedTasks],
  );
  const visible = candidates.slice(0, MAX_VISIBLE);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pick up a planned task</CardTitle>
        <CardDescription>
          Start from your task board, or use Add Task above for something new.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No planned tasks are ready to start.
          </p>
        ) : (
          <ul className="space-y-2">
            {visible.map((task) => {
              const resuming = task.status === "in_progress";
              return (
                <li
                  key={task.id}
                  className="flex items-center justify-between gap-2 rounded-lg border p-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    {task.project && (
                      <Badge variant="outline" className="mt-1 border-mauve-7 text-mauve-11">
                        <Briefcase className="w-2.5 h-2.5 inline mr-0.5" />
                        {task.project}
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={`${resuming ? "Resume" : "Start"} ${task.title}`}
                    onClick={() =>
                      resuming ? addPlannedTaskToDay(task.id) : pullPlannedTaskToDay(task.id)
                    }
                  >
                    <Play className="w-3 h-3 mr-1" />
                    {resuming ? "Resume" : "Start"}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        <Button asChild variant="link" size="sm" className="px-0">
          <Link to="/tasks">
            {candidates.length > MAX_VISIBLE
              ? `View all ${candidates.length} on the Task Board`
              : "Open the Task Board"}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};
