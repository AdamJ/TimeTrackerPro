import { TaskCategory } from "@/config/categories";
import { STORAGE_KEYS, SCHEMA_VERSION } from "./constants";
import { readVersioned } from "./utils";

export async function saveCategories(categories: TaskCategory[]): Promise<void> {
	try {
		localStorage.setItem(
			STORAGE_KEYS.CATEGORIES,
			JSON.stringify({ data: categories, _v: SCHEMA_VERSION })
		);
	} catch (error) {
		console.warn("Failed to save categories to localStorage:", error);
	}
}

export async function getCategories(): Promise<TaskCategory[]> {
	try {
		return readVersioned<TaskCategory>(STORAGE_KEYS.CATEGORIES, "data");
	} catch (error) {
		console.error("Error loading categories from localStorage:", error);
		return [];
	}
}
