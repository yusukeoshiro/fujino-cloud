SELECT
  *,
  CASE assessment_metric.metricDefinitionId
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
  END AS displayOrder,
  CASE assessment_metric.metricDefinitionId
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
  END AS metricDefinitionName
FROM
  `mobili-platform-prd.assessment_raw_data.view_metrics_enriched`
WHERE
  assessment_metric.metricDefinitionId IN UNNEST(
    [
  'KkLOxGTCHY2uVOMjLtQE', -- Training Duration
  'P6Zu5epLjDOaDQq20Stx', -- totalDistanceM (Total distance in meters)
  'I7i8bessV96ciVnFw5IB', -- totalDistanceMPerMin (Distance per minute)
  'Q4dPRJ2eqeNR0Bg4DI3E', -- maxSpeedKMH (Max speed in km/h)
  'Kn39OEkrpQCMQAtMQb5J', -- highIntensityDistanceM (High-intensity distance)
  'RObqK0yOMf4NXhiWig6p', -- highIntensityRate (High-intensity distance share of total)
  'ZfqkRYcNfvwYioquCx5h', -- sprintCount (Sprint count)
  'mVykVPzBokSZ0l4C7YhJ', -- sprintDistanceM (Sprint distance in meters)
  '0xbH1n71xspfVRddG92Q', -- lowIntensityDistanceM (Low-intensity distance)
  'oOQMjHICxmf3nLwvDitk', -- lowIntensityRate (Low-intensity distance share of total)
  'XLp9zGyDi0PgkNHn61ln', -- expAccCount (Explosive acceleration count)
  'XYpyu5CZTDZmMY9DbfNG', -- accelerationCountTotal (Total acceleration count)
  'vMV5RRPagpuPxkoU8F2T', -- expDecCount (Explosive deceleration count)
  'D7aoPeenTMYu3CxfR6v7', -- decelerationCountTotal (Total deceleration count)
  -- 'yZ0yLsB60V8NTKrn3Hkw', -- noOfHSR (High-speed run count)
  -- 'Lnznq7uAwamZD683xQ5b' -- hsrDistanceM (High-speed run distance in meters)
  'b3DroV7arY2KLRUJpdtq' -- workloadConsumptionPoints (Workload consumption points)
  
]
  );
