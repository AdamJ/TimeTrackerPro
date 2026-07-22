import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

type Handler = (...args: unknown[]) => unknown;
type MenuItem = {
	label?: string;
	role?: string;
	accelerator?: string;
	click?: Handler;
	submenu?: MenuItem[];
};

const sendMock = vi.fn();
const openExternalMock = vi.fn();
const checkForUpdatesMock = vi.fn();
const buildFromTemplateMock = vi.fn((template: MenuItem[]) => ({ template }));
const setApplicationMenuMock = vi.fn();
const getFocusedWindowMock = vi.fn(() => null);
const getAllWindowsMock = vi.fn(() => [{ webContents: { send: sendMock } }]);

vi.mock("electron", () => ({
	app: { name: "Timetraked" },
	shell: { openExternal: openExternalMock },
	BrowserWindow: {
		getFocusedWindow: getFocusedWindowMock,
		getAllWindows: getAllWindowsMock,
	},
	Menu: {
		buildFromTemplate: buildFromTemplateMock,
		setApplicationMenu: setApplicationMenuMock,
	},
}));

vi.mock("./updater", () => ({ checkForUpdates: checkForUpdatesMock }));

// Finds a menu item by label across top-level entries and their submenus.
function findItem(template: MenuItem[], label: string): MenuItem | undefined {
	for (const entry of template) {
		if (entry.label === label) return entry;
		if (entry.submenu) {
			const found = findItem(entry.submenu, label);
			if (found) return found;
		}
	}
	return undefined;
}

describe("electron/menu buildApplicationMenu", () => {
	const originalPlatform = process.platform;

	beforeEach(() => {
		vi.clearAllMocks();
		getFocusedWindowMock.mockReturnValue(null);
	});

	afterEach(() => {
		Object.defineProperty(process, "platform", { value: originalPlatform });
	});

	it("builds a menu from the template and installs it as the application menu", async () => {
		const { buildApplicationMenu } = await import("./menu");

		const menu = buildApplicationMenu();

		expect(buildFromTemplateMock).toHaveBeenCalledTimes(1);
		expect(setApplicationMenuMock).toHaveBeenCalledWith(menu);
	});

	it("sends 'new-task' over IPC to the focused window when File > New Task is clicked", async () => {
		const { buildApplicationMenu } = await import("./menu");
		buildApplicationMenu();

		const template = buildFromTemplateMock.mock.calls[0][0] as MenuItem[];
		const newTask = findItem(template, "New Task");
		expect(newTask?.accelerator).toBe("CmdOrCtrl+N");

		newTask?.click?.();

		expect(sendMock).toHaveBeenCalledWith("menu:action", "new-task");
	});

	it("falls back to the first available window when there is no focused window", async () => {
		getFocusedWindowMock.mockReturnValue(null);
		const { buildApplicationMenu } = await import("./menu");
		buildApplicationMenu();

		const template = buildFromTemplateMock.mock.calls[0][0] as MenuItem[];
		findItem(template, "Save Changes")?.click?.();

		expect(getAllWindowsMock).toHaveBeenCalled();
		expect(sendMock).toHaveBeenCalledWith("menu:action", "save");
	});

	it("sends 'command-palette' when View > Command Palette is clicked", async () => {
		const { buildApplicationMenu } = await import("./menu");
		buildApplicationMenu();

		const template = buildFromTemplateMock.mock.calls[0][0] as MenuItem[];
		findItem(template, "Command Palette…")?.click?.();

		expect(sendMock).toHaveBeenCalledWith("menu:action", "command-palette");
	});

	it("sends 'shortcuts-help' and invokes checkForUpdates from the Help menu", async () => {
		const { buildApplicationMenu } = await import("./menu");
		buildApplicationMenu();

		const template = buildFromTemplateMock.mock.calls[0][0] as MenuItem[];
		findItem(template, "Keyboard Shortcuts")?.click?.();
		findItem(template, "Check for Updates…")?.click?.();

		expect(sendMock).toHaveBeenCalledWith("menu:action", "shortcuts-help");
		expect(checkForUpdatesMock).toHaveBeenCalledTimes(1);
	});

	it("opens the GitHub repo externally from Help > Timetraked on GitHub", async () => {
		const { buildApplicationMenu } = await import("./menu");
		buildApplicationMenu();

		const template = buildFromTemplateMock.mock.calls[0][0] as MenuItem[];
		findItem(template, "Timetraked on GitHub")?.click?.();

		expect(openExternalMock).toHaveBeenCalledWith("https://github.com/AdamJ/TimeTrackerPro");
	});

	it("includes a macOS app-name submenu with Preferences… on darwin", async () => {
		Object.defineProperty(process, "platform", { value: "darwin" });
		vi.resetModules();
		const { buildApplicationMenu } = await import("./menu");
		buildApplicationMenu();

		const template = buildFromTemplateMock.mock.calls[0][0] as MenuItem[];
		expect(findItem(template, "Preferences…")).toBeDefined();
		expect(findItem(template, "Settings…")).toBeUndefined();
	});

	it("puts Settings… in the File menu and omits the app-name submenu on non-macOS platforms", async () => {
		Object.defineProperty(process, "platform", { value: "win32" });
		vi.resetModules();
		const { buildApplicationMenu } = await import("./menu");
		buildApplicationMenu();

		const template = buildFromTemplateMock.mock.calls[0][0] as MenuItem[];
		expect(findItem(template, "Settings…")).toBeDefined();
		expect(findItem(template, "Preferences…")).toBeUndefined();
	});
});
