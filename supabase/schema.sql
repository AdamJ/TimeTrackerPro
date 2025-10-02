-- Supabase schema for TimeTrackerPro
-- Create archived_days table

CREATE TABLE IF NOT EXISTS archived_days (
  id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date text NOT NULL,
  tasks jsonb,
  total_duration bigint,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  notes text,
  inserted_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_archived_days_user_id ON archived_days(user_id);
CREATE INDEX IF NOT EXISTS idx_archived_days_start_time ON archived_days(start_time DESC);

-- Create current_day table
CREATE TABLE IF NOT EXISTS current_day (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_day_started boolean DEFAULT false,
  day_start_time timestamptz,
  tasks jsonb,
  inserted_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_current_day_user_id ON current_day(user_id);

-- Helper: trigger to update updated_at on change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_update_archived_updated_at
BEFORE UPDATE ON archived_days
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER trg_update_current_updated_at
BEFORE UPDATE ON current_day
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();
