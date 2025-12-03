import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

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
