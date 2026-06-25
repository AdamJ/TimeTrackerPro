import { TaskCategory } from "@/config/categories";
import { STORAGE_KEYS, SCHEMA_VERSION } from "./constants";
import { notifyWriteFailure, readVersioned, writeVersioned } from "./utils";

export async function saveCategories(categories: TaskCategory[]): Promise<void> {
	const result = writeVersioned(STORAGE_KEYS.CATEGORIES, { data: categories, _v: SCHEMA_VERSION });
	if (!result.ok) notifyWriteFailure(STORAGE_KEYS.CATEGORIES);
}

export async function getCategories(): Promise<TaskCategory[]> {
	try {
		return readVersioned<TaskCategory>(STORAGE_KEYS.CATEGORIES, "data");
	} catch (error) {
		console.error("Error loading categories from localStorage:", error);
		return [];
	}
}
