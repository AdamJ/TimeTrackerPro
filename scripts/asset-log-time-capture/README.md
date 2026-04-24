# asset-log-time-capture

SA-TIME 自动工时 runner 骨架。

当前阶段只完成：

- 配置解析
- 目标工作日窗口计算
- 周末 / 法定节假日跳过
- 真实读取 `public.asset_version_log` 的分页加载器
- 忽略账号加载与首轮日志过滤统计
- `sa_ai_user_id / nas_user_aliases` 用户映射
- `project_nas_roots` 根路径命中
- `用户 + 日期 + 项目` 候选聚合去重
- 阶段 A 后台原始时间分配链路（相邻区间归前一个项目）
- `raw_last_activity_at / raw_total_minutes / unattributed_minutes`
- `raw_project_minutes / normalized_project_minutes` 诊断字段
- `allocation_mode = even_split | interval_to_previous_project` 正式分配开关（当前默认 `interval_to_previous_project`）
- `allocation_meta` 与 summary 中的大间隔 / 保守模式标记
- `allocation_sample_rows` 领导可读样表输出
- `auto_time_run_items` 写入
- 手填优先判断
- 正式分钟分配写入
- `time_tracker.tasks` 正式写入
- `/timesheet` 月历格子已按 `tasks.entry_source = nas_auto` 显示条目级 `AUTO` 标记
- `generated_task_id / source_run_id / source_item_id` 关联回填
- `auto_time_runs` 生命周期骨架
- NAS 新项目根路径候选解析与自动补全脚本
- `auto_time_project_root_candidates` 候选落库草稿
- dry-run 输出

当前阶段还未完成：

- `017_time_tracker_auto_time_project_root_candidates.sql` 执行到共享库
- NAS 根路径解析器的服务器部署与每日定时挂载
- 待确认 / 缺主数据候选的业务审核收口
- 上线后持续观察与异常口径收口

## 用法

```bash
npm run auto-time:dry-run -- --org-id=<org_uuid>
```

```bash
npm run auto-time:run -- --org-id=<org_uuid> --date=2026-04-21
```

```bash
npm run auto-time:parse-nas-roots -- --org-id=<org_uuid> --date=2026-04-22
```

```bash
npm run auto-time:sample-report -- --org-id=<org_uuid> --days=7 --end-date=2026-04-21
```

```bash
npm run auto-time:sample-report -- --org-id=<org_uuid> --days=7 --end-date=2026-04-21 --markdown-output=docs/trial-runs/2026-04-21-sample-report.md
```

## 必填环境变量

正式运行：

- `SA_TIME_SUPABASE_URL`
- `SA_TIME_SUPABASE_SERVICE_ROLE_KEY`
- `SA_TIME_ORG_ID` 或 `--org-id`

可选：

- `SA_TIME_TIMEZONE`，默认 `Asia/Shanghai`
- `SA_TIME_IGNORE_WEEKENDS`，默认 `true`
- `SA_TIME_ACTIONS`，默认 `create,write,rename,delete`
- `SA_TIME_SOURCE_TABLE`，默认 `public.asset_version_log`
- `SA_TIME_ALLOCATION_MODE`，默认 `even_split`
- `SA_TIME_LARGE_GAP_THRESHOLD_MINUTES`，默认 `120`
- `SA_TIME_SKIP_FORMAL_WRITE_ON_LARGE_GAP`，默认 `false`
- `SA_TIME_NAS_ROOT_LOOKBACK_DAYS`，默认 `7`

## Worker 部署骨架

当前仓库已经补了独立 worker 部署骨架，目录在：

- `deploy/auto-time/docker-compose.auto-time.yml`
- `deploy/auto-time/.env.auto-time.prod.example`
- `deploy/auto-time/run-auto-time.sh`
- `deploy/auto-time/systemd/sa-time-auto-time.service`
- `deploy/auto-time/systemd/sa-time-auto-time.timer`

设计约束：

- 自动工时是独立 worker，不是 HTTP 后端
- worker 直接写共享 Supabase 的 `time_tracker.*`
- 不暴露任何端口
- 推荐由 `systemd timer` 触发 `docker compose run --rm`

推荐服务器目录：

- 代码目录：`/home/ubuntu/sa-time-auto-time`
- deploy 目录：`/home/ubuntu/sa-time-auto-time/deploy/auto-time`
- 环境文件：`/home/ubuntu/sa-time-auto-time/deploy/auto-time/.env.auto-time.prod`
- 日志目录：`/opt/sa-time/auto-time/logs`

推荐执行方式：

```bash
cd /home/ubuntu/sa-time-auto-time/deploy/auto-time
cp .env.auto-time.prod.example .env.auto-time.prod
docker compose --env-file .env.auto-time.prod -f docker-compose.auto-time.yml run --rm sa-time-auto-time-worker
```

注意：

- `run-auto-time.sh` 当前会在容器内执行 `npm ci`，所以代码目录挂载必须可写，不能使用只读挂载。
- 首次上线建议先手工跑一次 service，确认 `auto_time_runs / auto_time_run_items / tasks` 三层结果一致，再启用 timer。

## 当前行为说明

