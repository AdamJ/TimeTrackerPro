-- SA-TIME NAS 日志活动跨度诊断 SQL
--
-- 用途：
-- 1. 先做“后台活动跨度”诊断，不直接改正式 8h 入账口径
-- 2. 以 Asia/Shanghai 为业务日期
-- 3. 以每天 10:00 作为后台跨度统计起点
-- 4. 过滤明显噪音：thumbnailimage / crdownload / embedded_files / ViewCapture / .rhl / tmp-like
--
-- 注意：
-- - 该 SQL 的输出是“活动信号”，不是正式工时事实
-- - `span_from_10h` 仅表示 10:00 之后到最后有效活动的跨度
-- - `project_candidates` 是候选项目，不应直接等同于正式入账项目

WITH base AS (
  SELECT
    (detected_at AT TIME ZONE 'Asia/Shanghai')::date AS work_date,
    detected_at,
    created_at,
    nas_username,
    sa_ai_user_id,
    action,
    file_path,
    commit_message,
    preview_image_url,
    snapshot_path,
    is_recoverable
  FROM public.asset_version_log
  WHERE detected_at >= now() - interval '7 days'
),
classified AS (
  SELECT
    *,
    CASE
      WHEN file_path ILIKE '%/thumbnailimage/%' THEN 'thumbnailimage'
      WHEN file_path ILIKE '%crdownload%' THEN 'crdownload'
      WHEN file_path ILIKE '%embedded_files%' THEN 'embedded_files'
      WHEN file_path ILIKE '%viewcapture%' THEN 'viewcapture'
      WHEN file_path ILIKE '%.rhl%' THEN 'rhl'
      WHEN file_path ~* '(^|/)(atmp|save[0-9a-f]{6,}|rhi[0-9a-f]{3,})' THEN 'temp_name'
      WHEN file_path ~* '(^|/).+\.tmp( ->|$)' THEN 'tmp_ext'
      WHEN lower(nas_username) = 'wenshunhe' THEN 'ignored_account'
      ELSE 'kept'
    END AS filter_reason,
    substring(file_path FROM '/([A-Z]\d{4}_[^/]+|C\d{8}_[^/]+|D\d{4}_[^/]+)') AS project_token
  FROM base
),
daily AS (
  SELECT
    work_date,
    nas_username,
    sa_ai_user_id,
    min(detected_at) FILTER (WHERE filter_reason = 'kept') AS first_kept_at,
    max(detected_at) FILTER (WHERE filter_reason = 'kept') AS last_kept_at,
    count(*) FILTER (WHERE filter_reason = 'kept') AS kept_events,
    count(*) AS raw_events,
    count(*) FILTER (WHERE filter_reason <> 'kept') AS filtered_events,
    count(DISTINCT project_token) FILTER (
      WHERE filter_reason = 'kept'
        AND project_token IS NOT NULL
    ) AS distinct_projects,
    string_agg(DISTINCT project_token, ' | ' ORDER BY project_token) FILTER (
      WHERE filter_reason = 'kept'
        AND project_token IS NOT NULL
    ) AS project_candidates
  FROM classified
  GROUP BY work_date, nas_username, sa_ai_user_id
)
SELECT
  work_date,
  nas_username,
  sa_ai_user_id,
  first_kept_at,
  last_kept_at,
  GREATEST(
    round(
      extract(
        epoch FROM (
          last_kept_at
          - GREATEST(first_kept_at, work_date::timestamp + interval '10 hour')
        )
      ) / 3600.0,
      2
    ),
    0
  ) AS span_from_10h,
  kept_events,
  raw_events,
  filtered_events,
  distinct_projects,
  project_candidates
FROM daily
WHERE kept_events > 0
  AND sa_ai_user_id IS NOT NULL
ORDER BY work_date DESC, span_from_10h DESC, kept_events DESC;
