import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useReportStorage } from "@/hooks/useReportStorage";

describe("useReportStorage", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("returns null when nothing is saved", () => {
		const { result } = renderHook(() =>
			useReportStorage("2026-01-11", "standup")
		);
		expect(result.current.saved).toBeNull();
	});

	it("saves and returns a summary entry", () => {
		const { result } = renderHook(() =>
			useReportStorage("2026-01-11", "standup")
		);
		act(() => {
			result.current.save("Hello world", "Jan 11 – Jan 17, 2026");
		});
		expect(result.current.saved?.text).toBe("Hello world");
		expect(result.current.saved?.weekLabel).toBe("Jan 11 – Jan 17, 2026");
		expect(result.current.saved?.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});

	it("clears a saved summary", () => {
		const { result } = renderHook(() =>
			useReportStorage("2026-01-11", "standup")
		);
		act(() => {
			result.current.save("Hello world", "Jan 11 – Jan 17, 2026");
		});
		act(() => {
			result.current.clear();
		});
		expect(result.current.saved).toBeNull();
	});

	it("returns null for a different tone when only standup is saved", () => {
		const { result: r1 } = renderHook(() =>
			useReportStorage("2026-01-11", "standup")
		);
		act(() => {
			r1.current.save("Standup text", "Jan 11 – Jan 17, 2026");
		});
		const { result: r2 } = renderHook(() =>
			useReportStorage("2026-01-11", "client")
		);
		expect(r2.current.saved).toBeNull();
	});

	it("reacts to weekKey change — returns null for new week with no data", () => {
		const { result, rerender } = renderHook(
			({ weekKey, tone }: { weekKey: string; tone: "standup" | "client" | "retrospective" }) =>
				useReportStorage(weekKey, tone),
			{ initialProps: { weekKey: "2026-01-11", tone: "standup" as const } }
		);
		act(() => {
			result.current.save("Week 1 text", "Jan 11 – Jan 17, 2026");
		});
		rerender({ weekKey: "2026-01-18", tone: "standup" });
		expect(result.current.saved).toBeNull();
	});

	it("save overwrites a previous entry for the same week+tone", () => {
		const { result } = renderHook(() =>
			useReportStorage("2026-01-11", "standup")
		);
		act(() => {
			result.current.save("First version", "Jan 11 – Jan 17, 2026");
		});
		act(() => {
			result.current.save("Second version", "Jan 11 – Jan 17, 2026");
		});
		expect(result.current.saved?.text).toBe("Second version");
	});
});
