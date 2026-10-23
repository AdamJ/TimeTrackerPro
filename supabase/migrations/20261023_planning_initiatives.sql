-- Planning initiatives table
-- Goal/deadline/status entries scoped to an existing project, for the
-- per-project planning timeline. Mirrors the planned_tasks shape.

-- project_id intentionally has NO foreign key to projects(id): that column is
-- a global text primary key, not scoped per user (default projects reuse the
-- same id, e.g. "default-0-work", across every account), so a FK+cascade here
-- would let one user's project deletion cascade-delete another user's
-- initiatives, and would fail every upsert for a default project that hasn't
-- synced to this table yet. Cleanup on project deletion is handled at the
-- application layer instead (TimeTrackingContext's cascadeDeleteInitiativesForProjects).
CREATE TABLE IF NOT EXISTS planning_initiatives (
  id             text PRIMARY KEY,
  user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id     text NOT NULL,
  name           text NOT NULL,
  goal           text NOT NULL DEFAULT '',
  status         text NOT NULL DEFAULT 'not_started',
  deadline_type  text NOT NULL DEFAULT 'date',
  deadline_date  date,
  deadline_quarter integer,
  deadline_year  integer,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planning_initiatives_user_id ON planning_initiatives(user_id);
CREATE INDEX IF NOT EXISTS idx_planning_initiatives_project_id ON planning_initiatives(project_id);

CREATE TRIGGER trg_update_planning_initiatives_updated_at
BEFORE UPDATE ON planning_initiatives
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

ALTER TABLE planning_initiatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own initiatives"
  ON planning_initiatives FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own initiatives"
  ON planning_initiatives FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own initiatives"
  ON planning_initiatives FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own initiatives"
  ON planning_initiatives FOR DELETE USING (auth.uid() = user_id);
