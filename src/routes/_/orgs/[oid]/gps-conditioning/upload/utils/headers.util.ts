export const HEADER_COLS = ['氏名'];

export const DISPLAY_COLS = [
	// 'タイプ',
	// '日付',
	// '開始時刻',
	// '終了時刻',
	// '氏名',
	// '生年月日',
	'継続時間(分)', // KkLOxGTCHY2uVOMjLtQE
	'総走行距離(m)', // P6Zu5epLjDOaDQq20Stx
	'1分当たり距離(m/min)', // I7i8bessV96ciVnFw5IB
	'最高速度(km/h)', // Q4dPRJ2eqeNR0Bg4DI3E
	// 'HSR回数',
	// 'HSR距離(m)',

	'高強度距離(m)', // Kn39OEkrpQCMQAtMQb5J
	'高強度割合', // RObqK0yOMf4NXhiWig6p

	'スプリント回数', // ZfqkRYcNfvwYioquCx5h
	'スプリント距離(m)', // mVykVPzBokSZ0l4C7YhJ
	'Z1距離(m)', // 0xbH1n71xspfVRddG92Q
	'ウォーキング割合', // oOQMjHICxmf3nLwvDitk

	// 'Z3距離(m)',
	// 'Z4距離(m)',
	// 'Z5距離(m)',
	// '加速Z4回数',
	'加速Z5回数', // kCZxKxfA9MfWVgBmdTbo
	'加速Z6回数', // YR3ZEOZLTLwJk23XKVpj
	'加速合計回数', // d4ZtXDD8O5ZjqnI8XqX3
	'爆発的加速回数', // XLp9zGyDi0PgkNHn61ln
	// '減速Z4回数',
	'減速Z5回数', // g60b48TuNLrtstb0dy65
	'減速Z6回数', // mPoLSRIgbc1IwC3fPsP9
	'減速合計回数', // D7aoPeenTMYu3CxfR6v7
	'爆発的減速回数', // vMV5RRPagpuPxkoU8F2T
	// 'トレーニングスコア消費',
];

export const FOOTER_COLS = [
	'トレーニングスコア消費', // b3DroV7arY2KLRUJpdtq
];

// ✅ combined columns (left → middle → right)
export const COLUMNS = [...HEADER_COLS, ...DISPLAY_COLS, ...FOOTER_COLS];
