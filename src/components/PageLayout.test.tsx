import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageLayout } from "@/components/PageLayout";
import { BriefcaseIcon } from "lucide-react";

vi.mock("@/components/Navigation", () => ({
	default: () => <nav data-testid="site-nav" />,
}));

describe("PageLayout", () => {
	it("renders nav and children", () => {
		render(<PageLayout><p>content</p></PageLayout>);
		expect(screen.getByTestId("site-nav")).toBeInTheDocument();
		expect(screen.getByText("content")).toBeInTheDocument();
	});

	it("renders h1 with title when title is provided", () => {
		render(<PageLayout title="Settings"><p>x</p></PageLayout>);
		expect(screen.getByRole("heading", { name: /settings/i })).toBeInTheDocument();
	});

	it("renders icon alongside title", () => {
		render(
			<PageLayout title="Projects" icon={<BriefcaseIcon data-testid="icon" />}>
				<p>x</p>
			</PageLayout>
		);
		expect(screen.getByTestId("icon")).toBeInTheDocument();
	});

	it("renders actions when title is provided", () => {
		render(
			<PageLayout title="Projects" actions={<button>Add</button>}>
				<p>x</p>
			</PageLayout>
		);
		expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
	});

	it("renders description when title is provided", () => {
		render(
			<PageLayout title="Report" description="Weekly summary">
				<p>x</p>
			</PageLayout>
		);
		expect(screen.getByText("Weekly summary")).toBeInTheDocument();
	});

	it("does not render h1 when title is omitted", () => {
		render(<PageLayout><p>content</p></PageLayout>);
		expect(screen.queryByRole("heading")).not.toBeInTheDocument();
	});

	it("renders children directly after nav when title is omitted", () => {
		render(<PageLayout><div data-testid="inner">content</div></PageLayout>);
		expect(screen.getByTestId("inner")).toBeInTheDocument();
	});

	it("supports ReactNode title (e.g. title with conditional suffix)", () => {
		render(
			<PageLayout title={<><span>Archive</span><span>for user@example.com</span></>}>
				<p>x</p>
			</PageLayout>
		);
		expect(screen.getByText("Archive")).toBeInTheDocument();
		expect(screen.getByText("for user@example.com")).toBeInTheDocument();
	});
});
