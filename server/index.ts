import { createApp, parseAllowedOrigins } from "./app";
import { db, dbClient } from "./db";
import { ensureSchema } from "./schema";

const PORT = Number(process.env.SQL_SERVER_PORT ?? 4001);
const HOST = process.env.SQL_SERVER_HOST ?? "127.0.0.1";
const API_TOKEN = process.env.SQL_API_TOKEN || undefined;
const ALLOWED_ORIGINS = parseAllowedOrigins(process.env.SQL_ALLOWED_ORIGINS);

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);

async function main() {
	if (!API_TOKEN && !LOOPBACK_HOSTS.has(HOST)) {
		throw new Error(
			`Refusing to listen on ${HOST} without SQL_API_TOKEN: the API would be readable and writable by anyone on the network.`
		);
	}

	await ensureSchema(db);

	const app = createApp({ allowedOrigins: ALLOWED_ORIGINS, apiToken: API_TOKEN });
	app.listen(PORT, HOST, () => {
		console.log(`Timetraked SQL backend (${dbClient}) listening on http://${HOST}:${PORT}`);
		console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(", ")}`);
		if (!API_TOKEN) {
			console.warn("⚠️  SQL_API_TOKEN is not set — any local process can read and write your data.");
		}
	});
}

main().catch((error) => {
	console.error("❌ Failed to start SQL backend:", error);
	process.exit(1);
});
