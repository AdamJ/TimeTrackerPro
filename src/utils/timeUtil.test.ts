import { describe, it, expect } from "vitest";
import { formatDuration, formatDate, formatTime, formatHoursDecimal } from "./timeUtil";

describe("timeUtil", () => {
	describe("formatDuration", () => {
		it("should format duration in milliseconds to H:MM format", () => {
			// 1 hour = 3,600,000 ms
			expect(formatDuration(3600000)).toBe("1:00");

			// 1.5 hours = 5,400,000 ms
			expect(formatDuration(5400000)).toBe("1:30");

			// 30 minutes = 1,800,000 ms
			expect(formatDuration(1800000)).toBe("30:00");

			// 2 hours 45 minutes = 9,900,000 ms
			expect(formatDuration(9900000)).toBe("2:45");

			// 0 duration
			expect(formatDuration(0)).toBe("0:00");
		});

		it("should handle negative durations as zero", () => {
			// Negative durations are treated as 0
			expect(formatDuration(-3600000)).toBe("0:00");
		});

		it("should round partial minutes correctly", () => {
			// 1 hour 30 minutes 30 seconds
			expect(formatDuration(5430000)).toBe("1:30");

			// 1 hour 30 minutes 59 seconds (should still be 1:30)
			expect(formatDuration(5459000)).toBe("1:30");
		});
	});

	describe("formatHoursDecimal", () => {
		it("should convert milliseconds to decimal hours", () => {
			// 1 hour = 3,600,000 ms
			expect(formatHoursDecimal(3600000)).toBe(1.00);

			// 1.5 hours = 5,400,000 ms
			expect(formatHoursDecimal(5400000)).toBe(1.5);

			// 30 minutes = 0.5 hours
			expect(formatHoursDecimal(1800000)).toBe(0.5);
		});
	});

	describe("formatDate", () => {
		it("should format date objects correctly", () => {
			const date = new Date("2024-12-03T10:00:00.000Z");
			const formatted = formatDate(date);

			// Format should be locale-dependent, but we can check it's not empty
			expect(formatted).toBeTruthy();
			expect(typeof formatted).toBe("string");
		});

		it("should handle different dates", () => {
			const date1 = new Date("2024-01-01T00:00:00.000Z");
			const date2 = new Date("2024-12-31T23:59:59.000Z");

			expect(formatDate(date1)).toBeTruthy();
			expect(formatDate(date2)).toBeTruthy();
			expect(formatDate(date1)).not.toBe(formatDate(date2));
		});
	});

	describe("formatTime", () => {
		it("should format time correctly", () => {
			const date = new Date("2024-12-03T10:30:00.000Z");
			const formatted = formatTime(date);

			expect(formatted).toBeTruthy();
			expect(typeof formatted).toBe("string");
		});

		it("should handle midnight", () => {
			const date = new Date("2024-12-03T00:00:00.000Z");
			const formatted = formatTime(date);

			expect(formatted).toBeTruthy();
		});

		it("should handle noon", () => {
			const date = new Date("2024-12-03T12:00:00.000Z");
			const formatted = formatTime(date);

			expect(formatted).toBeTruthy();
		});
	});
});
