import { createApp } from "./app";
import { db, dbClient } from "./db";
import { ensureSchema } from "./schema";

const PORT = Number(process.env.SQL_SERVER_PORT ?? 4001);

async function main() {
	await ensureSchema(db);

	const app = createApp();
	app.listen(PORT, () => {
		console.log(`Timetraked SQL backend (${dbClient}) listening on http://localhost:${PORT}`);
	});
}

main().catch((error) => {
	console.error("❌ Failed to start SQL backend:", error);
	process.exit(1);
});
