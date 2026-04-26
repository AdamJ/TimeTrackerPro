import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useReportSummary } from "@/hooks/useReportSummary";

vi.mock("@/lib/supabase", () => ({
	supabase: {
		functions: {
			invoke: vi.fn(),
		},
	},
}));

describe("useReportSummary — load()", () => {
	it("sets state to success and populates summary text", () => {
		const { result } = renderHook(() => useReportSummary());
		expect(result.current.state).toBe("idle");

		act(() => {
			result.current.load("Restored summary text");
		});

		expect(result.current.state).toBe("success");
		expect(result.current.summary).toBe("Restored summary text");
		expect(result.current.error).toBeNull();
	});
});
