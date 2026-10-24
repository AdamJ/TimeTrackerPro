import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ProjectPlanning from "./ProjectPlanning";

const mockSetTitle = vi.fn();

const mockUseTimeTracking = vi.fn(() => ({
  projects: [{ id: "proj-1", name: "Product and Design", client: "Acme" }],
  initiatives: [],
  loading: false
}));

vi.mock("@/hooks/useTimeTracking", () => ({
  useTimeTracking: () => mockUseTimeTracking()
}));
vi.mock("@/hooks/usePageTitle", () => ({
  usePageTitle: () => ({
    title: null,
    actions: null,
    badge: null,
    setTitle: mockSetTitle,
    setActions: vi.fn(),
    setBadge: vi.fn(),
  }),
}));
vi.mock("@/components/InitiativeTimeline", () => ({
  InitiativeTimeline: () => <div>timeline</div>
}));

const renderAt = (id: string) =>
  render(
    <MemoryRouter initialEntries={[`/projects/${id}/planning`]}>
      <Routes>
        <Route path="/projects/:id/planning" element={<ProjectPlanning />} />
      </Routes>
    </MemoryRouter>
  );

describe("ProjectPlanning", () => {
  it("renders the project's name and the timeline for a valid id", () => {
    renderAt("proj-1");
    expect(mockSetTitle).toHaveBeenCalledWith("Product and Design");
    expect(screen.getByText("timeline")).toBeInTheDocument();
  });

  it("shows a not-found state for an id with no matching project", () => {
    renderAt("missing-id");
    expect(screen.getByText(/project not found/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /projects/i })).toHaveAttribute("href", "/projectlist");
  });

  it("shows a loading state instead of a premature not-found while data is still loading", () => {
    mockUseTimeTracking.mockReturnValueOnce({
      projects: [],
      initiatives: [],
      loading: true
    });
    renderAt("proj-1");
    expect(screen.queryByText(/project not found/i)).not.toBeInTheDocument();
  });
});
