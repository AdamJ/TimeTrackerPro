import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InitiativeTimeline } from "./InitiativeTimeline";
import type { Initiative } from "@/contexts/TimeTrackingContext";

const make = (overrides: Partial<Initiative>): Initiative => ({
  id: "i1", projectId: "p1", name: "Initiative", goal: "g",
  status: "not_started", deadlineType: "date", deadlineDate: "2026-12-15",
  createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z",
  ...overrides
});

describe("InitiativeTimeline", () => {
  it("renders an empty state with no initiatives", () => {
    render(<InitiativeTimeline initiatives={[]} onSelect={vi.fn()} />);
    expect(screen.getByText(/no initiatives yet/i)).toBeInTheDocument();
  });

  it("groups initiatives into their status swimlanes", () => {
    render(<InitiativeTimeline initiatives={[
      make({ id: "a", name: "A", status: "in_progress" }),
      make({ id: "b", name: "B", status: "blocked" })
    ]} onSelect={vi.fn()} />);

    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByText("Blocked")).toBeInTheDocument();
    expect(screen.queryByText("Done")).not.toBeInTheDocument();
  });

  it("renders a bar for a quarter-deadline initiative using its resolved end date", () => {
    render(<InitiativeTimeline initiatives={[
      make({ id: "q", name: "Quarter one", deadlineType: "quarter", deadlineDate: undefined,
             deadlineQuarter: 1, deadlineYear: 2027 })
    ]} onSelect={vi.fn()} />);
    // deadline shown as a formatted label somewhere in the row
    expect(screen.getByText(/q1 2027/i)).toBeInTheDocument();
  });

  it("offsets the Today line past the fixed name column instead of the whole row width", () => {
    // Regression: the line's `left` was a bare percentage of the full row,
    // but the bar track only starts after the w-48 (12rem) name column.
    const { container } = render(<InitiativeTimeline initiatives={[make({})]} onSelect={vi.fn()} />);
    const todayLine = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(todayLine.style.left).toContain("12rem");
  });

  it("renders a month-scale header spanning the timeline window", () => {
    render(<InitiativeTimeline initiatives={[make({})]} onSelect={vi.fn()} />);
    const currentMonthLabel = new Date().toLocaleDateString("en-US", { month: "short" });
    expect(screen.getByText(currentMonthLabel)).toBeInTheDocument();
  });

  it("collapses a swimlane's rows when its header is clicked, and restores them on a second click", () => {
    render(<InitiativeTimeline initiatives={[
      make({ id: "a", name: "Collapsible row", status: "in_progress" })
    ]} onSelect={vi.fn()} />);

    expect(screen.getByText("Collapsible row")).toBeInTheDocument();

    fireEvent.click(screen.getByText("In progress"));
    expect(screen.queryByText("Collapsible row")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("In progress"));
    expect(screen.getByText("Collapsible row")).toBeInTheDocument();
  });

  it("calls onSelect when a bar is clicked", () => {
    const onSelect = vi.fn();
    const initiative = make({ id: "a", name: "Clickable" });
    render(<InitiativeTimeline initiatives={[initiative]} onSelect={onSelect} />);
    screen.getByText("Clickable").click();
    expect(onSelect).toHaveBeenCalledWith(initiative);
  });

  it("calls onSelect when a row is activated with the keyboard", () => {
    const onSelect = vi.fn();
    const initiative = make({ id: "a", name: "Keyboard row" });
    render(<InitiativeTimeline initiatives={[initiative]} onSelect={onSelect} />);
    const row = screen.getByRole("button", { name: /Keyboard row/ });
    fireEvent.keyDown(row, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith(initiative);
  });
});
