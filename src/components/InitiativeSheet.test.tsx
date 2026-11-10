import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { InitiativeSheet } from "./InitiativeSheet";
import { toLocalDateString } from "@/utils/initiativeUtils";

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
    fireEvent.change(screen.getByLabelText(/deadline date/i), { target: { value: "" } });
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

  it("pre-fills the deadline date with today's local date in add mode", () => {
    render(<InitiativeSheet open onOpenChange={() => {}} mode="add" projectId="proj-1" />);
    const input = screen.getByLabelText(/deadline date/i) as HTMLInputElement;
    expect(input.value).toBe(toLocalDateString(new Date()));
  });

  it("pre-fills the quarter deadline year with the current year, leaving the quarter unset", () => {
    render(<InitiativeSheet open onOpenChange={() => {}} mode="add" projectId="proj-1" />);
    fireEvent.click(screen.getByRole("button", { name: /^quarter$/i }));
    const year = screen.getByLabelText(/deadline year/i) as HTMLInputElement;
    expect(year.value).toBe(String(new Date().getFullYear()));
  });

  it("leaves the optional start date blank by default", () => {
    render(<InitiativeSheet open onOpenChange={() => {}} mode="add" projectId="proj-1" />);
    expect((screen.getByLabelText(/start date/i) as HTMLInputElement).value).toBe("");
  });

  it("submits with only a name when the pre-filled deadline date is accepted", async () => {
    addInitiativeMock.mockClear();
    render(<InitiativeSheet open onOpenChange={() => {}} mode="add" projectId="proj-1" />);
    fireEvent.change(screen.getByLabelText(/^name/i), { target: { value: "Defaults only" } });
    fireEvent.click(screen.getByRole("button", { name: /add/i }));
    await waitFor(() => {
      expect(addInitiativeMock).toHaveBeenCalledWith(expect.objectContaining({
        deadlineType: "date", deadlineDate: toLocalDateString(new Date())
      }));
    });
  });

  it("keeps an existing initiative's saved deadline instead of the defaults in edit mode", () => {
    render(
      <InitiativeSheet open onOpenChange={() => {}} mode="edit" projectId="proj-1" initiative={EXISTING_INITIATIVE} />
    );
    expect((screen.getByLabelText(/deadline date/i) as HTMLInputElement).value).toBe("2099-01-01");
  });

  it("submits an optional start date alongside the deadline", async () => {
    render(<InitiativeSheet open onOpenChange={() => {}} mode="add" projectId="proj-1" />);
    fireEvent.change(screen.getByLabelText(/^name/i), { target: { value: "With start" } });
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: "2099-11-01" } });
    fireEvent.change(screen.getByLabelText(/deadline date/i), { target: { value: "2099-12-15" } });
    fireEvent.click(screen.getByRole("button", { name: /add/i }));
    await waitFor(() => {
      expect(addInitiativeMock).toHaveBeenCalledWith(expect.objectContaining({
        startDate: "2099-11-01", deadlineDate: "2099-12-15"
      }));
    });
  });

  it("leaves startDate undefined when the start date is left blank", async () => {
    addInitiativeMock.mockClear();
    render(<InitiativeSheet open onOpenChange={() => {}} mode="add" projectId="proj-1" />);
    fireEvent.change(screen.getByLabelText(/^name/i), { target: { value: "No start" } });
    fireEvent.change(screen.getByLabelText(/deadline date/i), { target: { value: "2099-12-15" } });
    fireEvent.click(screen.getByRole("button", { name: /add/i }));
    await waitFor(() => expect(addInitiativeMock).toHaveBeenCalled());
    expect(addInitiativeMock.mock.calls[0][0]).toEqual(expect.objectContaining({ startDate: undefined }));
  });

  it("rejects a deadline before the start date", async () => {
    addInitiativeMock.mockClear();
    render(<InitiativeSheet open onOpenChange={() => {}} mode="add" projectId="proj-1" />);
    fireEvent.change(screen.getByLabelText(/^name/i), { target: { value: "Inverted" } });
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: "2099-12-15" } });
    fireEvent.change(screen.getByLabelText(/deadline date/i), { target: { value: "2099-11-01" } });
    fireEvent.click(screen.getByRole("button", { name: /add/i }));
    await waitFor(() => {
      expect(screen.getByText(/deadline must be on or after the start date/i)).toBeInTheDocument();
    });
    expect(addInitiativeMock).not.toHaveBeenCalled();
  });

  it("allows a backdated start and deadline, since an explicit start supersedes the creation floor", async () => {
    addInitiativeMock.mockClear();
    render(<InitiativeSheet open onOpenChange={() => {}} mode="add" projectId="proj-1" />);
    fireEvent.change(screen.getByLabelText(/^name/i), { target: { value: "Past work" } });
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: "2000-01-01" } });
    fireEvent.change(screen.getByLabelText(/deadline date/i), { target: { value: "2000-02-01" } });
    fireEvent.click(screen.getByRole("button", { name: /add/i }));
    await waitFor(() => {
      expect(addInitiativeMock).toHaveBeenCalledWith(expect.objectContaining({
        startDate: "2000-01-01", deadlineDate: "2000-02-01"
      }));
    });
  });

  it("pre-fills the start date in edit mode and clears it when emptied", async () => {
    updateInitiativeMock.mockClear();
    render(
      <InitiativeSheet
        open
        onOpenChange={() => {}}
        mode="edit"
        projectId="proj-1"
        initiative={{ ...EXISTING_INITIATIVE, startDate: "2098-06-01" }}
      />
    );
    const input = screen.getByLabelText(/start date/i) as HTMLInputElement;
    expect(input.value).toBe("2098-06-01");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => {
      expect(updateInitiativeMock).toHaveBeenCalledWith("init-1", expect.objectContaining({ startDate: undefined }));
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
