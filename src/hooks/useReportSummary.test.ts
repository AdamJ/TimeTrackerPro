import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useReportSummary, classifyGeminiError } from "@/hooks/useReportSummary";

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

describe("classifyGeminiError — ai-proxy string errors", () => {
	it("explains a rejected origin instead of blaming the API key", () => {
		expect(classifyGeminiError(403, { error: "Origin not allowed" }, null)).toBe(
			"AI summaries aren't available in this version of the app."
		);
	});

	it("asks guests to sign in", () => {
		expect(classifyGeminiError(401, { error: "Sign in required" }, null)).toBe(
			"Sign in to generate AI summaries."
		);
	});

	it("explains a missing server key", () => {
		expect(classifyGeminiError(503, { error: "AI service not configured" }, null)).toBe(
			"AI summaries aren't set up on this server yet."
		);
	});

	it("falls back to the raw proxy message for unknown errors", () => {
		expect(classifyGeminiError(400, { error: "Unsupported model" }, null)).toBe(
			"AI summary request failed: Unsupported model"
		);
	});

	it("still classifies structured Gemini errors", () => {
		expect(
			classifyGeminiError(403, { error: { status: "PERMISSION_DENIED" } }, null)
		).toContain("API key invalid");
	});
});
