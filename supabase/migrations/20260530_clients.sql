-- Clients table
-- Promotes clients from a per-device localStorage JSON blob to a real,
-- cross-device-synced Supabase table. Mirrors the projects/categories shape.

CREATE TABLE IF NOT EXISTS clients (
  id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  archived boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);

-- Enable Row Level Security
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own clients"
  ON clients FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clients"
  ON clients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients"
  ON clients FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients"
  ON clients FOR DELETE
  USING (auth.uid() = user_id);

-- One-time backfill: seed the clients table from the distinct client name
-- strings already referenced by each user's projects. Idempotent — re-running
-- it (or running it after some clients already exist) inserts only the
-- genuinely missing (user_id, name) pairs, so it is safe across devices and
-- safe to apply more than once.
INSERT INTO clients (id, user_id, name, archived, created_at)
SELECT gen_random_uuid()::text, p.user_id, p.client, false, now()
FROM (
  SELECT DISTINCT user_id, trim(client) AS client
  FROM projects
  WHERE client IS NOT NULL AND trim(client) <> ''
) p
WHERE NOT EXISTS (
  SELECT 1 FROM clients c
  WHERE c.user_id = p.user_id AND c.name = p.client
);
