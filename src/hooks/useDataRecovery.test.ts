import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useDataRecovery } from "./useDataRecovery";
import { STORAGE_KEYS, SCHEMA_VERSION } from "@/services/localStorageService/constants";

afterEach(() => {
	delete (window as { electronAPI?: unknown }).electronAPI;
	localStorage.clear();
});

beforeEach(() => {
	localStorage.clear();
});

describe("useDataRecovery — browser-only backups (no electronAPI)", () => {
	it("lists browser backups sorted newest first", async () => {
		localStorage.setItem(`${STORAGE_KEYS.PROJECTS}_v0_backup_1000`, JSON.stringify({ data: [{}], _v: 0 }));
		localStorage.setItem(`${STORAGE_KEYS.PROJECTS}_v0_backup_2000`, JSON.stringify({ data: [{}, {}], _v: 0 }));

		const { result } = renderHook(() => useDataRecovery());
		const backups = await result.current.listBackups();

		expect(backups).toHaveLength(2);
		expect(backups.map((b) => b.timestamp)).toEqual([2000, 1000]);
		expect(backups.every((b) => b.source === "browser")).toBe(true);
	});

	it("previews a browser backup", async () => {
		const key = `${STORAGE_KEYS.PROJECTS}_v0_backup_1000`;
		localStorage.setItem(key, JSON.stringify({ data: [{}, {}], _v: 0 }));

		const { result } = renderHook(() => useDataRecovery());
		const [backup] = await result.current.listBackups();
		const summary = await result.current.previewBackup(backup);

		expect(summary).toEqual({ projects: 2 });
	});

	it("restores a browser backup into its live key", async () => {
		const key = `${STORAGE_KEYS.PROJECTS}_v0_backup_1000`;
		localStorage.setItem(key, JSON.stringify({ data: [{ id: "p1" }], _v: 0 }));

		const { result } = renderHook(() => useDataRecovery());
		const [backup] = await result.current.listBackups();
		const ok = await result.current.restoreBackup(backup);

		expect(ok).toBe(true);
		expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS)!)).toEqual({
			data: [{ id: "p1" }],
			_v: SCHEMA_VERSION
		});
	});

	it("reports zero counts for the current state when nothing is stored", () => {
		const { result } = renderHook(() => useDataRecovery());

		expect(result.current.currentStateSummary().projects).toBe(0);
	});
});

describe("useDataRecovery — with electronAPI present", () => {
	it("merges desktop disk backups alongside browser backups", async () => {
		localStorage.setItem(`${STORAGE_KEYS.PROJECTS}_v0_backup_1000`, JSON.stringify({ data: [], _v: 0 }));
		window.electronAPI = {
			writeBackup: async () => ({ ok: true }),
			requestFlushBeforeQuit: () => undefined,
			onMenuAction: () => () => undefined,
			listBackups: async () => ({
				ok: true,
				backups: [{ name: "backup_2024-01-02.json", timestamp: "2024-01-02T00:00:00.000Z", sizeBytes: 10 }]
			}),
			readBackup: async () => ({ ok: true, content: JSON.stringify({ projects: [{}, {}] }) })
		};

		const { result } = renderHook(() => useDataRecovery());
		const backups = await result.current.listBackups();

		expect(backups.some((b) => b.source === "desktop")).toBe(true);
		expect(backups.some((b) => b.source === "browser")).toBe(true);
	});

	it("previews a desktop backup by reading and parsing its disk content", async () => {
		window.electronAPI = {
			writeBackup: async () => ({ ok: true }),
			requestFlushBeforeQuit: () => undefined,
			onMenuAction: () => () => undefined,
			listBackups: async () => ({
				ok: true,
				backups: [{ name: "backup_2024-01-02.json", timestamp: "2024-01-02T00:00:00.000Z", sizeBytes: 10 }]
			}),
			readBackup: async () => ({ ok: true, content: JSON.stringify({ projects: [{}, {}], archivedDays: [{}] }) })
		};

		const { result } = renderHook(() => useDataRecovery());
		const [backup] = await result.current.listBackups();
		const summary = await result.current.previewBackup(backup);

		await waitFor(() => expect(summary?.projects).toBe(2));
		expect(summary?.archivedDays).toBe(1);
	});

	it("restores a desktop backup by writing its snapshot into localStorage", async () => {
		window.electronAPI = {
			writeBackup: async () => ({ ok: true }),
			requestFlushBeforeQuit: () => undefined,
			onMenuAction: () => () => undefined,
			listBackups: async () => ({
				ok: true,
				backups: [{ name: "backup_2024-01-02.json", timestamp: "2024-01-02T00:00:00.000Z", sizeBytes: 10 }]
			}),
			readBackup: async () => ({ ok: true, content: JSON.stringify({ projects: [{ id: "desktop-p1" }] }) })
		};

		const { result } = renderHook(() => useDataRecovery());
		const [backup] = await result.current.listBackups();
		const ok = await result.current.restoreBackup(backup);

		expect(ok).toBe(true);
		expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS)!)).toEqual({
			data: [{ id: "desktop-p1" }],
			_v: SCHEMA_VERSION
		});
	});

	it("returns false when reading the desktop backup fails", async () => {
		window.electronAPI = {
			writeBackup: async () => ({ ok: true }),
			requestFlushBeforeQuit: () => undefined,
			onMenuAction: () => () => undefined,
			listBackups: async () => ({
				ok: true,
				backups: [{ name: "backup_2024-01-02.json", timestamp: "2024-01-02T00:00:00.000Z", sizeBytes: 10 }]
			}),
			readBackup: async () => ({ ok: false, error: "disk error" })
		};

		const { result } = renderHook(() => useDataRecovery());
		const [backup] = await result.current.listBackups();
		const ok = await result.current.restoreBackup(backup);

		expect(ok).toBe(false);
	});
});
