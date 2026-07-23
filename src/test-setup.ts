import { expect, afterEach, vi, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Mock Supabase before any imports
vi.mock("@/lib/supabase", () => ({
	supabase: {
		auth: {
			getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
			getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
			onAuthStateChange: vi.fn(() => ({
				data: { subscription: { unsubscribe: vi.fn() } }
			}))
		},
		from: vi.fn(() => ({
			select: vi.fn(() => ({
				eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
			})),
			insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
			update: vi.fn(() => ({
				eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
			})),
			delete: vi.fn(() => ({
				eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
			}))
		}))
	},
	getCachedUser: vi.fn(() => Promise.resolve(null)),
	clearUserCache: vi.fn()
}));

// Set required environment variables for tests
beforeAll(() => {
	process.env.VITE_SUPABASE_URL = "https://test.supabase.co";
	process.env.VITE_SUPABASE_ANON_KEY = "test-anon-key";
});

// Cleanup after each test case (e.g., clearing jsdom)
afterEach(() => {
	cleanup();
});

// Vitest's built-in jsdom environment does not expose jsdom's native
// Storage object onto the global scope handed to tests — window.localStorage
// is `undefined` here even though raw jsdom provides a working one. This is a
// known vitest+jsdom limitation, not fixable via vite.config.ts. A hand-rolled
// mock is required; it wraps a Map in a Proxy so both method calls
// (localStorage.getItem(...)) and property-style access/enumeration
// (Object.keys(localStorage), for...in, localStorage.foo = "bar") behave like
// the real Storage interface — several tests filter Object.keys(localStorage)
// to find backup keys, which a plain object with get/set methods can't support.
//
// The actual read/write logic is patched onto the global Storage.prototype
// (which jsdom does provide, unpopulated) rather than owned directly by the
// mock instance, so `vi.spyOn(Storage.prototype, "setItem")` — used by
// quota-error tests — intercepts real calls instead of being shadowed by an
// own property. There is only ever one localStorage instance for the whole
// run, so the backing Map is safely closed over rather than keyed by `this`.
const localStorageStore = new Map<string, string>();

Storage.prototype.getItem = function (key: string): string | null {
	return localStorageStore.has(key) ? localStorageStore.get(key)! : null;
};
Storage.prototype.setItem = function (key: string, value: string): void {
	localStorageStore.set(key, String(value));
};
Storage.prototype.removeItem = function (key: string): void {
	localStorageStore.delete(key);
};
Storage.prototype.clear = function (): void {
	localStorageStore.clear();
};
Storage.prototype.key = function (index: number): string | null {
	return Array.from(localStorageStore.keys())[index] ?? null;
};
Object.defineProperty(Storage.prototype, "length", {
	configurable: true,
	get(): number {
		return localStorageStore.size;
	},
});

function createLocalStorageMock(): Storage {
	const instance = Object.create(Storage.prototype) as Storage;

	return new Proxy(instance, {
		get(t, prop, receiver) {
			if (typeof prop === "string" && !(prop in t) && localStorageStore.has(prop)) {
				return localStorageStore.get(prop);
			}
			return Reflect.get(t, prop, receiver);
		},
		set(t, prop, value) {
			if (typeof prop === "string" && !(prop in t)) {
				localStorageStore.set(prop, String(value));
				return true;
			}
			return Reflect.set(t, prop, value);
		},
		has(t, prop) {
			if (typeof prop === "string" && localStorageStore.has(prop)) return true;
			return Reflect.has(t, prop);
		},
		deleteProperty(t, prop) {
			if (typeof prop === "string" && localStorageStore.has(prop)) {
				localStorageStore.delete(prop);
				return true;
			}
			return Reflect.deleteProperty(t, prop);
		},
		ownKeys() {
			return Array.from(localStorageStore.keys());
		},
		getOwnPropertyDescriptor(t, prop) {
			if (typeof prop === "string" && !(prop in t) && localStorageStore.has(prop)) {
				return {
					value: localStorageStore.get(prop),
					writable: true,
					enumerable: true,
					configurable: true,
				};
			}
			return Reflect.getOwnPropertyDescriptor(t, prop);
		},
	});
}

// Installed unconditionally (not gated on typeof localStorage === "undefined")
// — confirmed always undefined in this vitest/jsdom setup, so a conditional
// would just be misleading dead-code framing.
Object.defineProperty(window, "localStorage", {
	writable: true,
	configurable: true,
	value: createLocalStorageMock(),
});

// Mock URL.createObjectURL / revokeObjectURL (not available in jsdom)
if (typeof URL.createObjectURL === "undefined") {
	Object.defineProperty(URL, "createObjectURL", {
		writable: true,
		value: vi.fn(() => "blob:mock"),
	});
}
if (typeof URL.revokeObjectURL === "undefined") {
	Object.defineProperty(URL, "revokeObjectURL", {
		writable: true,
		value: vi.fn(),
	});
}

// Mock ResizeObserver (not available in jsdom; used by cmdk's Command component)
if (typeof window.ResizeObserver === "undefined") {
	class ResizeObserverMock {
		observe = vi.fn();
		unobserve = vi.fn();
		disconnect = vi.fn();
	}
	Object.defineProperty(window, "ResizeObserver", {
		writable: true,
		value: ResizeObserverMock,
	});
}

// Mock Element.scrollIntoView (not available in jsdom; used by cmdk's Command component)
if (typeof Element.prototype.scrollIntoView === "undefined") {
	Element.prototype.scrollIntoView = vi.fn();
}

// Mock window.matchMedia (not available in jsdom)
if (typeof window.matchMedia === "undefined") {
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		value: vi.fn().mockImplementation((query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		})),
	});
}

// Mock Date.now() for consistent testing
const mockDate = new Date("2024-12-03T10:00:00.000Z");
vi.setSystemTime(mockDate);
