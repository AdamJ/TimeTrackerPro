# Auto Time Full Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the NAS auto-time loop by automatically creating missing project masters, inserting roots, rebuilding affected dates, and writing health reports.

**Architecture:** Extend the existing `scripts/asset-log-time-capture` worker rather than adding a new service. `nasRootAutoParserCore` owns candidate parsing, rule decisions, project/root creation, and rebuild date calculation; `core` owns target-date generation and rebuild mode; a new health-report helper turns parser/runner results into persisted and exported reports.

**Tech Stack:** TypeScript, Vitest, Supabase JS, PostgreSQL migration drafts, existing systemd/docker worker scripts.

---

### Task 1: Database Foundation

**Files:**
- Create: `supabase/migrations_draft_time_tracker/018_time_tracker_auto_time_full_loop.sql`

- [ ] Add candidate statuses, action audit table, health report table, RLS, indexes, and comments.
- [ ] Keep the migration idempotent with `IF NOT EXISTS` and drop/recreate check constraints by name.

### Task 2: Auto Project Creation

**Files:**
- Modify: `scripts/asset-log-time-capture/nasRootAutoParserCore.ts`
- Modify: `scripts/asset-log-time-capture/repository.ts`
- Test: `src/autoTime/nasRootAutoParserCore.test.ts`

- [ ] Write failing tests for `C20260413_友谊商店二期` auto project creation and root insertion.
- [ ] Write failing tests for rejecting `server-backup`, `chat-images`, `console.log`, and `000000-项目梳理`.
- [ ] Write failing tests for duplicate-code conflicts.
- [ ] Implement eligibility decisions, project creation payloads, audit action rows, and promoted root linking.

### Task 3: Rebuild Mode

**Files:**
- Modify: `scripts/asset-log-time-capture/config.ts`
- Modify: `scripts/asset-log-time-capture/core.ts`
- Modify: `scripts/asset-log-time-capture/repository.ts`
- Test: `src/autoTime/runnerConfig.test.ts`
- Test: `src/autoTime/runnerCore.test.ts`

- [ ] Write failing config test for `--rebuild-nas-auto`.
- [ ] Write failing core test proving rebuild clears existing `nas_auto` duplicates before writing fresh tasks.
- [ ] Implement repository method that deletes target-date `entry_source = nas_auto` rows and returns deleted ids for audit metadata.

### Task 4: Health Reports

**Files:**
- Create: `scripts/asset-log-time-capture/healthReportCore.ts`
- Modify: `scripts/asset-log-time-capture/repository.ts`
- Modify: `scripts/asset-log-time-capture/runner.ts`
- Modify: `scripts/asset-log-time-capture/nasRootAutoParser.ts`
- Test: `src/autoTime/healthReportCore.test.ts`

- [ ] Write failing tests for zero-project and high-unattributed detection.
- [ ] Write failing tests for Markdown and JSON health report content.
- [ ] Implement health summary builder and repository insert method.

### Task 5: Worker Orchestration

**Files:**
- Create: `scripts/asset-log-time-capture/fullLoopRunner.ts`
- Modify: `deploy/auto-time/run-auto-time.sh`
- Test: `src/autoTime/fullLoopRunner.test.ts`

- [ ] Write failing orchestration test for parser -> rebuild affected dates -> normal target run -> health report.
- [ ] Implement a single full-loop entry point and update the deploy script to call it.
- [ ] Keep existing parser and runner commands available for manual debugging.

### Verification

- [ ] Run `npm run test -- --run src/autoTime/nasRootAutoParserCore.test.ts src/autoTime/runnerCore.test.ts src/autoTime/runnerConfig.test.ts src/autoTime/healthReportCore.test.ts src/autoTime/fullLoopRunner.test.ts`.
- [ ] Run `npm run test -- --run src/autoTime`.
- [ ] Run `npm run build`.
