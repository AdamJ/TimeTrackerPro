import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { InitiativeSheet } from "./InitiativeSheet";

const addInitiativeMock = vi.fn(() => ({ id: "new-id" }));
const updateInitiativeMock = vi.fn();
const deleteInitiativeMock = vi.fn();
const restoreDeletedInitiativeMock = vi.fn();

vi.mock("@/hooks/useTimeTracking", () => ({
  useTimeTracking: () => ({
    addInitiative: addInitiativeMock,
    updateInitiative: updateInitiativeMock,
    deleteInitiative: deleteInitiativeMock,
    restoreDeletedInitiative: restoreDeletedInitiativeMock
  })
}));

const EXISTING_INITIATIVE = {
  id: "init-1", projectId: "proj-1", name: "Existing initiative", goal: "g",
  status: "not_started" as const, deadlineType: "date" as const, deadlineDate: "2099-01-01",
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z"
};

describe("InitiativeSheet", () => {
  it("renders the Add Initiative title in add mode", () => {
    render(<InitiativeSheet open onOpenChange={() => {}} mode="add" projectId="proj-1" />);
    expect(screen.getByText("Add Initiative")).toBeInTheDocument();
  });

  it("requires a name before submitting", async () => {
    render(<InitiativeSheet open onOpenChange={() => {}} mode="add" projectId="proj-1" />);
    fireEvent.click(screen.getByRole("button", { name: /add/i }));
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
    expect(addInitiativeMock).not.toHaveBeenCalled();
  });

  it("rejects a date deadline before today when adding", async () => {
    render(<InitiativeSheet open onOpenChange={() => {}} mode="add" projectId="proj-1" />);
    fireEvent.change(screen.getByLabelText(/^name/i), { target: { value: "Backdated" } });
    fireEvent.change(screen.getByLabelText(/deadline date/i), { target: { value: "2000-01-01" } });
    fireEvent.click(screen.getByRole("button", { name: /add/i }));
    await waitFor(() => {
      expect(screen.getByText(/deadline must be on or after/i)).toBeInTheDocument();
    });
    expect(addInitiativeMock).not.toHaveBeenCalled();
  });

  it("requires a deadline date when the deadline type is date", async () => {
    render(<InitiativeSheet open onOpenChange={() => {}} mode="add" projectId="proj-1" />);
    fireEvent.change(screen.getByLabelText(/^name/i), { target: { value: "No deadline date" } });
    fireEvent.click(screen.getByRole("button", { name: /add/i }));
    await waitFor(() => {
      expect(screen.getByText(/deadline date is required/i)).toBeInTheDocument();
    });
    expect(addInitiativeMock).not.toHaveBeenCalled();
  });

  it("requires both a quarter and a year when the deadline type is quarter", async () => {
    render(<InitiativeSheet open onOpenChange={() => {}} mode="add" projectId="proj-1" />);
    fireEvent.change(screen.getByLabelText(/^name/i), { target: { value: "Partial quarter" } });
    fireEvent.click(screen.getByRole("button", { name: /^quarter$/i }));
    fireEvent.change(screen.getByLabelText(/deadline year/i), { target: { value: "2027" } });
    fireEvent.click(screen.getByRole("button", { name: /add/i }));
    await waitFor(() => {
      expect(screen.getByText(/choose a quarter and a year/i)).toBeInTheDocument();
    });
    expect(addInitiativeMock).not.toHaveBeenCalled();
  });

  it("rejects a non-4-digit year for a quarter deadline", async () => {
    render(<InitiativeSheet open onOpenChange={() => {}} mode="add" projectId="proj-1" />);
    fireEvent.change(screen.getByLabelText(/^name/i), { target: { value: "Two digit year" } });
    fireEvent.click(screen.getByRole("button", { name: /^quarter$/i }));
    fireEvent.change(screen.getByLabelText(/deadline year/i), { target: { value: "27" } });
    fireEvent.click(screen.getByRole("button", { name: /add/i }));
    await waitFor(() => {
      expect(screen.getByText(/enter a 4-digit year/i)).toBeInTheDocument();
    });
    expect(addInitiativeMock).not.toHaveBeenCalled();
  });

  it("submits a valid date-deadline initiative", async () => {
    const onOpenChange = vi.fn();
    render(<InitiativeSheet open onOpenChange={onOpenChange} mode="add" projectId="proj-1" />);
    fireEvent.change(screen.getByLabelText(/^name/i), { target: { value: "Redesign onboarding" } });
    fireEvent.change(screen.getByLabelText(/goal/i), { target: { value: "Cut drop-off" } });
    fireEvent.change(screen.getByLabelText(/deadline date/i), { target: { value: "2099-12-15" } });
    fireEvent.click(screen.getByRole("button", { name: /add/i }));
    await waitFor(() => {
      expect(addInitiativeMock).toHaveBeenCalledWith(expect.objectContaining({
        projectId: "proj-1", name: "Redesign onboarding", deadlineType: "date", deadlineDate: "2099-12-15"
      }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("does not render a Delete button in add mode", () => {
    render(<InitiativeSheet open onOpenChange={() => {}} mode="add" projectId="proj-1" />);
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
  });

  it("deletes the initiative and closes the sheet when Delete is clicked in edit mode", () => {
    const onOpenChange = vi.fn();
    render(
      <InitiativeSheet
        open
        onOpenChange={onOpenChange}
        mode="edit"
        projectId="proj-1"
        initiative={EXISTING_INITIATIVE}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(deleteInitiativeMock).toHaveBeenCalledWith("init-1");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
