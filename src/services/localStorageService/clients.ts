import { Client } from "@/contexts/TimeTrackingContext";
import { STORAGE_KEYS, SCHEMA_VERSION } from "./constants";
import { notifyWriteFailure, readVersioned, writeVersioned } from "./utils";

export async function saveClients(clients: Client[]): Promise<void> {
	const result = writeVersioned(STORAGE_KEYS.CLIENTS, { data: clients, _v: SCHEMA_VERSION });
	if (!result.ok) notifyWriteFailure(STORAGE_KEYS.CLIENTS);
}

export async function getClients(): Promise<Client[]> {
	try {
		return readVersioned<Client>(STORAGE_KEYS.CLIENTS, "data");
	} catch (error) {
		console.error("Error loading clients from localStorage:", error);
		return [];
	}
}

// Replace-or-append a single client by id, then persist the whole blob.
// localStorage has no per-call cost, so this just keeps parity with the
// DataService interface used by the Supabase implementation.
export async function upsertClient(client: Client): Promise<void> {
	const clients = await getClients();
	const next = clients.some(c => c.id === client.id)
		? clients.map(c => (c.id === client.id ? client : c))
		: [...clients, client];
	await saveClients(next);
}
