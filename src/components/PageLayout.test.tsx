import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageLayout } from "@/components/PageLayout";
import { BriefcaseIcon } from "lucide-react";

const mockSetTitle = vi.fn();
const mockSetActions = vi.fn();
const mockSetBadge = vi.fn();

vi.mock("@/hooks/usePageTitle", () => ({
  usePageTitle: () => ({
    title: null,
    actions: null,
    badge: null,
    setTitle: mockSetTitle,
    setActions: mockSetActions,
    setBadge: mockSetBadge,
  }),
}));

describe("PageLayout", () => {
  beforeEach(() => {
    mockSetTitle.mockClear();
    mockSetActions.mockClear();
    mockSetBadge.mockClear();
  });

  it("renders children", () => {
    render(<PageLayout><p>content</p></PageLayout>);
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("calls setTitle with title on mount", () => {
    render(<PageLayout title="Settings"><p>x</p></PageLayout>);
    expect(mockSetTitle).toHaveBeenCalledWith("Settings");
  });

  it("calls setActions with actions on mount", () => {
    const btn = <button>Add</button>;
    render(<PageLayout title="Projects" actions={btn}><p>x</p></PageLayout>);
    expect(mockSetActions).toHaveBeenCalledWith(btn);
  });

  it("accepts icon prop without error", () => {
    expect(() =>
      render(
        <PageLayout title="Projects" icon={<BriefcaseIcon data-testid="icon" />}>
          <p>x</p>
        </PageLayout>
      )
    ).not.toThrow();
  });

  it("accepts description prop without error", () => {
    expect(() =>
      render(<PageLayout title="Report" description="Weekly summary"><p>x</p></PageLayout>)
    ).not.toThrow();
  });

  it("accepts ReactNode title", () => {
    const title = <><span>Archive</span><span>for user@example.com</span></>;
    render(<PageLayout title={title}><p>x</p></PageLayout>);
    expect(mockSetTitle).toHaveBeenCalledWith(title);
  });

  it("calls setTitle(null) when title is omitted", () => {
    render(<PageLayout><p>content</p></PageLayout>);
    expect(mockSetTitle).toHaveBeenCalledWith(null);
  });

  it("does not render inline heading or navigation", () => {
    render(<PageLayout title="Settings"><p>x</p></PageLayout>);
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});
