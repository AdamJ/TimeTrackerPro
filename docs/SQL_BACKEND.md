# Self-Hosted SQL Backend

Timetraked can run against your own PostgreSQL or MySQL database instead of Supabase or `localStorage`. This is an **opt-in third storage mode** — Supabase and `localStorage` continue to work exactly as before if you don't configure this.

Browsers cannot open a raw MySQL/Postgres connection directly, so this mode adds a small self-hosted REST API (`server/`) that the frontend talks to over HTTP. The API is a thin wrapper around [Knex](https://knexjs.org), so the same code works against either database engine.

## When to use this

- You want to self-host Timetraked with your own database instead of relying on Supabase.
- You're fine running one extra Node process (the `server/` API) alongside the frontend.

If you just want a quick start with no account, the default `localStorage` mode requires no setup at all. If you want multi-device cloud sync, Supabase is the simplest path. This mode is for self-hosters who specifically want their own SQL database.

## Architecture

```text
Browser (SqlApiService) --HTTP--> server/app.ts (Express) --Knex--> Postgres or MySQL
```

- `server/db.ts` — Knex connection, configured by `DB_*` env vars.
- `server/schema.ts` — idempotent schema creation (`ensureSchema`), cross-dialect (Postgres + MySQL).
- `server/repositories/*.ts` — one module per entity (current day, archived days, projects, clients, categories, todos, planned tasks), mirroring `SupabaseService`'s persistence semantics.
- `server/app.ts` / `server/index.ts` — Express app and entrypoint, served under `/api/*`.
- `server/migrate.ts` / `server/seed.ts` — standalone scripts for schema setup and default data.
- `src/services/sqlApiService.ts` — frontend `DataService` implementation that calls the API via `fetch`.

This backend is **single-tenant**: there's no `user_id` or row-level security, since it's meant for one self-hosted deployment with one shared dataset — the same data model as guest/`localStorage` mode, just persisted centrally.

## Setup

### 1. Provision a database

Create an empty PostgreSQL or MySQL database and a user with access to it.

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in the backend-only variables (none of these are `VITE_`-prefixed, so they're never bundled into the browser build):

```bash
DB_CLIENT=pg          # "pg" for PostgreSQL, "mysql2" for MySQL
DB_HOST=localhost
DB_PORT=5432          # 3306 for MySQL
DB_USER=timetraked
DB_PASSWORD=your_db_password_here
DB_NAME=timetraked
DB_SSL=false           # set true if your database requires SSL
SQL_SERVER_PORT=4001   # port the server/ API listens on
```

### 3. Apply the schema

```bash
pnpm run db:migrate
```

Safe to re-run — it only creates tables that don't already exist.

### 4. Seed default data (optional)

```bash
pnpm run db:seed
```

Populates the default categories and projects (and their derived clients) the same way a fresh `localStorage` install would. Safe to re-run — it skips seeding if rows already exist.

### 5. Start the backend API

```bash
pnpm run server:dev    # watch mode, for local development
pnpm run server:start   # plain start, for production
```

### 6. Point the frontend at it

Add to `.env`:

```bash
VITE_DATA_BACKEND=sql
VITE_SQL_API_URL=http://localhost:4001/api
```

Restart the Vite dev server (or rebuild) so the new env vars are picked up.

## Migrating existing data

`SqlApiService` implements the same `migrateFromLocalStorage()` / `migrateToLocalStorage()` methods as `SupabaseService`: switching `VITE_DATA_BACKEND` to `sql` on a browser that already has guest `localStorage` data will pull that data into the SQL backend (only filling in entities the backend doesn't already have).

## Troubleshooting

- **Frontend can't reach the backend**: confirm `VITE_SQL_API_URL` matches where `server/index.ts` is actually listening, and that CORS isn't being blocked (the server enables CORS for all origins by default).
- **`db:migrate` fails to connect**: double-check `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` and that the database accepts connections from where the script runs.
- **MySQL errors about key length**: this shouldn't happen with the bundled schema (all indexed columns are `VARCHAR`, not `TEXT`), but if you've hand-edited `server/schema.ts`, remember MySQL requires an explicit length on indexed `TEXT` columns.
