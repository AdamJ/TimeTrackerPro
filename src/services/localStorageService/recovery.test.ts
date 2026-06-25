import { describe, it, expect, beforeEach } from "vitest";
import { STORAGE_KEYS, SCHEMA_VERSION } from "./constants";
import {
	listLocalStorageBackups,
	summarizeLocalStorageBackup,
	restoreLocalStorageBackup,
	summarizeFullSnapshot,
	restoreFullSnapshot,
	summarizeCurrentLocalStorageState
} from "./recovery";

describe("listLocalStorageBackups", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("finds schema-mismatch sibling keys for known storage keys", () => {
		localStorage.setItem(
			`${STORAGE_KEYS.ARCHIVED_DAYS}_v0_backup_1700000000000`,
			JSON.stringify({ days: [{ id: "1" }], _v: 0 })
		);
		localStorage.setItem("unrelated_key", "value");

		const backups = listLocalStorageBackups();

		expect(backups).toHaveLength(1);
		expect(backups[0]).toEqual({
			key: `${STORAGE_KEYS.ARCHIVED_DAYS}_v0_backup_1700000000000`,
			originalKey: STORAGE_KEYS.ARCHIVED_DAYS,
			oldVersion: "0",
			timestamp: 1700000000000
		});
	});

	it("sorts backups newest first", () => {
		localStorage.setItem(`${STORAGE_KEYS.PROJECTS}_v0_backup_1000`, JSON.stringify({ data: [], _v: 0 }));
		localStorage.setItem(`${STORAGE_KEYS.PROJECTS}_v0_backup_2000`, JSON.stringify({ data: [], _v: 0 }));

		const backups = listLocalStorageBackups();

		expect(backups.map((b) => b.timestamp)).toEqual([2000, 1000]);
	});

	it("ignores keys that don't match a known storage key", () => {
		localStorage.setItem("some_other_key_v0_backup_1000", "{}");

		expect(listLocalStorageBackups()).toEqual([]);
	});
});

describe("summarizeLocalStorageBackup", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("counts entries in a versioned-envelope backup", () => {
		const key = `${STORAGE_KEYS.ARCHIVED_DAYS}_v0_backup_1000`;
		localStorage.setItem(key, JSON.stringify({ days: [{ id: "1" }, { id: "2" }], _v: 0 }));

		const summary = summarizeLocalStorageBackup({
			key,
			originalKey: STORAGE_KEYS.ARCHIVED_DAYS,
			oldVersion: "0",
			timestamp: 1000
		});

		expect(summary).toEqual({ archivedDays: 2 });
	});

	it("counts entries in a legacy bare-array backup", () => {
		const key = `${STORAGE_KEYS.PROJECTS}_v0_backup_1000`;
		localStorage.setItem(key, JSON.stringify([{ id: "1" }]));

		const summary = summarizeLocalStorageBackup({
			key,
			originalKey: STORAGE_KEYS.PROJECTS,
			oldVersion: "0",
			timestamp: 1000
		});

		expect(summary).toEqual({ projects: 1 });
	});

	it("counts tasks for a current-day backup", () => {
		const key = `${STORAGE_KEYS.CURRENT_DAY}_v0_backup_1000`;
		localStorage.setItem(key, JSON.stringify({ tasks: [{ id: "1" }, { id: "2" }, { id: "3" }], _v: 0 }));

		const summary = summarizeLocalStorageBackup({
			key,
			originalKey: STORAGE_KEYS.CURRENT_DAY,
			oldVersion: "0",
			timestamp: 1000
		});

		expect(summary).toEqual({ currentDayTasks: 3 });
	});

	it("returns null when the backup key is missing", () => {
		const summary = summarizeLocalStorageBackup({
			key: "missing_key",
			originalKey: STORAGE_KEYS.PROJECTS,
			oldVersion: "0",
			timestamp: 1000
		});

		expect(summary).toBeNull();
	});
});

