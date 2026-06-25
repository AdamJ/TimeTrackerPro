// src/components/SummaryOutput.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

	describe("share / copy button", () => {
		afterEach(() => {
			delete (navigator as unknown as { share?: unknown }).share;
		});

		it("renders a Share button and calls navigator.share when the Web Share API is available", () => {
			const shareMock = vi.fn().mockResolvedValue(undefined);
			Object.defineProperty(navigator, "share", { value: shareMock, configurable: true });

			render(<SummaryOutput {...defaultProps} />);
			expect(screen.queryByRole("button", { name: /^copy$/i })).not.toBeInTheDocument();
			fireEvent.click(screen.getByRole("button", { name: /^share$/i }));

			expect(shareMock).toHaveBeenCalledWith({
				title: `Summary — ${defaultProps.weekLabel}`,
				text: defaultProps.summary,
			});
		});

		it("falls back to clipboard copy when the Web Share API is unavailable", async () => {
			delete (navigator as unknown as { share?: unknown }).share;
			const writeTextMock = vi.fn().mockResolvedValue(undefined);
			Object.defineProperty(navigator, "clipboard", {
				value: { writeText: writeTextMock },
				configurable: true,
			});

			render(<SummaryOutput {...defaultProps} />);
			expect(screen.queryByRole("button", { name: /^share$/i })).not.toBeInTheDocument();
			fireEvent.click(screen.getByRole("button", { name: /^copy$/i }));

			await waitFor(() => expect(writeTextMock).toHaveBeenCalledWith(defaultProps.summary));
			expect(await screen.findByText(/copied/i)).toBeInTheDocument();
		});

		it("falls back to clipboard copy when navigator.share rejects with a non-abort error", async () => {
			const shareMock = vi.fn().mockRejectedValue(new Error("share failed"));
			Object.defineProperty(navigator, "share", { value: shareMock, configurable: true });
			const writeTextMock = vi.fn().mockResolvedValue(undefined);
			Object.defineProperty(navigator, "clipboard", {
				value: { writeText: writeTextMock },
				configurable: true,
			});

			render(<SummaryOutput {...defaultProps} />);
			fireEvent.click(screen.getByRole("button", { name: /^share$/i }));

			await waitFor(() => expect(writeTextMock).toHaveBeenCalledWith(defaultProps.summary));
		});

		it("does not fall back to clipboard copy when the user cancels the native share sheet", async () => {
			const abortError = new DOMException("cancelled", "AbortError");
			const shareMock = vi.fn().mockRejectedValue(abortError);
			Object.defineProperty(navigator, "share", { value: shareMock, configurable: true });
			const writeTextMock = vi.fn().mockResolvedValue(undefined);
			Object.defineProperty(navigator, "clipboard", {
				value: { writeText: writeTextMock },
				configurable: true,
			});

			render(<SummaryOutput {...defaultProps} />);
			fireEvent.click(screen.getByRole("button", { name: /^share$/i }));

			await waitFor(() => expect(shareMock).toHaveBeenCalledTimes(1));
			expect(writeTextMock).not.toHaveBeenCalled();
		});
	});
});
