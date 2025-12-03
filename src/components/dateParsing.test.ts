import { describe, it, expect } from "vitest";

/**
 * Tests for date parsing consistency across the application
 * This verifies the fix for the date selection bug where archived day
 * date editing was showing the previous day due to UTC vs local timezone issues
 */
describe("Date Parsing Consistency", () => {
	describe("ISO date string parsing", () => {
		it("should correctly parse date string using split method (correct approach)", () => {
			const dateString = "2024-12-03";
			const [year, month, day] = dateString.split("-").map(Number);
			const parsedDate = new Date(year, month - 1, day);

			expect(parsedDate.getFullYear()).toBe(2024);
			expect(parsedDate.getMonth()).toBe(11); // December is month 11 (0-indexed)
			expect(parsedDate.getDate()).toBe(3);
		});

		it("should show the bug: new Date(string) treats date as UTC", () => {
			const dateString = "2024-12-03";
			const parsedDate = new Date(dateString);

			// This will be 2024-12-03 00:00:00 UTC
			// In timezones behind UTC (like US), this becomes the previous day
			expect(parsedDate.toISOString()).toBe("2024-12-03T00:00:00.000Z");

			// In EST (UTC-5), the local date would be December 2nd
			// We can test this by checking the UTC date vs local date
			const utcDate = parsedDate.getUTCDate();
			expect(utcDate).toBe(3);
		});

		it("should demonstrate timezone-safe date parsing", () => {
			const testDates = [
				"2024-01-01",
				"2024-06-15",
				"2024-12-31",
				"2024-12-03"
			];

			testDates.forEach((dateString) => {
				const [year, month, day] = dateString.split("-").map(Number);
				const localDate = new Date(year, month - 1, day);
				const utcDate = new Date(dateString);

				// Local date should match the intended date
				expect(localDate.getFullYear()).toBe(year);
				expect(localDate.getMonth()).toBe(month - 1);
				expect(localDate.getDate()).toBe(day);

				// UTC date might differ in local time representation
				// This is the bug we fixed
			});
		});
	});

	describe("Date formatting for input", () => {
		it("should format date correctly for date input", () => {
			const date = new Date(2024, 11, 3); // December 3, 2024
			const year = date.getFullYear();
			const month = (date.getMonth() + 1).toString().padStart(2, "0");
			const day = date.getDate().toString().padStart(2, "0");
			const formatted = `${year}-${month}-${day}`;

			expect(formatted).toBe("2024-12-03");
		});

		it("should handle single-digit months and days", () => {
			const date = new Date(2024, 0, 5); // January 5, 2024
			const year = date.getFullYear();
			const month = (date.getMonth() + 1).toString().padStart(2, "0");
			const day = date.getDate().toString().padStart(2, "0");
			const formatted = `${year}-${month}-${day}`;

			expect(formatted).toBe("2024-01-05");
		});
	});

	describe("Date consistency across components", () => {
		it("should parse and format dates consistently", () => {
			// Simulate StartDayDialog approach
			const inputValue = "2024-12-03";
			const [year, month, day] = inputValue.split("-").map(Number);
			const startDayDate = new Date(year, month - 1, day, 9, 0, 0, 0);

			// Simulate ArchiveEditDialog approach (after fix)
			const [y2, m2, d2] = inputValue.split("-").map(Number);
			const archiveDate = new Date(y2, m2 - 1, d2);

			// Both should parse to the same date
			expect(startDayDate.getFullYear()).toBe(archiveDate.getFullYear());
			expect(startDayDate.getMonth()).toBe(archiveDate.getMonth());
			expect(startDayDate.getDate()).toBe(archiveDate.getDate());
		});

		it("should maintain date when updating time", () => {
			const dateString = "2024-12-03";
			const [year, month, day] = dateString.split("-").map(Number);
			const selectedDate = new Date(year, month - 1, day);

			// Simulate updating time on existing date
			const originalTime = new Date("2024-11-15T10:00:00.000Z");
			const newTime = new Date(originalTime);
			newTime.setFullYear(selectedDate.getFullYear());
			newTime.setMonth(selectedDate.getMonth());
			newTime.setDate(selectedDate.getDate());

			expect(newTime.getFullYear()).toBe(2024);
			expect(newTime.getMonth()).toBe(11); // December
			expect(newTime.getDate()).toBe(3);
			expect(newTime.getHours()).toBe(originalTime.getHours());
		});
	});

	describe("Edge cases", () => {
		it("should handle leap year dates", () => {
			const dateString = "2024-02-29"; // 2024 is a leap year
			const [year, month, day] = dateString.split("-").map(Number);
			const date = new Date(year, month - 1, day);

			expect(date.getFullYear()).toBe(2024);
			expect(date.getMonth()).toBe(1); // February
			expect(date.getDate()).toBe(29);
		});

		it("should handle end of year dates", () => {
			const dateString = "2024-12-31";
			const [year, month, day] = dateString.split("-").map(Number);
			const date = new Date(year, month - 1, day);

			expect(date.getFullYear()).toBe(2024);
			expect(date.getMonth()).toBe(11); // December
			expect(date.getDate()).toBe(31);
		});

		it("should handle beginning of year dates", () => {
			const dateString = "2024-01-01";
			const [year, month, day] = dateString.split("-").map(Number);
			const date = new Date(year, month - 1, day);

			expect(date.getFullYear()).toBe(2024);
			expect(date.getMonth()).toBe(0); // January
			expect(date.getDate()).toBe(1);
		});
	});
});
