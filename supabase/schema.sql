-- Supabase schema for TimeTrackerPro
-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  client text NOT NULL,
  hourly_rate numeric(10,2),
  color text,
  is_billable boolean DEFAULT true,
  inserted_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text,
  icon text,
  is_billable boolean DEFAULT true,
  inserted_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  duration bigint, -- in milliseconds
  project_id text,
  project_name text, -- denormalized for easier querying
  client text,
  category_id text,
  category_name text, -- denormalized for easier querying
  day_record_id text, -- reference to archived_days.id if archived
  is_current boolean DEFAULT false,
  inserted_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_start_time ON tasks(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON tasks(category_id);
CREATE INDEX IF NOT EXISTS idx_tasks_day_record_id ON tasks(day_record_id);
CREATE INDEX IF NOT EXISTS idx_tasks_is_current ON tasks(is_current);
CREATE INDEX IF NOT EXISTS idx_tasks_client ON tasks(client);

-- Create archived_days table
CREATE TABLE IF NOT EXISTS archived_days (
  id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date text NOT NULL,
  total_duration bigint,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  notes text,
  inserted_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_archived_days_user_id ON archived_days(user_id);
CREATE INDEX IF NOT EXISTS idx_archived_days_start_time ON archived_days(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_archived_days_date ON archived_days(date);

-- Create current_day table
CREATE TABLE IF NOT EXISTS current_day (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_day_started boolean DEFAULT false,
  day_start_time timestamptz,
  current_task_id text, -- reference to current active task
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

-- Apply update triggers to all tables
CREATE TRIGGER trg_update_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER trg_update_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER trg_update_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER trg_update_archived_updated_at
BEFORE UPDATE ON archived_days
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER trg_update_current_updated_at
BEFORE UPDATE ON current_day
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE current_day ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Users can view their own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for categories
CREATE POLICY "Users can view their own categories" ON categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories" ON categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories" ON categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories" ON categories
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for tasks
CREATE POLICY "Users can view their own tasks" ON tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks" ON tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks" ON tasks
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for archived_days
CREATE POLICY "Users can view their own archived days" ON archived_days
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own archived days" ON archived_days
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own archived days" ON archived_days
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own archived days" ON archived_days
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for current_day
CREATE POLICY "Users can view their own current day" ON current_day
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own current day" ON current_day
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own current day" ON current_day
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own current day" ON current_day
  FOR DELETE USING (auth.uid() = user_id);

-- Migration: Add is_billable columns if they don't exist
DO $$
BEGIN
  -- Add is_billable to projects table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'is_billable'
  ) THEN
    ALTER TABLE projects ADD COLUMN is_billable boolean DEFAULT true;
  END IF;

  -- Add is_billable to categories table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'is_billable'
  ) THEN
    ALTER TABLE categories ADD COLUMN is_billable boolean DEFAULT true;
  END IF;
END $$;
