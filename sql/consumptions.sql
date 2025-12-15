SELECT *
FROM `mobili-platform-prd.assessment_raw_data.view_metrics_enriched`
WHERE assessment_metric.metricDefinitionId IN UNNEST(
    [
  'KkLOxGTCHY2uVOMjLtQE',
  'P6Zu5epLjDOaDQq20Stx',
  'I7i8bessV96ciVnFw5IB',
  'Q4dPRJ2eqeNR0Bg4DI3E',
  'Kn39OEkrpQCMQAtMQb5J',
  'RObqK0yOMf4NXhiWig6p',
  'ZfqkRYcNfvwYioquCx5h',
  'mVykVPzBokSZ0l4C7YhJ',
  '0xbH1n71xspfVRddG92Q',
  'j6u2oo2CjbSngFLioS2Q',
  'oKXeSMbv7zfV7WjTV4Wp',
  'nulFBwmrHVrA20HPtNrp',
  '4Pf9FuE2agjFASX1acXF',
  'kCZxKxfA9MfWVgBmdTbo',
  'YR3ZEOZLTLwJk23XKVpj',
  'FSmTTs8BG3fq608Zcy4F',
  'g60b48TuNLrtstb0dy65',
  'mPoLSRIgbc1IwC3fPsP9',
  'XLp9zGyDi0PgkNHn61ln',
  'vMV5RRPagpuPxkoU8F2T',
  'XYpyu5CZTDZmMY9DbfNG',
  'D7aoPeenTMYu3CxfR6v7',
  'oOQMjHICxmf3nLwvDitk',
  'b3DroV7arY2KLRUJpdtq'
]
  );