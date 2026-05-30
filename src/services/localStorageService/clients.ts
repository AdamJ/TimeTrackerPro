import { Client } from "@/contexts/TimeTrackingContext";
import { STORAGE_KEYS, SCHEMA_VERSION } from "./constants";
import { readVersioned } from "./utils";

export async function saveClients(clients: Client[]): Promise<void> {
	try {
		localStorage.setItem(
			STORAGE_KEYS.CLIENTS,
			JSON.stringify({ data: clients, _v: SCHEMA_VERSION })
		);
	} catch (error) {
		console.warn("Failed to save clients to localStorage:", error);
	}
}

export async function getClients(): Promise<Client[]> {
	try {
		return readVersioned<Client>(STORAGE_KEYS.CLIENTS, "data");
	} catch (error) {
		console.error("Error loading clients from localStorage:", error);
		return [];
	}
}
