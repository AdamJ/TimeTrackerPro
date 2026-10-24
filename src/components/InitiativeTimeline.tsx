import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Initiative, InitiativeStatus } from "@/contexts/TimeTrackingContext";
import { resolveInitiativeDeadline } from "@/utils/initiativeUtils";

interface InitiativeTimelineProps {
  initiatives: Initiative[];
  onSelect: (initiative: Initiative) => void;
}

const STATUS_ORDER: InitiativeStatus[] = ["in_progress", "not_started", "blocked", "done"];

const STATUS_LABELS: Record<InitiativeStatus, string> = {
  in_progress: "In progress",
  not_started: "Not started",
  blocked: "Blocked",
  done: "Done",
};

// CSS var references, not Tailwind classes: this project's Tailwind theme
// (src/index.css) never wires up a Radix 1-12 color scale, so bg-blue-9 /
// bg-green-9 / etc. match no generated utility and render fully transparent.
// --chart-1..5 are real tokens defined in that file for exactly this kind
// of categorical use, just without matching Tailwind utility classes.
const STATUS_BAR_COLOR: Record<InitiativeStatus, string> = {
  in_progress: "var(--chart-1)",
  done: "var(--chart-4)",
  blocked: "var(--destructive)",
  not_started: "var(--chart-5)",
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const TRACK_OFFSET = "12rem"; // matches the w-48 fixed name column

function formatDeadlineLabel(initiative: Initiative): string {
  if (initiative.deadlineType === "quarter" && initiative.deadlineQuarter && initiative.deadlineYear) {
    return `Q${initiative.deadlineQuarter} ${initiative.deadlineYear}`;
  }
  const deadline = resolveInitiativeDeadline(initiative);
  if (!deadline) return "No deadline";
  return deadline.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export const InitiativeTimeline: React.FC<InitiativeTimelineProps> = ({ initiatives, onSelect }) => {
  const [collapsed, setCollapsed] = useState<Set<InitiativeStatus>>(new Set());

  if (initiatives.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No initiatives yet.
      </div>
    );
  }

  const today = new Date();
  const windowStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const windowEnd = new Date(today.getFullYear(), today.getMonth() + 5, 0);
  const windowMs = windowEnd.getTime() - windowStart.getTime();

  const toPercent = (date: Date) => {
    const clamped = Math.min(Math.max(date.getTime(), windowStart.getTime()), windowEnd.getTime());
    return ((clamped - windowStart.getTime()) / windowMs) * 100;
  };

  const trackLeft = (percent: number) => `calc(${TRACK_OFFSET} + (100% - ${TRACK_OFFSET}) * ${percent / 100})`;

  const todayPercent = toPercent(today);

  const months: { label: string; percent: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const monthDate = new Date(windowStart.getFullYear(), windowStart.getMonth() + i, 1);
    months.push({
      label: monthDate.toLocaleDateString("en-US", { month: "short" }),
      percent: toPercent(monthDate),
    });
  }

  const groups = STATUS_ORDER
    .map((status) => ({ status, items: initiatives.filter((i) => i.status === status) }))
    .filter((group) => group.items.length > 0);

  const toggleCollapsed = (status: InitiativeStatus) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  return (
    <div className="relative">
      <div className="relative h-6 text-xs text-muted-foreground border-b mb-2">
        {months.map((month, i) => (
          <div key={i} className="absolute" style={{ left: trackLeft(month.percent) }}>
            {month.label}
          </div>
        ))}
      </div>
      <div className="relative">
        <div
          className="absolute top-0 bottom-0 w-px bg-red-9 z-10"
          style={{ left: trackLeft(todayPercent) }}
          aria-hidden="true"
        />
        {groups.map(({ status, items }) => {
          const isCollapsed = collapsed.has(status);
          return (
            <div key={status} className="mb-4">
              <button
                type="button"
                className="flex items-center gap-1 text-sm font-medium px-2 py-1 bg-mauve-2 w-full text-left"
                onClick={() => toggleCollapsed(status)}
                aria-expanded={!isCollapsed}
              >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {STATUS_LABELS[status]} <span className="text-muted-foreground">{items.length}</span>
              </button>
              {!isCollapsed && items.map((initiative) => {
                const start = new Date(initiative.createdAt);
                const deadline = resolveInitiativeDeadline(initiative) ?? new Date(start.getTime() + MS_PER_DAY);
                const left = toPercent(start);
                const right = toPercent(deadline);
                const width = Math.max(right - left, 1);

                return (
                  <div
                    key={initiative.id}
                    role="button"
                    tabIndex={0}
                    className="flex items-center py-2 cursor-pointer"
                    onClick={() => onSelect(initiative)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(initiative);
                      }
                    }}
                  >
                    <div className="w-48 shrink-0 text-sm">{initiative.name}</div>
                    <div className="relative flex-1 h-6">
                      <div
                        className="absolute h-6 rounded text-primary-foreground text-xs flex items-center px-2 whitespace-nowrap overflow-hidden"
                        style={{ left: `${left}%`, width: `${width}%`, backgroundColor: STATUS_BAR_COLOR[status] }}
                      >
                        {initiative.name} · {formatDeadlineLabel(initiative)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
