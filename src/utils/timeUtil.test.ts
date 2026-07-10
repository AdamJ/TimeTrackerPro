import { describe, it, expect } from "vitest";
import {
  formatDuration,
  formatDate,
  formatTime,
  formatHoursDecimal,
  roundToNearest15Minutes,
  formatTimeForInput,
} from "./timeUtil";

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

	describe("roundToNearest15Minutes", () => {
		it("rounds down to the previous quarter hour", () => {
			const date = new Date(2026, 5, 15, 17, 7, 30);
			const rounded = roundToNearest15Minutes(date);
			expect(rounded.getHours()).toBe(17);
			expect(rounded.getMinutes()).toBe(0);
		});

		it("rounds up to the next quarter hour", () => {
			const date = new Date(2026, 5, 15, 17, 8, 0);
			const rounded = roundToNearest15Minutes(date);
			expect(rounded.getHours()).toBe(17);
			expect(rounded.getMinutes()).toBe(15);
		});

		it("leaves an exact quarter hour unchanged", () => {
			const date = new Date(2026, 5, 15, 17, 30, 0);
			const rounded = roundToNearest15Minutes(date);
			expect(rounded.getHours()).toBe(17);
			expect(rounded.getMinutes()).toBe(30);
		});

		it("rolls over into the next hour", () => {
			const date = new Date(2026, 5, 15, 10, 53, 0);
			const rounded = roundToNearest15Minutes(date);
			expect(rounded.getHours()).toBe(11);
			expect(rounded.getMinutes()).toBe(0);
		});

		it("zeroes out seconds and milliseconds", () => {
			const date = new Date(2026, 5, 15, 17, 30, 45, 500);
			const rounded = roundToNearest15Minutes(date);
			expect(rounded.getSeconds()).toBe(0);
			expect(rounded.getMilliseconds()).toBe(0);
		});

		it("does not mutate the input date", () => {
			const date = new Date(2026, 5, 15, 17, 7, 0);
			roundToNearest15Minutes(date);
			expect(date.getMinutes()).toBe(7);
		});
	});

	describe("formatTimeForInput", () => {
		it("formats a rounded time as zero-padded HH:MM", () => {
			const date = new Date(2026, 5, 15, 9, 8, 0);
			expect(formatTimeForInput(date)).toBe("09:15");
		});

		it("zero-pads single-digit hours and minutes", () => {
			const date = new Date(2026, 5, 15, 1, 0, 0);
			expect(formatTimeForInput(date)).toBe("01:00");
		});

		it("rolls over into the next hour when formatting", () => {
			const date = new Date(2026, 5, 15, 10, 53, 0);
			expect(formatTimeForInput(date)).toBe("11:00");
		});
	});
});
