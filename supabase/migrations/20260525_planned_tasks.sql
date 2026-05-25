-- Planned tasks table for kanban board feature
-- Tasks created here are planning artifacts separate from time-tracked tasks (current_day.tasks)

CREATE TABLE IF NOT EXISTS planned_tasks (
  id             text PRIMARY KEY,
  user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title          text NOT NULL,
  description    text,
  status         text NOT NULL DEFAULT 'todo',
  project_name   text,
  client         text,
  category_id    text,
  priority       integer NOT NULL DEFAULT 0,
  linked_task_id text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  inserted_at    timestamptz DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planned_tasks_user_id ON planned_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_planned_tasks_status   ON planned_tasks(status);
CREATE INDEX IF NOT EXISTS idx_planned_tasks_priority ON planned_tasks(priority);

CREATE TRIGGER trg_update_planned_tasks_updated_at
BEFORE UPDATE ON planned_tasks
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

ALTER TABLE planned_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own planned tasks"
  ON planned_tasks FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own planned tasks"
  ON planned_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own planned tasks"
  ON planned_tasks FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own planned tasks"
  ON planned_tasks FOR DELETE USING (auth.uid() = user_id);
