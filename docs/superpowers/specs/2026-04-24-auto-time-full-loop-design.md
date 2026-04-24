# SA-TIME Auto Time Full Loop Design

> Date: 2026-04-24
> Status: design approved; implementation plan is next

## Goal

Build a full automatic closed loop for NAS-based auto timesheets:

1. Detect new NAS project roots from `public.asset_version_log`.
2. Automatically create active SA-TIME project master records when a valid NAS project has no matching project.
3. Automatically insert `time_tracker.project_nas_roots`.
4. Rebuild affected auto-time dates so missed timesheets are repaired without manual reruns.
5. Persist a daily health report that explains what was created, rebuilt, skipped, rejected, or still broken.

The user explicitly chose the full automation boundary: when a NAS path can be parsed into a project code/name, the system should create an active project, add the root mapping, and rerun affected auto-time generation.

## Current Context

The current worker already runs this sequence daily:

```text
nasRootAutoParser.ts -> runner.ts
```

`nasRootAutoParser.ts` can detect candidate roots and auto-insert roots only when an active project already exists. When the project master is missing, candidates are persisted with `candidate_status = missing_project_master`.

Observed issue on `2026-04-23`:

- `具志坚强` had NAS activity under `/daga-2025-project/CONCEPT/C20260413_友谊商店二期`.
- `time_tracker.projects` had no active `C20260413` project.
- `time_tracker.project_nas_roots` had no root for that NAS path.
- The run diagnostic showed `raw_total_minutes = 513`, `unattributed_minutes = 513`, `distinct_project_count = 0`, `project_minutes = []`.
- No `auto_time_run_items` or `tasks` were generated for that user/date.

Other users on the same latest run also had full or partial misses:

- Full zero-project users: `霍莹莹`, `公磊`, `具志坚强`.
- High unattributed users included `阮漪婷`, `薛达`, `张龙潇`.

This proves the missing link is not log ingestion. The missing link is the project-master and rebuild closure after candidate discovery.

## Design Principles

1. Full automation is allowed, but it must be rule-driven.
2. The system may create active projects, but every automatic decision must be auditable.
3. Rebuild is part of the feature, not an operator task.
4. Existing manual tasks are never overwritten.
5. Existing unrelated user changes or hand-filled timesheets have priority.
6. Non-project paths must be rejected by machine rules to avoid polluting project master data.
7. Project-code conflicts must not be guessed if they would merge costs into the wrong project.

## Proposed Worker Flow

The daily worker changes from:

```text
parse NAS roots
-> generate auto time
```

to:

```text
parse NAS roots
-> auto create missing projects
-> auto insert project_nas_roots
-> queue affected date rebuilds
-> rebuild affected dates
-> generate normal target-date auto time
-> analyze zero-project and high-unattributed users
-> write daily health report
-> write Markdown/JSON report files
```

The normal daily target is still yesterday in `Asia/Shanghai`.

## Project Creation Rules

The system automatically creates a project when all of these are true:

1. The candidate root has a parseable project code or project name.
2. The root path is under an accepted project area:
   - `/daga-YYYY-project/CONCEPT/<project-segment>`
   - `/daga-YYYY-project/<project-segment>`
3. The parsed code matches one of:
   - `CYYYYMMDD`
   - `D####`
4. The parsed project name is non-empty after removing the code and separators.
5. No active project exists with the same exact `source_project_code`.
6. The candidate is not rejected by blacklist rules.

When these rules pass, create:

```text
time_tracker.projects
name = parsed_project_name
source_project_code = parsed_project_code
status = active
contract_amount = 0
human_cost_budget = 0
human_cost_ratio = organization.default_human_cost_ratio
manager_user_id = null
```

The project should be marked as auto-created through an audit/action table, not by overloading business fields.

## Rejection Rules

The system must not create active projects for paths whose project segment is clearly not a project. Reject when the parsed name or segment matches any of:

```text
新建文件夹
新建文件夹 ->
server-backup
chat-images
console.log
项目梳理
000000-项目梳理
backup
temp
tmp
test
```

Reject candidates where:

