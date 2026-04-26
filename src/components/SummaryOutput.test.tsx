// src/components/SummaryOutput.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SummaryOutput from "@/components/SummaryOutput";

vi.mock("@/components/MarkdownDisplay", () => ({
	MarkdownDisplay: ({ content }: { content: string }) => (
		<div data-testid="markdown-display">{content}</div>
	),
}));

const defaultProps = {
	summary: "This is a **test** summary.",
	weekLabel: "Jan 11 – Jan 17, 2026",
	onUpdate: vi.fn(),
	onRegenerate: vi.fn(),
};

describe("SummaryOutput", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders a textarea in edit mode by default", () => {
		render(<SummaryOutput {...defaultProps} />);
		expect(screen.getByRole("textbox")).toBeInTheDocument();
		expect(screen.queryByTestId("markdown-display")).not.toBeInTheDocument();
	});

	it("switches to preview mode and renders MarkdownDisplay", () => {
		render(<SummaryOutput {...defaultProps} />);
		fireEvent.click(screen.getByRole("button", { name: /preview/i }));
		expect(screen.getByTestId("markdown-display")).toBeInTheDocument();
		expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
	});

	it("switches back to edit mode from preview", () => {
		render(<SummaryOutput {...defaultProps} />);
		fireEvent.click(screen.getByRole("button", { name: /preview/i }));
		fireEvent.click(screen.getByRole("button", { name: /^edit$/i }));
		expect(screen.getByRole("textbox")).toBeInTheDocument();
	});

	it("calls onUpdate when the textarea value changes", () => {
		render(<SummaryOutput {...defaultProps} />);
		fireEvent.change(screen.getByRole("textbox"), {
			target: { value: "updated text" },
		});
		expect(defaultProps.onUpdate).toHaveBeenCalledWith("updated text");
	});

	it("calls onRegenerate when the regenerate button is clicked", () => {
		render(<SummaryOutput {...defaultProps} />);
		fireEvent.click(screen.getByRole("button", { name: /regenerate/i }));
		expect(defaultProps.onRegenerate).toHaveBeenCalledTimes(1);
	});

	it("calls window.print when the print button is clicked", () => {
		const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
		render(<SummaryOutput {...defaultProps} />);
		fireEvent.click(screen.getByRole("button", { name: /print/i }));
		expect(printSpy).toHaveBeenCalledTimes(1);
		printSpy.mockRestore();
	});

	it("triggers a file download with a slugified filename when download button is clicked", () => {
		const createObjectURLSpy = vi
			.spyOn(URL, "createObjectURL")
			.mockReturnValue("blob:test");
		vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

		// Spy on createElement to capture the anchor's download attribute
		const anchors: HTMLAnchorElement[] = [];
		const originalCreate = document.createElement.bind(document);
		const createSpy = vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
			const el = originalCreate(tag);
			if (tag === "a") anchors.push(el as HTMLAnchorElement);
			return el;
		});

		render(<SummaryOutput {...defaultProps} />);
		fireEvent.click(screen.getByRole("button", { name: /download/i }));

		expect(createObjectURLSpy).toHaveBeenCalledWith(expect.any(Blob));
		expect(anchors.length).toBeGreaterThan(0);
		expect(anchors[0].download).toBe("summary-jan-11-jan-17-2026.txt");

		createObjectURLSpy.mockRestore();
		createSpy.mockRestore();
	});
});
