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
DB_SSL=false           # set true if your database requires SSL (the server certificate is verified)
DB_SSL_CA=/path/to/ca.pem   # optional: CA bundle for a private or self-signed database certificate
SQL_SERVER_PORT=4001   # port the server/ API listens on
SQL_SERVER_HOST=127.0.0.1   # interface to listen on; anything other than loopback requires SQL_API_TOKEN
SQL_API_TOKEN=             # optional shared secret, required as "Authorization: Bearer <token>"
SQL_ALLOWED_ORIGINS=http://localhost:8080   # comma-separated browser origins allowed by CORS
```

See [Access control](#access-control) for how `SQL_SERVER_HOST`, `SQL_API_TOKEN` and `SQL_ALLOWED_ORIGINS` work together.

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
VITE_SQL_API_TOKEN=        # same value as SQL_API_TOKEN, if you set one
```

Restart the Vite dev server (or rebuild) so the new env vars are picked up.

## Access control

The API has no user accounts, so access is limited at the network and HTTP level:

| Variable | Default | Effect |
| --- | --- | --- |
| `SQL_SERVER_HOST` | `127.0.0.1` | Interface the API listens on. With the default, only processes on the same machine can connect. |
| `SQL_API_TOKEN` | unset | When set, every route except `/api/health` requires `Authorization: Bearer <token>` and returns `401` otherwise. The server refuses to start on a non-loopback `SQL_SERVER_HOST` without it. |
| `SQL_ALLOWED_ORIGINS` | `http://localhost:8080` | Comma-separated browser origins that receive CORS headers. Other websites open in the same browser can't read responses. Add your deployed frontend's origin (and `tauri://localhost`, `http://tauri.localhost` for the desktop app) when not running on the Vite dev server. |
| `VITE_SQL_API_TOKEN` | unset | Frontend copy of `SQL_API_TOKEN`, sent as the bearer token. |

`VITE_SQL_API_TOKEN` is bundled into the browser build, so anyone who can load the frontend can read it. That's acceptable for a personal deployment, where the person running the app owns the server. For a shared deployment, put the API behind a reverse proxy that adds the token server-side, and leave `VITE_SQL_API_TOKEN` unset.

Generate a token with:

```bash
openssl rand -hex 32
```

Errors return a generic `{ "error": "Internal error" }` body; the detail is logged on the server only.

## Migrating existing data

`SqlApiService` implements the same `migrateFromLocalStorage()` / `migrateToLocalStorage()` methods as `SupabaseService`: switching `VITE_DATA_BACKEND` to `sql` on a browser that already has guest `localStorage` data will pull that data into the SQL backend (only filling in entities the backend doesn't already have).

## Troubleshooting

- **Frontend can't reach the backend**: confirm `VITE_SQL_API_URL` matches where `server/index.ts` is actually listening (the startup log prints the host, port and allowed origins). A CORS error in the browser console means the frontend's origin isn't in `SQL_ALLOWED_ORIGINS`.
- **Requests fail with `401 Unauthorized`**: `SQL_API_TOKEN` is set on the server but `VITE_SQL_API_TOKEN` is missing or different. Set both to the same value and restart both processes.
- **Server exits with "Refusing to listen on … without SQL_API_TOKEN"**: `SQL_SERVER_HOST` is set to a non-loopback address. Set `SQL_API_TOKEN`, or remove `SQL_SERVER_HOST` to listen on `127.0.0.1`.
- **TLS errors connecting to the database with `DB_SSL=true`**: the database certificate isn't trusted. Point `DB_SSL_CA` at the CA bundle that signed it.
- **`db:migrate` fails to connect**: double-check `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` and that the database accepts connections from where the script runs.
- **MySQL errors about key length**: this shouldn't happen with the bundled schema (all indexed columns are `VARCHAR`, not `TEXT`), but if you've hand-edited `server/schema.ts`, remember MySQL requires an explicit length on indexed `TEXT` columns.
