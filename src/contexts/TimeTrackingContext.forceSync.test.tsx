import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { TimeTrackingProvider } from "./TimeTrackingContext";
import { useTimeTracking } from "@/hooks/useTimeTracking";

vi.mock("@/hooks/useAuth", () => ({
	useAuth: () => ({
		isAuthenticated: false,
		user: null
	})
}));

const mockDataService = {
	saveCurrentDay: vi.fn().mockResolvedValue(undefined),
	getCurrentDay: vi.fn().mockResolvedValue(null),
	saveArchivedDays: vi.fn().mockResolvedValue(undefined),
	getArchivedDays: vi.fn().mockResolvedValue([]),
	updateArchivedDay: vi.fn().mockResolvedValue(undefined),
	deleteArchivedDay: vi.fn().mockResolvedValue(undefined),
	saveProjects: vi.fn().mockResolvedValue(undefined),
	getProjects: vi.fn().mockResolvedValue([]),
	deleteProject: vi.fn().mockResolvedValue(undefined),
	saveClients: vi.fn().mockResolvedValue(undefined),
	getClients: vi.fn().mockResolvedValue([]),
	upsertClient: vi.fn().mockResolvedValue(undefined),
	saveCategories: vi.fn().mockResolvedValue(undefined),
	getCategories: vi.fn().mockResolvedValue([]),
	deleteCategory: vi.fn().mockResolvedValue(undefined),
	saveTodos: vi.fn().mockResolvedValue(undefined),
	getTodos: vi.fn().mockResolvedValue([]),
	deleteTodo: vi.fn().mockResolvedValue(undefined),
	savePlannedTasks: vi.fn().mockResolvedValue(undefined),
	getPlannedTasks: vi.fn().mockResolvedValue([]),
	upsertPlannedTask: vi.fn().mockResolvedValue(undefined),
	deletePlannedTask: vi.fn().mockResolvedValue(undefined),
	migrateFromLocalStorage: vi.fn().mockResolvedValue(false),
	migrateToLocalStorage: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@/services/dataService", async () => {
	const actual = await vi.importActual<typeof import("@/services/dataService")>("@/services/dataService");
	return {
		...actual,
		createDataService: () => mockDataService,
	};
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
	<TimeTrackingProvider>{children}</TimeTrackingProvider>
);

// Covers the boolean success/failure contract that App.tsx's manual-save
// toast (keyboard shortcut, command palette, Electron menu) relies on.
describe("forceSyncToDatabase", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
		Object.values(mockDataService).forEach((fn) => fn.mockClear());
		mockDataService.getCurrentDay.mockResolvedValue(null);
		mockDataService.getArchivedDays.mockResolvedValue([]);
		mockDataService.getProjects.mockResolvedValue([]);
		mockDataService.getClients.mockResolvedValue([]);
		mockDataService.getCategories.mockResolvedValue([]);
		mockDataService.getTodos.mockResolvedValue([]);
		mockDataService.getPlannedTasks.mockResolvedValue([]);
		mockDataService.saveCurrentDay.mockResolvedValue(undefined);
		mockDataService.saveProjects.mockResolvedValue(undefined);
		mockDataService.saveCategories.mockResolvedValue(undefined);
		mockDataService.saveArchivedDays.mockResolvedValue(undefined);
		mockDataService.saveTodos.mockResolvedValue(undefined);
		mockDataService.savePlannedTasks.mockResolvedValue(undefined);
	});

	it("resolves true when every save succeeds", async () => {
		const { result } = renderHook(() => useTimeTracking(), { wrapper });
		await waitFor(() => expect(result.current.loading).toBe(false));

		let success: boolean | undefined;
		await act(async () => {
			success = await result.current.forceSyncToDatabase();
		});

		expect(success).toBe(true);
		expect(result.current.hasUnsavedChanges).toBe(false);
	});

	it("resolves false when a save call rejects", async () => {
		mockDataService.saveProjects.mockRejectedValue(new Error("network error"));
		const { result } = renderHook(() => useTimeTracking(), { wrapper });
		await waitFor(() => expect(result.current.loading).toBe(false));

		let success: boolean | undefined;
		await act(async () => {
			success = await result.current.forceSyncToDatabase();
		});

		expect(success).toBe(false);
	});
});
