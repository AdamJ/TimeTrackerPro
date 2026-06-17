import { db, dbClient } from "./db";
import { ensureSchema } from "./schema";

async function main() {
	console.log(`Applying schema to ${dbClient} database...`);
	await ensureSchema(db);
	console.log("✅ Schema is up to date.");
}

main()
	.catch((error) => {
		console.error("❌ Migration failed:", error);
		process.exitCode = 1;
	})
	.finally(() => db.destroy());
