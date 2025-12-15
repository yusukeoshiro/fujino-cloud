-- Weekly aggregation built from daily team consumption
WITH daily AS (
  SELECT *
  FROM `fujino-cloud.firestore_export.team_daily_consumption`
),
weekly AS (
  SELECT
    org_id,
    DATE_TRUNC(date, WEEK(MONDAY)) AS week_start,
    DATE_TRUNC(date, WEEK(MONDAY)) + 6 AS week_end,
    metric_definition_id,
    ANY_VALUE(metric_definition_name) AS metric_definition_name,
    MIN(display_order) AS display_order,
    SUM(value) AS weekly_value,
    COUNT(*) AS days_count,
    SUM(CAST(is_game_day AS INT64)) AS game_days,
    SUM(contributing_athletes) AS total_contributing_athletes
  FROM daily
  GROUP BY org_id, week_start, week_end, metric_definition_id
) -- ====== OUTPUT ======
SELECT
  org_id,
  week_start,
  week_end,
  metric_definition_id,
  metric_definition_name,
  display_order,
  weekly_value AS value,
  days_count,
  game_days,
  total_contributing_athletes
FROM weekly
ORDER BY org_id, week_start, display_order, metric_definition_id;
