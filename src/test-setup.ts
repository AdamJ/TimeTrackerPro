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

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {};

	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = value.toString();
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		}
	};
})();

Object.defineProperty(window, "localStorage", {
	value: localStorageMock
});

// Mock Date.now() for consistent testing
const mockDate = new Date("2024-12-03T10:00:00.000Z");
vi.setSystemTime(mockDate);
