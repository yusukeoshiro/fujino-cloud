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
  CASE metric_definition_id
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
  CASE metric_definition_id
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
  weekly_value AS value,
  days_count,
  game_days,
  total_contributing_athletes
FROM weekly
ORDER BY org_id, week_start, display_order, metric_definition_id;