- 如果提供 `SA_TIME_SUPABASE_URL` 与 `SA_TIME_SUPABASE_SERVICE_ROLE_KEY`，`dry-run` 会真实读取 `public.asset_version_log` 并输出扫描/接受统计。
- 如果同时存在 `nas_user_aliases` 与 `project_nas_roots` 数据，`dry-run` 会继续输出未映射用户数、未命中项目数、候选聚合数和阶段 A 原始分配诊断 summary。
- summary 会同时区分诊断 `480` 映射分钟与当前正式写入分钟，并输出大间隔 / 多项目诊断标记。
- summary 还会输出 `allocation_sample_rows`，方便直接拿最近样本给领导看。
- `auto-time:sample-report` 会按最近 N 个工作日逐天执行 dry-run，并输出聚合统计与逐日样表；默认最近 `7` 个工作日。
- 如提供 `--markdown-output=<path>`，会额外写出一份领导可读的 Markdown 试跑报告。
- `auto-time:parse-nas-roots` 会扫描“目标工作日 + 前 7 天”内尚未命中 `project_nas_roots` 的 NAS 日志，自动提取候选根路径。
- 对 `source_project_code` 唯一精确命中的候选，解析器会自动补入 `project_nas_roots`；名称命中或缺主数据的候选只写入 `auto_time_project_root_candidates`，不直接进入正式工时。
- 如果只提供 `SA_TIME_ORG_ID`，`dry-run` 仍可作为纯 skeleton 模式运行，用于验证日期窗口和命令入口。
- 非 dry-run 且具备数据库连接时，runner 已可写入 `auto_time_run_items`，并对已有手填工时的用户按 `manual_override_skipped` 落审计记录，同时保留阶段 A 诊断字段与 `allocation_meta`。
- 非 dry-run 且具备数据库连接时，runner 已可继续写入 `time_tracker.tasks`，并把生成出的 task id 回填到 `auto_time_run_items.generated_task_id`；仓库默认正式写入口径现已切到 `allocation_mode=interval_to_previous_project`。
- 当前默认口径下，`3+` 项目日也会按同一套“相邻区间归前一个项目 + 480 映射”规则正式拆分；`policy_guard_skipped` 仅保留给未来可能启用的大间隔拦截。
- 非 dry-run 且具备数据库连接时，runner 会跳过法定节假日，并对同一 `work_date` 下已存在的 `nas_auto` 任务做重复写入保护。
- 前端月历继续沿用现有“项目名称 + 小时数”胶囊样式，但若条目来自 `entry_source = nas_auto`，会在胶囊内追加 `AUTO` 标记，不展示额外诊断摘要。
- 2026-04-21 已在共享库执行 `014 / 015`，并以最小 trial seed 对 `2026-04-20` 跑通首轮真实 trial-run，生成 5 条 `nas_auto` 自动工时。
- 2026-04-22 已完成服务器 worker 部署：`sa-time-auto-time.timer` 已启用，`sa-time-auto-time.service` 可成功手工触发并按既有重复写入保护跳过已存在任务。
- 2026-04-22 已在共享库执行 `016`，并完成最近 `7` 个工作日真实 sample-report；实际输出 `94` 条样本行，其中 `18` 个单项目日、`1` 个双项目日、`5` 个大间隔命中日。Markdown 报告已落在 [docs/trial-runs/2026-04-22-auto-time-sample-report.md](/mnt/f/SA-TIME/02_核心源码_Src/TimeTrackerPro/docs/trial-runs/2026-04-22-auto-time-sample-report.md)。
- 2026-04-22 已修复“连续同项目日志压缩后误吃掉最后项目时段”的原始分配 bug：连续同项目区间现在保留首个事件作为区间起点，最后一个项目可正确延伸到 `raw_last_activity_at`。
- 2026-04-22 已对 `2026-04-21` 按修复后的新规则完成真实重跑：`runId = 2d15265b-a9be-4550-8c4c-efeaf49975ac`，`auto_time_run_items` `5` 条，`tasks(entry_source=nas_auto)` `5` 条；其中胡芳婷由旧的 `480 + 0` 修正为 `342 + 138`。
- 2026-04-22 已补 `5` 条 `project_nas_roots` 映射：`成都王府井 / 天津郁江新里城更文创园（公交二厂） / 办公室 / 青岛麦岛站 / 深圳罗山公园商业`，并对 `2026-04-22` 重新正式入账：`runId = 23655490-a3bd-4bc0-afc4-9324474bed1b`，当天 `tasks(entry_source=nas_auto)` 由 `4` 条增至 `9` 条。
- 2026-04-22 已补 NAS 根路径自动解析代码：新增 `nasRootAutoParser.ts / nasRootAutoParserCore.ts / nasRootAutoParserConfig.ts`、`017_time_tracker_auto_time_project_root_candidates.sql`、`auto-time:parse-nas-roots` 命令与对应 Vitest 用例；当前处于“代码已落仓，待共享库执行 migration 与挂前置定时任务”状态。
- 2026-04-22 已在共享 Supabase 执行 `017`，并对 `2026-04-22` 跑通一次真实 dry-run 与 non-dry-run：扫描 `1267068` 条日志、接受 `123666` 条、命中现有根路径 `17191` 条、生成候选 `32` 条，其中自动补入 `project_nas_roots` `14` 条、`pending_review` `1` 条、`missing_project_master` `17` 条。
- 2026-04-22 已把 `deploy/auto-time/run-auto-time.sh` 调整为“先跑 `nasRootAutoParser.ts`，再跑正式 `runner.ts`”；当前代码侧已挂到 worker 前置阶段，服务器代码目录仍需同步本次改动后才会在线生效。
