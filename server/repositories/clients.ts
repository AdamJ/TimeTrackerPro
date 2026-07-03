import { db } from "../db";
import type { Client } from "../types";

interface ClientRow {
	id: string;
	name: string;
	archived: boolean | number;
	created_at: Date | string;
	address_street: string | null;
	address_city: string | null;
	address_state: string | null;
	address_zip: string | null;
	address_country: string | null;
	contact_name: string | null;
	contact_email: string | null;
	contact_website: string | null;
}

function mapRow(row: ClientRow): Client {
	return {
		id: row.id,
		name: row.name,
		archived: !!row.archived,
		createdAt: new Date(row.created_at).toISOString(),
		addressStreet: row.address_street ?? undefined,
		addressCity: row.address_city ?? undefined,
		addressState: row.address_state ?? undefined,
		addressZip: row.address_zip ?? undefined,
		addressCountry: row.address_country ?? undefined,
		contactName: row.contact_name ?? undefined,
		contactEmail: row.contact_email ?? undefined,
		contactWebsite: row.contact_website ?? undefined
	};
}

function clientToRow(client: Client) {
	return {
		id: client.id,
		name: client.name,
		archived: client.archived === true,
		created_at: client.createdAt,
		address_street: client.addressStreet ?? null,
		address_city: client.addressCity ?? null,
		address_state: client.addressState ?? null,
		address_zip: client.addressZip ?? null,
		address_country: client.addressCountry ?? null,
		contact_name: client.contactName ?? null,
		contact_email: client.contactEmail ?? null,
		contact_website: client.contactWebsite ?? null
	};
}

export async function getClients(): Promise<Client[]> {
	const rows: ClientRow[] = await db("clients").orderBy("name", "asc");
	return rows.map(mapRow);
}

export async function saveClients(clients: Client[]): Promise<void> {
	if (clients.length === 0) {
		await db("clients").delete();
		return;
	}

	const existing = await db("clients").select("id");
	const existingIds = new Set(existing.map((r) => r.id));
	const newIds = new Set(clients.map((c) => c.id));
	const toDelete = [...existingIds].filter((id) => !newIds.has(id));
	if (toDelete.length > 0) {
		await db("clients").whereIn("id", toDelete).delete();
	}

	const rows = clients.map(clientToRow);
	await db("clients").insert(rows).onConflict("id").merge();
}

export async function upsertClient(client: Client): Promise<void> {
	await db("clients").insert(clientToRow(client)).onConflict("id").merge();
}
