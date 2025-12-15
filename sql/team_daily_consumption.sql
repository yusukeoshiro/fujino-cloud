-- Aggregate participant metrics to team-level values (game days use sum/10, others use average)
WITH raw_eligible AS (
  SELECT
    participant.orgId AS org_id,
    participant.orgUniqueToken AS athlete_id,
    participant.fullName AS athlete_name,
    assessment.date AS date,
    assessment_metric.metricDefinitionId AS metric_definition_id,
    assessment_metric.metricDefinition.name AS metric_definition_name,
    assessment_metric.displayOrder AS display_order,
    CAST(value AS FLOAT64) AS metric_value,
    (
      SELECT COUNT(*) > 0
      FROM UNNEST(assessment.metadata) AS m
      WHERE m.key = 'x-fujino-cloud-gps-type'
        AND m.value = 'GAME'
    ) AS is_game_day
  FROM `fujino-cloud.firestore_export.consumptions`
),
team_daily AS (
  SELECT
    org_id,
    date,
    metric_definition_id,
    metric_definition_name,
    LOGICAL_OR(is_game_day) AS is_game_day,
    SUM(metric_value) AS total_metric_value,
    AVG(metric_value) AS average_metric_value,
    MIN(display_order) AS display_order,
    COUNT(DISTINCT athlete_id) AS contributing_athletes
  FROM raw_eligible
  GROUP BY org_id, date, metric_definition_id, metric_definition_name
) -- ====== OUTPUT ======
SELECT
  t.org_id,
  t.date,
  t.metric_definition_id,
  t.metric_definition_name,
  t.display_order,
  IF(
    t.is_game_day,
    t.total_metric_value / 10,
    t.average_metric_value
  ) AS value,
  t.is_game_day,
  t.contributing_athletes
FROM team_daily AS t
ORDER BY t.org_id, t.date, t.metric_definition_id;