describe("restoreLocalStorageBackup", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("writes the backup data back to the live key stamped with the current schema version", () => {
		const key = `${STORAGE_KEYS.ARCHIVED_DAYS}_v0_backup_1000`;
		localStorage.setItem(key, JSON.stringify({ days: [{ id: "1" }], _v: 0 }));

		const ok = restoreLocalStorageBackup({
			key,
			originalKey: STORAGE_KEYS.ARCHIVED_DAYS,
			oldVersion: "0",
			timestamp: 1000
		});

		expect(ok).toBe(true);
		expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.ARCHIVED_DAYS)!)).toEqual({
			days: [{ id: "1" }],
			_v: SCHEMA_VERSION
		});
	});

	it("restores a current-day backup as a flat object, not wrapped in a data/days field", () => {
		const key = `${STORAGE_KEYS.CURRENT_DAY}_v0_backup_1000`;
		localStorage.setItem(key, JSON.stringify({ isDayStarted: true, tasks: [], _v: 0 }));

		restoreLocalStorageBackup({
			key,
			originalKey: STORAGE_KEYS.CURRENT_DAY,
			oldVersion: "0",
			timestamp: 1000
		});

		expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_DAY)!)).toEqual({
			isDayStarted: true,
			tasks: [],
			_v: SCHEMA_VERSION
		});
	});

	it("returns false when the backup key is missing", () => {
		const ok = restoreLocalStorageBackup({
			key: "missing_key",
			originalKey: STORAGE_KEYS.PROJECTS,
			oldVersion: "0",
			timestamp: 1000
		});

		expect(ok).toBe(false);
	});
});

describe("summarizeFullSnapshot", () => {
	it("counts every entity in a full Electron disk-backup snapshot", () => {
		const summary = summarizeFullSnapshot({
			currentDay: { tasks: [{}, {}] },
			archivedDays: [{}],
			projects: [{}, {}, {}],
			categories: [{}],
			todoItems: [{}, {}],
			plannedTasks: [],
			clients: [{}]
		});

		expect(summary).toEqual({
			currentDayTasks: 2,
			archivedDays: 1,
			projects: 3,
			categories: 1,
			todos: 2,
			plannedTasks: 0,
			clients: 1
		});
	});

	it("defaults missing fields to 0", () => {
		expect(summarizeFullSnapshot({})).toEqual({
			currentDayTasks: 0,
			archivedDays: 0,
			projects: 0,
			categories: 0,
			todos: 0,
			plannedTasks: 0,
			clients: 0
		});
	});
});

describe("restoreFullSnapshot", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("writes every entity from the snapshot into its live storage key", () => {
		restoreFullSnapshot({
			currentDay: { tasks: [{ id: "t1" }] },
			archivedDays: [{ id: "d1" }],
			projects: [{ id: "p1" }],
			categories: [{ id: "c1" }],
			todoItems: [{ id: "todo1" }],
			plannedTasks: [{ id: "pt1" }],
			clients: [{ id: "cl1" }]
		});

		expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_DAY)!)).toEqual({
			tasks: [{ id: "t1" }],
			_v: SCHEMA_VERSION
		});
		expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.ARCHIVED_DAYS)!)).toEqual({
			days: [{ id: "d1" }],
			_v: SCHEMA_VERSION
		});
		expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS)!)).toEqual({
			data: [{ id: "p1" }],
			_v: SCHEMA_VERSION
		});
		expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.CLIENTS)!)).toEqual({
			data: [{ id: "cl1" }],
			_v: SCHEMA_VERSION
		});
	});

	it("does not touch the current-day key when the snapshot has none", () => {
		restoreFullSnapshot({ projects: [] });

		expect(localStorage.getItem(STORAGE_KEYS.CURRENT_DAY)).toBeNull();
	});
});

describe("summarizeCurrentLocalStorageState", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("counts entries currently live in localStorage", () => {
		localStorage.setItem(STORAGE_KEYS.ARCHIVED_DAYS, JSON.stringify({ days: [{}, {}], _v: SCHEMA_VERSION }));
		localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify({ data: [{}], _v: SCHEMA_VERSION }));

		const summary = summarizeCurrentLocalStorageState();

		expect(summary.archivedDays).toBe(2);
		expect(summary.projects).toBe(1);
		expect(summary.categories).toBe(0);
	});
});
