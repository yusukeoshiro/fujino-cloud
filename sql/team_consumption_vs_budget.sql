-- ====== BUDGETS (per org, with period) ======
WITH budgets AS (
  SELECT JSON_VALUE(data, '$.orgId') AS org_id,
    PARSE_DATE('%Y-%m-%d', JSON_VALUE(data, '$.allocatedOn')) AS allocatedOn,
    PARSE_DATE('%Y-%m-%d', JSON_VALUE(data, '$.expiresOn')) AS expiresOn,
    CAST(JSON_VALUE(data, '$.budget') AS INT64) AS budget
  FROM `fujino-cloud.firestore_export.training_budgets_raw_latest`
),
-- Expand each budget period to daily rows
budget_days AS (
  SELECT b.org_id,
    d AS date,
    b.allocatedOn AS period_start,
    b.expiresOn AS period_end,
    b.budget AS allowance_points
  FROM budgets b,
    UNNEST(GENERATE_DATE_ARRAY(b.allocatedOn, b.expiresOn)) AS d
),
-- If multiple budgets overlap for an org/date, keep the most recent allocation
budget_days_resolved AS (
  SELECT org_id,
    date,
    period_start,
    period_end,
    allowance_points
  FROM (
      SELECT org_id,
        date,
        period_start,
        period_end,
        allowance_points,
        ROW_NUMBER() OVER (
          PARTITION BY org_id,
          date
          ORDER BY period_start DESC
        ) AS rn
      FROM budget_days
    )
  WHERE rn = 1
),
-- ====== Eligible raw records (filtered) ======
raw_eligible AS (
  SELECT participant.orgId AS org_id,
    participant.orgUniqueToken AS athlete_id,
    participant.fullName AS athlete_name,
    assessment.date AS date,
    CAST(value AS INT64) AS points,
    (
      SELECT COUNT(*) > 0
      FROM UNNEST(assessment.metadata) AS m
      WHERE m.key = 'x-fujino-cloud-gps-type'
        AND m.value = 'GAME'
    ) AS is_game_day
  FROM `mobili-platform-prd.assessment_raw_data.view_metrics_enriched`
  WHERE assessment_metric.metricDefinitionId = "b3DroV7arY2KLRUJpdtq"
    AND (
      participant.attr1 IS NULL
      OR participant.attr1 != "skipped"
    )
),
-- ====== Per-athlete daily totals ======
athlete_daily AS (
  SELECT org_id,
    athlete_id,
    ANY_VALUE(athlete_name) AS athlete_name,
    date,
    ANY_VALUE(is_game_day) AS is_game_day,
    SUM(points) AS athlete_daily_consumption
  FROM raw_eligible
  GROUP BY org_id,
    athlete_id,
    date
),
-- ====== Team daily consumption = average of per-athlete totals ======
team_daily AS (
  SELECT org_id,
    date,
    ANY_VALUE(is_game_day) AS is_game_day,
    CASE
      WHEN ANY_VALUE(is_game_day) THEN SUM(athlete_daily_consumption) / 10
      ELSE AVG(athlete_daily_consumption)
    END AS team_daily_consumption,
    COUNT(*) AS contributing_athletes
  FROM athlete_daily
  GROUP BY org_id,
    date
),
-- Embedded: per-athlete breakdown array for that org/date
athlete_breakdown_by_day AS (
  SELECT org_id,
    date,
    ARRAY_AGG(
      STRUCT(
        athlete_id,
        athlete_name,
        athlete_daily_consumption
      )
      ORDER BY athlete_name
    ) AS athlete_breakdown
  FROM athlete_daily
  GROUP BY org_id,
    date
),
-- Embedded: raw contributing records array for that org/date
records_by_day AS (
  SELECT org_id,
    date,
    ARRAY_AGG(
      STRUCT(
        athlete_id,
        athlete_name,
        points
      )
      ORDER BY athlete_name
    ) AS contributing_records
  FROM raw_eligible
  GROUP BY org_id,
    date
),
-- ====== Join budgets to team daily (fill 0/empty when no data) ======
per_day AS (
  SELECT b.org_id,
    b.date,
    b.period_start,
    b.period_end,
    b.allowance_points,
    COALESCE(t.team_daily_consumption, 0) AS daily_consumption,
    COALESCE(t.contributing_athletes, 0) AS contributing_athletes,
    COALESCE(t.is_game_day, FALSE) AS is_game_day,
    IFNULL(
      ab.athlete_breakdown,
      ARRAY < STRUCT < athlete_id STRING,
      athlete_name STRING,
      athlete_daily_consumption INT64 >> []
    ) AS athlete_breakdown,
    IFNULL(
      r.contributing_records,
      ARRAY < STRUCT < athlete_id STRING,
      athlete_name STRING,
      points INT64 >> []
    ) AS contributing_records
  FROM budget_days_resolved b
    LEFT JOIN team_daily t USING (org_id, date)
    LEFT JOIN athlete_breakdown_by_day ab USING (org_id, date)
    LEFT JOIN records_by_day r USING (org_id, date)
),
-- ====== Cumulative and remaining within each budget period (per org) ======
with_running AS (
  SELECT org_id,
    date,
    period_start,
    period_end,
    allowance_points,
    daily_consumption,
    is_game_day,
    -- team average of per-athlete daily totals
    contributing_athletes,
    athlete_breakdown,
    -- embedded per-athlete daily totals
    contributing_records,
    -- embedded raw records
    SUM(daily_consumption) OVER (
      PARTITION BY org_id,
      period_start,
      period_end
      ORDER BY date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS cum_consumption_in_period
  FROM per_day
) -- ====== OUTPUT ======
SELECT org_id,
  date,
  period_start,
  period_end,
  allowance_points,
  daily_consumption,
  is_game_day,
  contributing_athletes,
  athlete_breakdown,
  contributing_records,
  cum_consumption_in_period,
  allowance_points - cum_consumption_in_period AS remaining,
  SAFE_DIVIDE(cum_consumption_in_period, allowance_points) AS consumed_pct
FROM with_running
ORDER BY org_id,
  date;
