import "dotenv/config";
import knex, { Knex } from "knex";

// DB_CLIENT selects the self-hosted SQL engine. Accepts friendly aliases
// ("postgres"/"postgresql"/"mysql") as well as the underlying knex client names.
const rawClient = (process.env.DB_CLIENT ?? "postgres").toLowerCase();
const isMysql = rawClient === "mysql" || rawClient === "mysql2";
export const dbClient: "pg" | "mysql2" = isMysql ? "mysql2" : "pg";

const connection: Knex.Config["connection"] = isMysql
	? {
			host: process.env.DB_HOST ?? "127.0.0.1",
			port: Number(process.env.DB_PORT ?? 3306),
			user: process.env.DB_USER ?? "root",
			password: process.env.DB_PASSWORD ?? "",
			database: process.env.DB_NAME ?? "timetraked"
		}
	: {
			host: process.env.DB_HOST ?? "127.0.0.1",
			port: Number(process.env.DB_PORT ?? 5432),
			user: process.env.DB_USER ?? "postgres",
			password: process.env.DB_PASSWORD ?? "",
			database: process.env.DB_NAME ?? "timetraked",
			ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined
		};

export const db: Knex = knex({
	client: dbClient,
	connection,
	pool: { min: 0, max: 10 }
});
