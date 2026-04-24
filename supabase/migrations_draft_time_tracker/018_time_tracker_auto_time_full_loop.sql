-- Auto-time full-loop support:
-- 1. allow parser statuses for auto project creation and conflict/reject states
-- 2. persist automatic project/root/rebuild audit actions
-- 3. persist daily health reports for operational review

ALTER TABLE time_tracker.auto_time_run_items
  DROP CONSTRAINT IF EXISTS auto_time_run_items_resolution_status_check;

ALTER TABLE time_tracker.auto_time_run_items
  ADD CONSTRAINT auto_time_run_items_resolution_status_check
  CHECK (
    resolution_status IN (
      'accepted',
      'manual_override_skipped',
      'policy_guard_skipped'
    )
  );

ALTER TABLE time_tracker.auto_time_project_root_candidates
  DROP CONSTRAINT IF EXISTS auto_time_project_root_candidates_candidate_status_check;

ALTER TABLE time_tracker.auto_time_project_root_candidates
  ADD CONSTRAINT auto_time_project_root_candidates_candidate_status_check
  CHECK (
    candidate_status IN (
      'auto_inserted',
      'auto_project_created',
      'auto_root_inserted',
      'rebuild_queued',
      'rebuild_completed',
      'pending_review',
      'missing_project_master',
      'rejected',
      'rejected_by_rule',
      'conflict_needs_manual_fix',
      'failed'
    )
  );

CREATE TABLE IF NOT EXISTS time_tracker.auto_time_project_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES time_tracker.organizations(id) ON DELETE CASCADE,
  target_work_date date NOT NULL,
  candidate_root_path text NOT NULL,
  parsed_project_code text,
  parsed_project_name text,
  action_type text NOT NULL CHECK (
    action_type IN (
      'auto_create_project',
      'auto_insert_root',
      'queue_rebuild',
      'complete_rebuild',
      'reject_candidate',
      'conflict_candidate',
      'fail_candidate'
    )
  ),
  action_status text NOT NULL CHECK (
    action_status IN ('completed', 'skipped', 'failed')
  ),
  project_id uuid REFERENCES time_tracker.projects(id) ON DELETE SET NULL,
  project_root_id uuid REFERENCES time_tracker.project_nas_roots(id) ON DELETE SET NULL,
  run_id uuid REFERENCES time_tracker.auto_time_runs(id) ON DELETE SET NULL,
  rebuild_target_work_date date,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tt_auto_time_project_actions_org_date_idx
  ON time_tracker.auto_time_project_actions (org_id, target_work_date DESC);

CREATE INDEX IF NOT EXISTS tt_auto_time_project_actions_action_idx
  ON time_tracker.auto_time_project_actions (action_type, action_status, created_at DESC);

CREATE INDEX IF NOT EXISTS tt_auto_time_project_actions_project_idx
  ON time_tracker.auto_time_project_actions (project_id)
  WHERE project_id IS NOT NULL;

ALTER TABLE time_tracker.auto_time_project_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tt_auto_time_project_actions_select ON time_tracker.auto_time_project_actions;
CREATE POLICY tt_auto_time_project_actions_select
ON time_tracker.auto_time_project_actions
FOR SELECT
USING (time_tracker.is_org_member(org_id));

DROP POLICY IF EXISTS tt_auto_time_project_actions_write ON time_tracker.auto_time_project_actions;
CREATE POLICY tt_auto_time_project_actions_write
ON time_tracker.auto_time_project_actions
FOR ALL
USING (time_tracker.has_org_role(org_id, ARRAY['owner', 'admin', 'project_manager', 'hr']))
WITH CHECK (time_tracker.has_org_role(org_id, ARRAY['owner', 'admin', 'project_manager', 'hr']));

COMMENT ON TABLE time_tracker.auto_time_project_actions IS
'Audit trail for automatic project creation, root insertion, rebuild queueing and exception decisions in the NAS auto-time full loop.';

CREATE TABLE IF NOT EXISTS time_tracker.auto_time_daily_health_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES time_tracker.organizations(id) ON DELETE CASCADE,
  target_work_date date NOT NULL,
  run_id uuid REFERENCES time_tracker.auto_time_runs(id) ON DELETE SET NULL,
  parser_started_at timestamptz,
  parser_finished_at timestamptz,
  runner_started_at timestamptz,
  runner_finished_at timestamptz,
  status text NOT NULL CHECK (
    status IN ('completed', 'completed_with_anomalies', 'failed')
  ),
  total_logs_scanned integer NOT NULL DEFAULT 0,
  total_logs_accepted integer NOT NULL DEFAULT 0,
  total_projects_auto_created integer NOT NULL DEFAULT 0,
  total_roots_auto_inserted integer NOT NULL DEFAULT 0,
  total_rebuild_dates_queued integer NOT NULL DEFAULT 0,
  total_rebuild_dates_completed integer NOT NULL DEFAULT 0,
  total_tasks_written integer NOT NULL DEFAULT 0,
  total_zero_project_users integer NOT NULL DEFAULT 0,
  total_high_unattributed_users integer NOT NULL DEFAULT 0,
  total_conflict_candidates integer NOT NULL DEFAULT 0,
  total_rejected_candidates integer NOT NULL DEFAULT 0,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tt_auto_time_daily_health_reports_org_date_idx
  ON time_tracker.auto_time_daily_health_reports (org_id, target_work_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS tt_auto_time_daily_health_reports_status_idx
  ON time_tracker.auto_time_daily_health_reports (status, target_work_date DESC);

ALTER TABLE time_tracker.auto_time_daily_health_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tt_auto_time_daily_health_reports_select ON time_tracker.auto_time_daily_health_reports;
CREATE POLICY tt_auto_time_daily_health_reports_select
ON time_tracker.auto_time_daily_health_reports
FOR SELECT
USING (time_tracker.is_org_member(org_id));

DROP POLICY IF EXISTS tt_auto_time_daily_health_reports_write ON time_tracker.auto_time_daily_health_reports;
CREATE POLICY tt_auto_time_daily_health_reports_write
ON time_tracker.auto_time_daily_health_reports
FOR ALL
USING (time_tracker.has_org_role(org_id, ARRAY['owner', 'admin', 'project_manager', 'hr']))
WITH CHECK (time_tracker.has_org_role(org_id, ARRAY['owner', 'admin', 'project_manager', 'hr']));

COMMENT ON TABLE time_tracker.auto_time_daily_health_reports IS
'Daily operational health reports produced by the NAS auto-time full-loop worker.';