- No project code is found and the name is a known infrastructure or temporary folder.
- The path is a file-like root such as `console.log`.
- The candidate code is a known placeholder such as `000000`.
- The normalized root is already rejected for the same org.

Rejected candidates remain in candidate history with `candidate_status = rejected_by_rule` and a machine-readable reason.

## Conflict Rules

If the candidate code matches multiple active projects, do not auto-pick one.

Set:

```text
candidate_status = conflict_needs_manual_fix
match_method = code_exact
notes = source_project_code matched multiple active projects
```

This exception appears in the health report. The system should not create another duplicate project and should not attach a root to an arbitrary project.

This is the only intentional break from complete automation, because assigning hours to the wrong active project corrupts cost accounting more severely than leaving a visible exception.

## Database Changes

### `time_tracker.auto_time_project_root_candidates`

Extend `candidate_status` to support:

```text
auto_project_created
auto_root_inserted
rebuild_queued
rebuild_completed
rejected_by_rule
conflict_needs_manual_fix
failed
```

Existing statuses remain valid:

```text
auto_inserted
pending_review
missing_project_master
rejected
```

### `time_tracker.auto_time_project_actions`

Create an audit table for automatic project and root actions:

```text
id uuid primary key
org_id uuid not null
target_work_date date not null
candidate_root_path text not null
parsed_project_code text
parsed_project_name text
action_type text not null
action_status text not null
project_id uuid
project_root_id uuid
run_id uuid
rebuild_target_work_date date
reason text
metadata jsonb not null default '{}'
created_at timestamptz not null default now()
```

`action_type` values:

```text
auto_create_project
auto_insert_root
queue_rebuild
complete_rebuild
reject_candidate
conflict_candidate
fail_candidate
```

`action_status` values:

```text
completed
skipped
failed
```

### `time_tracker.auto_time_daily_health_reports`

Create a permanent database report table:

```text
id uuid primary key
org_id uuid not null
target_work_date date not null
run_id uuid
parser_started_at timestamptz
parser_finished_at timestamptz
runner_started_at timestamptz
runner_finished_at timestamptz
status text not null
total_logs_scanned integer not null default 0
total_logs_accepted integer not null default 0
total_projects_auto_created integer not null default 0
total_roots_auto_inserted integer not null default 0
total_rebuild_dates_queued integer not null default 0
total_rebuild_dates_completed integer not null default 0
total_tasks_written integer not null default 0
total_zero_project_users integer not null default 0
total_high_unattributed_users integer not null default 0
total_conflict_candidates integer not null default 0
total_rejected_candidates integer not null default 0
summary jsonb not null default '{}'
created_at timestamptz not null default now()
```

The report table is the source of truth for operational review. Worker log files are secondary output only.

## Rebuild Design

When a new project or root is created, calculate affected local work dates from the candidate's `first_seen_at` and `last_seen_at`.

Example:

```text
first_seen_at = 2026-04-15T17:29:42+00:00
last_seen_at = 2026-04-23T07:53:46+00:00
timezone = Asia/Shanghai
affected dates = 2026-04-16 ... 2026-04-23
```

Skip dates that are weekends or configured holidays using the same rules as the normal runner.

For each affected date, run auto-time in rebuild mode:

```text
runner.ts --date=<date> --rebuild-nas-auto
```

Rebuild mode must:

1. Preserve manual tasks.
2. Remove or supersede existing `entry_source = nas_auto` tasks for the target date.
3. Insert fresh `auto_time_run_items`.
4. Insert fresh `tasks`.
5. Link generated tasks back to run items.
6. Record rebuild action rows.

Preferred implementation is soft superseding old generated tasks. If the table change is too large for the first implementation, physical deletion of `entry_source = nas_auto` rows for the target date is acceptable only if the rebuild action table records the deleted task ids first.

## Health Report Contents

Each daily report must include:

```text
target_work_date
status
run_id
projects_auto_created
roots_auto_inserted
rebuild_dates_queued
rebuild_dates_completed
zero_project_users
high_unattributed_users
conflict_candidates
rejected_candidates
tasks_written
```

### Zero-Project Users

