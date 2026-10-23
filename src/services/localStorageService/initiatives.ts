import { Initiative } from "@/contexts/TimeTrackingContext";
import { STORAGE_KEYS, SCHEMA_VERSION } from "./constants";
import { notifyWriteFailure, readVersioned, writeVersioned } from "./utils";

export async function saveInitiatives(initiatives: Initiative[]): Promise<void> {
	const result = writeVersioned(STORAGE_KEYS.INITIATIVES, { data: initiatives, _v: SCHEMA_VERSION });
	if (!result.ok) notifyWriteFailure(STORAGE_KEYS.INITIATIVES);
}

export async function upsertInitiative(initiative: Initiative): Promise<void> {
	try {
		const current = await getInitiatives();
		const exists = current.some(i => i.id === initiative.id);
		const next = exists ? current.map(i => i.id === initiative.id ? initiative : i) : [...current, initiative];
		await saveInitiatives(next);
	} catch (error) {
		console.warn("Failed to upsert initiative in localStorage:", error);
	}
}

export async function deleteInitiative(id: string): Promise<void> {
	try {
		const current = await getInitiatives();
		await saveInitiatives(current.filter(i => i.id !== id));
	} catch (error) {
		console.warn("Failed to delete initiative from localStorage:", error);
	}
}

export async function getInitiatives(): Promise<Initiative[]> {
	try {
		return readVersioned<Initiative>(STORAGE_KEYS.INITIATIVES, "data");
	} catch (error) {
		console.error("Error loading initiatives from localStorage:", error);
		return [];
	}
}
