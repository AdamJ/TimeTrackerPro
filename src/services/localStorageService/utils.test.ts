import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/hooks/use-toast", () => ({
	toast: vi.fn(),
	useToast: vi.fn()
}));

import { toast } from "@/hooks/use-toast";
import { backupStaleKey, notifyWriteFailure, readVersioned, writeVersioned } from "./utils";

describe("writeVersioned", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
	});

	it("writes the JSON-stringified payload and returns ok", () => {
		const result = writeVersioned("test_key", { data: [1, 2, 3], _v: 1 });

		expect(result.ok).toBe(true);
		expect(JSON.parse(localStorage.getItem("test_key")!)).toEqual({ data: [1, 2, 3], _v: 1 });
	});

	it("returns a failure result instead of throwing when setItem fails", () => {
		const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new DOMException("Quota exceeded", "QuotaExceededError");
		});

		const result = writeVersioned("test_key", { data: [], _v: 1 });

		expect(result.ok).toBe(false);
		setItemSpy.mockRestore();
	});
});

describe("notifyWriteFailure", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useRealTimers();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("surfaces a destructive toast on write failure", () => {
		vi.setSystemTime(10_000);
		notifyWriteFailure("some_key");

		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({ variant: "destructive" })
		);
	});

	it("debounces repeated failures within the same window", () => {
		// Far enough past any timestamp the previous test may have left behind.
		vi.setSystemTime(1_000_000);
		notifyWriteFailure("some_key");
		notifyWriteFailure("some_key");

		expect(toast).toHaveBeenCalledTimes(1);
	});
});

describe("backupStaleKey", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("copies the stale raw blob to a sibling backup key", () => {
		const raw = JSON.stringify({ data: ["legacy"], _v: 0 });

		backupStaleKey("timetracker_test", raw, 0);

		const backupKeys = Object.keys(localStorage).filter((key) =>
			key.startsWith("timetracker_test_v0_backup_")
		);
		expect(backupKeys).toHaveLength(1);
		expect(localStorage.getItem(backupKeys[0])).toBe(raw);
	});
});

describe("readVersioned", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("returns the data array for a matching schema version", () => {
		localStorage.setItem("timetracker_test", JSON.stringify({ data: ["a", "b"], _v: 1 }));

		expect(readVersioned("timetracker_test", "data")).toEqual(["a", "b"]);
	});

	it("supports legacy bare-array format without backing up or clearing", () => {
		localStorage.setItem("timetracker_test", JSON.stringify(["legacy-a"]));

		const result = readVersioned("timetracker_test", "data");

		expect(result).toEqual(["legacy-a"]);
		expect(localStorage.getItem("timetracker_test")).not.toBeNull();
	});

	it("backs up and clears data on schema mismatch instead of destroying it", () => {
		const raw = JSON.stringify({ data: ["stale"], _v: 0 });
		localStorage.setItem("timetracker_test", raw);

		const result = readVersioned("timetracker_test", "data");

		expect(result).toEqual([]);
		expect(localStorage.getItem("timetracker_test")).toBeNull();
		const backupKeys = Object.keys(localStorage).filter((key) =>
			key.startsWith("timetracker_test_v0_backup_")
		);
		expect(backupKeys).toHaveLength(1);
		expect(localStorage.getItem(backupKeys[0])).toBe(raw);
	});
});