A zero-project user is:

```text
raw_total_minutes > 0
distinct_project_count = 0
```

These users had NAS activity but no recognized project. They are the highest priority anomalies.

### High-Unattributed Users

A high-unattributed user is:

```text
raw_total_minutes > 0
distinct_project_count > 0
unattributed_minutes / raw_total_minutes >= 0.5
```

These users may still have generated tasks, but the project allocation is suspicious because most of the day was not tied to recognized projects.

### Report Storage

The worker writes reports to three places:

1. Database truth:

```text
time_tracker.auto_time_daily_health_reports
```

2. Server export:

```text
/opt/sa-time/auto-time/reports/YYYY-MM-DD-health.md
/opt/sa-time/auto-time/reports/YYYY-MM-DD-health.json
```

3. Future frontend page:

```text
Admin -> Auto Time Health
```

The first implementation may create the table and server export before building the frontend page.

## Frontend Follow-Up

Add an admin-only page after the backend loop is stable:

```text
管理后台 -> 自动工时健康
```

Default view: last 7 target work dates.

Columns:

```text
日期
状态
自动建项目
自动补 root
重跑日期
写入工时
完全未归属人数
高未归属人数
冲突候选
拒绝候选
```

Detail drawer:

```text
auto-created projects
auto-inserted roots
rebuild dates
zero-project users
high-unattributed users
conflict candidates
rejected candidates
```

## Expected Behavior For The Known Case

For:

```text
/daga-2025-project/CONCEPT/C20260413_友谊商店二期
```

The system should:

1. Parse `source_project_code = C20260413`.
2. Parse `name = 友谊商店二期`.
3. Create active project `友谊商店二期`.
4. Insert root `/daga-2025-project/CONCEPT/C20260413_友谊商店二期`.
5. Queue rebuild dates based on the candidate first/last seen range.
6. Rebuild those dates.
7. Generate tasks for users whose logs previously had `distinct_project_count = 0`, including `具志坚强` on `2026-04-23`.
8. Write a health report showing the auto-created project, inserted root, rebuild dates, and repaired zero-project users.

## Testing Strategy

### Unit Tests

Add focused Vitest coverage for:

- Candidate path parsing.
- Auto-create eligibility rules.
- Rejection rules.
- Conflict rules.
- Affected date calculation from `first_seen_at` / `last_seen_at`.
- Health report summary building.
- Rebuild task selection.

### Repository Tests

Mock Supabase repository methods for:

- Creating auto projects.
- Inserting roots.
- Writing action rows.
- Writing health reports.
- Rebuild mode deleting/superseding old `nas_auto` tasks.

### Integration Dry Run

Run:

```bash
npm run auto-time:parse-nas-roots -- --org-id=<org_id> --date=2026-04-23 --dry-run
```

Expected: `C20260413_友谊商店二期` appears as eligible for auto project creation, while `server-backup`, `chat-images`, and `console.log` are rejected.

### Production Verification

After deploying:

1. Run the worker for `2026-04-23`.
2. Confirm `time_tracker.projects` contains `C20260413 / 友谊商店二期`.
3. Confirm `project_nas_roots` contains the matching NAS root.
4. Confirm rebuild produced `nas_auto` tasks for affected users.
5. Confirm health report exists in `time_tracker.auto_time_daily_health_reports`.

## Rollback Strategy

Every automatic project/root action has an audit row. If a project is wrongly created:

1. Mark the project inactive or archived.
2. Mark related `project_nas_roots.is_active = false`.
3. Rebuild affected dates again.
4. The health report records the corrected result.

If rebuild creates wrong `nas_auto` tasks, rerun rebuild after fixing project/root data. Manual tasks remain untouched.

## Implementation Defaults

These defaults are selected for implementation:

1. Auto-created projects are active immediately.
2. Auto-created project budgets default to zero.
3. Manager is null.
4. Root conflicts do not auto-resolve.
5. Backend tables and worker reports are implemented before the frontend health page.
6. The first implementation may physically delete old `nas_auto` target-date rows during rebuild if it logs deleted ids in `auto_time_project_actions.metadata`.
