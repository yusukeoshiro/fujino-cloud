-- Aggregate participant metrics to team-level values (game days use sum/10, others use average)
WITH raw_eligible AS (
  SELECT
    participant.orgId AS org_id,
    participant.orgUniqueToken AS athlete_id,
    participant.fullName AS athlete_name,
    assessment.date AS date,
    assessment_metric.metricDefinitionId AS metric_definition_id,
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
    LOGICAL_OR(is_game_day) AS is_game_day,
    SUM(metric_value) AS total_metric_value,
    AVG(metric_value) AS average_metric_value,
    COUNT(DISTINCT athlete_id) AS contributing_athletes
  FROM raw_eligible
  GROUP BY org_id, date, metric_definition_id
) -- ====== OUTPUT ======
SELECT
  t.org_id,
  t.date,
  t.metric_definition_id,
  CASE t.metric_definition_id
    WHEN 'KkLOxGTCHY2uVOMjLtQE' THEN 'トレーニング時間'
    WHEN 'P6Zu5epLjDOaDQq20Stx' THEN '走行距離'
    WHEN 'I7i8bessV96ciVnFw5IB' THEN '走行距離/分'
    WHEN 'Q4dPRJ2eqeNR0Bg4DI3E' THEN '最大速度'
    WHEN 'Kn39OEkrpQCMQAtMQb5J' THEN '高強度距離'
    WHEN 'RObqK0yOMf4NXhiWig6p' THEN '高強度割合'
    WHEN 'ZfqkRYcNfvwYioquCx5h' THEN 'スプリント回数'
    WHEN 'mVykVPzBokSZ0l4C7YhJ' THEN 'スプリント距離'
    WHEN '0xbH1n71xspfVRddG92Q' THEN '低強度距離'
    WHEN 'oOQMjHICxmf3nLwvDitk' THEN 'ウォーキング割合'
    WHEN 'XLp9zGyDi0PgkNHn61ln' THEN 'Exp Accel回数'
    WHEN 'XYpyu5CZTDZmMY9DbfNG' THEN '加速合計回数'
    WHEN 'vMV5RRPagpuPxkoU8F2T' THEN 'Exp Decell 回数'
    WHEN 'D7aoPeenTMYu3CxfR6v7' THEN '減速合計回数'
    WHEN 'b3DroV7arY2KLRUJpdtq' THEN 'ワークロード消費ポイント'
  END AS metric_definition_name,
  CASE t.metric_definition_id
    WHEN 'KkLOxGTCHY2uVOMjLtQE' THEN 1
    WHEN 'P6Zu5epLjDOaDQq20Stx' THEN 2
    WHEN 'I7i8bessV96ciVnFw5IB' THEN 3
    WHEN 'Q4dPRJ2eqeNR0Bg4DI3E' THEN 4
    WHEN 'Kn39OEkrpQCMQAtMQb5J' THEN 5
    WHEN 'RObqK0yOMf4NXhiWig6p' THEN 6
    WHEN 'ZfqkRYcNfvwYioquCx5h' THEN 7
    WHEN 'mVykVPzBokSZ0l4C7YhJ' THEN 8
    WHEN '0xbH1n71xspfVRddG92Q' THEN 9
    WHEN 'oOQMjHICxmf3nLwvDitk' THEN 10
    WHEN 'XLp9zGyDi0PgkNHn61ln' THEN 11
    WHEN 'XYpyu5CZTDZmMY9DbfNG' THEN 12
    WHEN 'vMV5RRPagpuPxkoU8F2T' THEN 13
    WHEN 'D7aoPeenTMYu3CxfR6v7' THEN 14
    WHEN 'b3DroV7arY2KLRUJpdtq' THEN 15
  END AS display_order,
  IF(
    t.is_game_day,
    t.total_metric_value / 10,
    t.average_metric_value
  ) AS value,
  t.is_game_day,
  t.contributing_athletes
FROM team_daily AS t
ORDER BY t.org_id, t.date, t.metric_definition_id;
