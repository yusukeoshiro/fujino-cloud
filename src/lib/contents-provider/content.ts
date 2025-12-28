import type {
	BetterDirection,
	BlockingState,
	CaptureType,
	CollectionMode,
	DeviceType,
	MetricDefinitionType,
	MetricUnit,
} from './types';

type MetricDefinition = {
	id: string;
	createdAt: string;
	updatedAt: string;
	orgId: string | null;
	isPublic: boolean;
	name: string;
	nameI18n?: LocalizedString[] | null;
	description: string;
	descriptionI18n?: LocalizedString[] | null;
	type: MetricDefinitionType;
	category: string;
	betterDirection: BetterDirection;
	formula: string | null;
	sourceMetricDefinitionIds: string[] | null;
	unit: MetricUnit;
	roundingPrecision: number;
	meta: Record<string, unknown>;
};

type PerformanceAssessmentTemplateItem = {
	metricDefinitionId: string;
	scored: boolean;
};

type PerformanceAssessmentTemplate = {
	id: string;
	createdAt: string;
	updatedAt: string;
	orgId: string;
	name: string;
	nameI18n?: LocalizedString[] | null;
	description: string | null;
	descriptionI18n?: LocalizedString[] | null;
	items: PerformanceAssessmentTemplateItem[];
	meta?: Record<string, unknown>;
};

type ReferenceBand = {
	mean: number;
	std: number;
};

type ReferenceTable = Record<string, Record<string, ReferenceBand | null>>;

type CaptureOptions = {
	metricDefinitionId: string;
	type: CaptureType;
	relativeToStepIndex: number | null;
	metricDefinition?: { name: string };
};

type GatePathStep = {
	gateIndex: number;
	state: BlockingState;
	captureTimestamp: boolean;
	captureOptions: CaptureOptions | null;
	resetTime: boolean;
	engageSession: boolean;
	readyNext?: boolean | null;
};

type ReadyCondition = {
	gateIndex: number;
	requiredState: BlockingState;
};

type DeviceInputConfig = {
	id: string;
	createdAt: string;
	updatedAt: string;
	orgId: string | null;
	deviceType: DeviceType;
	collectionMode: CollectionMode;
	mainMetricDefinitionId: string;
	gatePathSteps: GatePathStep[];
	readyConditions: ReadyCondition[];
	allowStaggeredStart: boolean;
	contentProviderId?: string | null;
};

type LocalizedString = {
	locale: 'ja' | 'en' | 'ko';
	value: string;
};

const now = '2025-01-01T00:00:00.000Z';

export const metricDefinitions: MetricDefinition[] = [
	{
		id: '3s004Lb8UM9Tiag3kQNR',
		createdAt: now,
		updatedAt: now,
		orgId: null,
		isPublic: true,
		name: '身長',
		nameI18n: [
			{
				locale: 'ja',
				value: '身長',
			},
			{
				locale: 'en',
				value: 'Height',
			},
			{
				locale: 'ko',
				value: '신장',
			},
		],
		description: '',
		descriptionI18n: [
			{
				locale: 'ja',
				value: '',
			},
			{
				locale: 'en',
				value: '',
			},
			{
				locale: 'ko',
				value: '',
			},
		],
		type: 'raw',
		category: 'BODY',
		betterDirection: 'HIGHER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'CENTIMETER',
		roundingPrecision: 1,
		meta: {},
	},
	{
		id: '5iu1YWxuZFt6X2Stg0iy',
		createdAt: now,
		updatedAt: now,
		orgId: null,
		isPublic: true,
		name: '両足５段跳び',
		nameI18n: [
			{
				locale: 'ja',
				value: '両足５段跳び',
			},
			{
				locale: 'en',
				value: 'Five-step jump (both legs)',
			},
			{
				locale: 'ko',
				value: '양발 5단 점프',
			},
		],
		description: '',
		descriptionI18n: [
			{
				locale: 'ja',
				value: '',
			},
			{
				locale: 'en',
				value: '',
			},
			{
				locale: 'ko',
				value: '',
			},
		],
		type: 'raw',
		category: 'POWER',
		betterDirection: 'HIGHER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'METER',
		roundingPrecision: 2,
		meta: {},
	},
	{
		id: '9Ubx6BwRXrl4Fqc60BEQ',
		createdAt: now,
		updatedAt: now,
		orgId: null,
		isPublic: true,
		name: '3 HOP 左',
		nameI18n: [
			{
				locale: 'ja',
				value: '3 HOP 左',
			},
			{
				locale: 'en',
				value: '3-hop Left',
			},
			{
				locale: 'ko',
				value: '3홉 왼쪽',
			},
		],
		description: '',
		descriptionI18n: [
			{
				locale: 'ja',
				value: '',
			},
			{
				locale: 'en',
				value: '',
			},
			{
				locale: 'ko',
				value: '',
			},
		],
		type: 'raw',
		category: 'POWER',
		betterDirection: 'HIGHER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'METER',
		roundingPrecision: 2,
		meta: {},
	},
	{
		id: 'FEEunCRt96GG5wXvoDWm',
		createdAt: now,
		updatedAt: now,
		orgId: null,
		isPublic: true,
		name: 'Pro Agility 右',
		nameI18n: [
			{
				locale: 'ja',
				value: 'Pro Agility 右',
			},
			{
				locale: 'en',
				value: 'Pro Agility Right',
			},
			{
				locale: 'ko',
				value: '프로 애질리티 오른쪽',
			},
		],
		description: '',
		descriptionI18n: [
			{
				locale: 'ja',
				value: '',
			},
			{
				locale: 'en',
				value: '',
			},
			{
				locale: 'ko',
				value: '',
			},
		],
		type: 'raw',
		category: 'AGILITY',
		betterDirection: 'LOWER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'SECOND',
		roundingPrecision: 2,
		meta: {},
	},
	{
		id: 'HWtqdoyh1WIjpJIGtHbM',
		createdAt: now,
		updatedAt: now,
		orgId: null,
		isPublic: true,
		name: 'Pro Agility 左右差(%)',
		nameI18n: [
			{
				locale: 'ja',
				value: 'Pro Agility 左右差(%)',
			},
			{
				locale: 'en',
				value: 'Pro Agility Left/Right Difference (%)',
			},
			{
				locale: 'ko',
				value: '프로 애질리티 좌우 차이(%)',
			},
		],
		description: '',
		descriptionI18n: [
			{
				locale: 'ja',
				value: '',
			},
			{
				locale: 'en',
				value: '',
			},
			{
				locale: 'ko',
				value: '',
			},
		],
		type: 'derived',
		category: 'AGILITY',
		betterDirection: 'LOWER_IS_BETTER',
		formula:
			'=ROUND(ABS($FEEunCRt96GG5wXvoDWm-$UiJ8YCBfUdI9OPnknlU4)/MIN($FEEunCRt96GG5wXvoDWm,$UiJ8YCBfUdI9OPnknlU4), 6)',
		sourceMetricDefinitionIds: ['FEEunCRt96GG5wXvoDWm', 'UiJ8YCBfUdI9OPnknlU4'],
		unit: 'PERCENT',
		roundingPrecision: 2,
		meta: {},
	},
	{
		id: 'Hi5CitOIe4MLS2uF3dqc',
		createdAt: now,
		updatedAt: now,
		orgId: null,
		isPublic: true,
		name: '3 HOP 右',
		nameI18n: [
			{
				locale: 'ja',
				value: '3 HOP 右',
			},
			{
				locale: 'en',
				value: '3-hop Right',
			},
			{
				locale: 'ko',
				value: '3홉 오른쪽',
			},
		],
		description: '',
		descriptionI18n: [
			{
				locale: 'ja',
				value: '',
			},
			{
				locale: 'en',
				value: '',
			},
			{
				locale: 'ko',
				value: '',
			},
		],
		type: 'raw',
		category: 'POWER',
		betterDirection: 'HIGHER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'METER',
		roundingPrecision: 2,
		meta: {},
	},
	{
		id: 'JyCFHqA5HAOBPcqCOwCv',
		createdAt: now,
		updatedAt: now,
		orgId: null,
		isPublic: true,
		name: '体重',
		nameI18n: [
			{
				locale: 'ja',
				value: '体重',
			},
			{
				locale: 'en',
				value: 'Weight',
			},
			{
				locale: 'ko',
				value: '체중',
			},
		],
		description: '',
		descriptionI18n: [
			{
				locale: 'ja',
				value: '',
			},
			{
				locale: 'en',
				value: '',
			},
			{
				locale: 'ko',
				value: '',
			},
		],
		type: 'raw',
		category: 'BODY',
		betterDirection: 'HIGHER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'KILOGRAM',
		roundingPrecision: 1,
		meta: {},
	},
	{
		id: 'UiJ8YCBfUdI9OPnknlU4',
		createdAt: now,
		updatedAt: now,
		orgId: null,
		isPublic: true,
		name: 'Pro Agility 左',
		nameI18n: [
			{
				locale: 'ja',
				value: 'Pro Agility 左',
			},
			{
				locale: 'en',
				value: 'Pro Agility Left',
			},
			{
				locale: 'ko',
				value: '프로 애질리티 왼쪽',
			},
		],
		description: '',
		descriptionI18n: [
			{
				locale: 'ja',
				value: '',
			},
			{
				locale: 'en',
				value: '',
			},
			{
				locale: 'ko',
				value: '',
			},
		],
		type: 'raw',
		category: 'AGILITY',
		betterDirection: 'LOWER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'SECOND',
		roundingPrecision: 2,
		meta: {},
	},
	{
		id: 'V1AdIWTGwvVa2RYmZLsC',
		createdAt: now,
		updatedAt: now,
		orgId: null,
		isPublic: true,
		name: 'BMI',
		nameI18n: [
			{
				locale: 'ja',
				value: 'BMI',
			},
			{
				locale: 'en',
				value: 'BMI',
			},
			{
				locale: 'ko',
				value: 'BMI',
			},
		],
		description: '',
		descriptionI18n: [
			{
				locale: 'ja',
				value: '',
			},
			{
				locale: 'en',
				value: '',
			},
			{
				locale: 'ko',
				value: '',
			},
		],
		type: 'derived',
		category: 'BODY',
		betterDirection: 'HIGHER_IS_BETTER',
		formula: '=ROUND( $JyCFHqA5HAOBPcqCOwCv / POWER($3s004Lb8UM9Tiag3kQNR / 100, 2), 6)',
		sourceMetricDefinitionIds: ['3s004Lb8UM9Tiag3kQNR', 'JyCFHqA5HAOBPcqCOwCv'],
		unit: 'UNITLESS',
		roundingPrecision: 1,
		meta: {},
	},
	{
		id: 'i3tQbxmRVijkzlXngPan',
		createdAt: now,
		updatedAt: now,
		orgId: null,
		isPublic: true,
		name: '3 HOP 左右差(%)',
		nameI18n: [
			{
				locale: 'ja',
				value: '3 HOP 左右差(%)',
			},
			{
				locale: 'en',
				value: '3-hop Left/Right Difference (%)',
			},
			{
				locale: 'ko',
				value: '3홉 좌우 차이(%)',
			},
		],
		description: '',
		descriptionI18n: [
			{
				locale: 'ja',
				value: '',
			},
			{
				locale: 'en',
				value: '',
			},
			{
				locale: 'ko',
				value: '',
			},
		],
		type: 'derived',
		category: 'POWER',
		betterDirection: 'LOWER_IS_BETTER',
		formula:
			'=ROUND(ABS( $9Ubx6BwRXrl4Fqc60BEQ - $Hi5CitOIe4MLS2uF3dqc ) / MIN( $9Ubx6BwRXrl4Fqc60BEQ , $Hi5CitOIe4MLS2uF3dqc ), 6)',
		sourceMetricDefinitionIds: ['9Ubx6BwRXrl4Fqc60BEQ', 'Hi5CitOIe4MLS2uF3dqc'],
		unit: 'PERCENT',
		roundingPrecision: 2,
		meta: {},
	},
	{
		id: 'lMaeLRMQfMa1WKbOyly7',
		createdAt: now,
		updatedAt: now,
		orgId: null,
		isPublic: true,
		name: '立ち幅跳び',
		nameI18n: [
			{
				locale: 'ja',
				value: '立ち幅跳び',
			},
			{
				locale: 'en',
				value: 'Standing long jump',
			},
			{
				locale: 'ko',
				value: '제자리 멀리뛰기',
			},
		],
		description: '',
		descriptionI18n: [
			{
				locale: 'ja',
				value: '',
			},
			{
				locale: 'en',
				value: '',
			},
			{
				locale: 'ko',
				value: '',
			},
		],
		type: 'raw',
		category: 'POWER',
		betterDirection: 'HIGHER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'METER',
		roundingPrecision: 2,
		meta: {},
	},
	{
		id: 'ojpzLOSCTMZf6s4SvRja',
		createdAt: now,
		updatedAt: now,
		orgId: null,
		isPublic: true,
		name: '3 HOP 平均',
		nameI18n: [
			{
				locale: 'ja',
				value: '3 HOP 平均',
			},
			{
				locale: 'en',
				value: '3-hop Average',
			},
			{
				locale: 'ko',
				value: '3홉 평균',
			},
		],
		description: '',
		descriptionI18n: [
			{
				locale: 'ja',
				value: '',
			},
			{
				locale: 'en',
				value: '',
			},
			{
				locale: 'ko',
				value: '',
			},
		],
		type: 'derived',
		category: 'POWER',
		betterDirection: 'HIGHER_IS_BETTER',
		formula: '=ROUND(AVERAGE($9Ubx6BwRXrl4Fqc60BEQ,$Hi5CitOIe4MLS2uF3dqc), 6)',
		sourceMetricDefinitionIds: ['9Ubx6BwRXrl4Fqc60BEQ', 'Hi5CitOIe4MLS2uF3dqc'],
		unit: 'METER',
		roundingPrecision: 2,
		meta: {},
	},
	{
		id: 'sgUyE2xgSX4d5YLDVFdO',
		createdAt: now,
		updatedAt: now,
		orgId: null,
		isPublic: true,
		name: '20M スプリント',
		nameI18n: [
			{
				locale: 'ja',
				value: '20M スプリント',
			},
			{
				locale: 'en',
				value: '20m Sprint',
			},
			{
				locale: 'ko',
				value: '20m 스프린트',
			},
		],
		description: '',
		descriptionI18n: [
			{
				locale: 'ja',
				value: '',
			},
			{
				locale: 'en',
				value: '',
			},
			{
				locale: 'ko',
				value: '',
			},
		],
		type: 'raw',
		category: 'SPEED',
		betterDirection: 'LOWER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'SECOND',
		roundingPrecision: 2,
		meta: {},
	},
	{
		id: 'u5Wdg1MlL88rYKbPQW3o',
		createdAt: now,
		updatedAt: now,
		orgId: null,
		isPublic: true,
		name: 'Pro Agility 平均',
		nameI18n: [
			{
				locale: 'ja',
				value: 'Pro Agility 平均',
			},
			{
				locale: 'en',
				value: 'Pro Agility Average',
			},
			{
				locale: 'ko',
				value: '프로 애질리티 평균',
			},
		],
		description: '',
		descriptionI18n: [
			{
				locale: 'ja',
				value: '',
			},
			{
				locale: 'en',
				value: '',
			},
			{
				locale: 'ko',
				value: '',
			},
		],
		type: 'derived',
		category: 'AGILITY',
		betterDirection: 'LOWER_IS_BETTER',
		formula: '=ROUND(AVERAGE($FEEunCRt96GG5wXvoDWm,$UiJ8YCBfUdI9OPnknlU4), 6)',
		sourceMetricDefinitionIds: ['FEEunCRt96GG5wXvoDWm', 'UiJ8YCBfUdI9OPnknlU4'],
		unit: 'SECOND',
		roundingPrecision: 2,
		meta: {},
	},
	{
		id: 'uaaLUh0KRykPkWA3Dhcd',
		createdAt: now,
		updatedAt: now,
		orgId: null,
		isPublic: true,
		name: '30M スプリント',
		nameI18n: [
			{
				locale: 'ja',
				value: '30M スプリント',
			},
			{
				locale: 'en',
				value: '30m Sprint',
			},
			{
				locale: 'ko',
				value: '30m 스프린트',
			},
		],
		description: '',
		descriptionI18n: [
			{
				locale: 'ja',
				value: '',
			},
			{
				locale: 'en',
				value: '',
			},
			{
				locale: 'ko',
				value: '',
			},
		],
		type: 'raw',
		category: 'SPEED',
		betterDirection: 'LOWER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'SECOND',
		roundingPrecision: 2,
		meta: {},
	},
	{
		id: 'uhQDnmvGVOGPgEYAxJh0',
		createdAt: now,
		updatedAt: now,
		orgId: null,
		isPublic: true,
		name: '10M スプリント',
		nameI18n: [
			{
				locale: 'ja',
				value: '10M スプリント',
			},
			{
				locale: 'en',
				value: '10m Sprint',
			},
			{
				locale: 'ko',
				value: '10m 스프린트',
			},
		],
		description: '',
		descriptionI18n: [
			{
				locale: 'ja',
				value: '',
			},
			{
				locale: 'en',
				value: '',
			},
			{
				locale: 'ko',
				value: '',
			},
		],
		type: 'raw',
		category: 'SPEED',
		betterDirection: 'LOWER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'SECOND',
		roundingPrecision: 2,
		meta: {},
	},
	{
		id: 'y7h8I9Mkl1ppg5ZmRpUb',
		createdAt: now,
		updatedAt: now,
		orgId: null,
		isPublic: true,
		name: 'YoYo',
		nameI18n: [
			{
				locale: 'ja',
				value: 'YoYo',
			},
			{
				locale: 'en',
				value: 'YoYo',
			},
			{
				locale: 'ko',
				value: '요요',
			},
		],
		description: '',
		descriptionI18n: [
			{
				locale: 'ja',
				value: '',
			},
			{
				locale: 'en',
				value: '',
			},
			{
				locale: 'ko',
				value: '',
			},
		],
		type: 'raw',
		category: 'ENDURANCE',
		betterDirection: 'HIGHER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'COUNT',
		roundingPrecision: 0,
		meta: {},
	},
	{
		id: '0xbH1n71xspfVRddG92Q',
		createdAt: now,
		updatedAt: now,
		orgId: '2a9dWrDixJ56ysNOgAtR',
		isPublic: false,
		name: 'Zone 1 距離',
		nameI18n: [
			{
				locale: 'ja',
				value: 'Zone 1 距離',
			},
			{
				locale: 'en',
				value: 'Zone 1 Distance',
			},
			{
				locale: 'ko',
				value: 'Zone 1 거리',
			},
		],
		description: 'Fitogether Zone 1 距離',
		descriptionI18n: [
			{
				locale: 'ja',
				value: 'Fitogether Zone 1 距離',
			},
			{
				locale: 'en',
				value: 'Fitogether Zone 1 distance.',
			},
			{
				locale: 'ko',
				value: 'Fitogether Zone 1 거리.',
			},
		],
		type: 'raw',
		category: 'TRAINING',
		betterDirection: 'HIGHER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'METER',
		roundingPrecision: 0,
		meta: {},
	},
	{
		id: '4Pf9FuE2agjFASX1acXF',
		createdAt: now,
		updatedAt: now,
		orgId: '2a9dWrDixJ56ysNOgAtR',
		isPublic: false,
		name: 'Accel Zone 4 回数',
		nameI18n: [
			{
				locale: 'ja',
				value: 'Accel Zone 4 回数',
			},
			{
				locale: 'en',
				value: 'Accel Zone 4 Count',
			},
			{
				locale: 'ko',
				value: 'Accel Zone 4 횟수',
			},
		],
		description: 'Fitogether Accel Zone 4 回数',
		descriptionI18n: [
			{
				locale: 'ja',
				value: 'Fitogether Accel Zone 4 回数',
			},
			{
				locale: 'en',
				value: 'Fitogether Accel Zone 4 count.',
			},
			{
				locale: 'ko',
				value: 'Fitogether Accel Zone 4 횟수.',
			},
		],
		type: 'raw',
		category: 'TRAINING',
		betterDirection: 'HIGHER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'COUNT',
		roundingPrecision: 0,
		meta: {},
	},
	{
		id: 'D7aoPeenTMYu3CxfR6v7',
		createdAt: now,
		updatedAt: now,
		orgId: '2a9dWrDixJ56ysNOgAtR',
		isPublic: false,
		name: '減速合計回数',
		nameI18n: [
			{
				locale: 'ja',
				value: '減速合計回数',
			},
			{
				locale: 'en',
				value: 'Total Deceleration Count',
			},
			{
				locale: 'ko',
				value: '총 감속 횟수',
			},
		],
		description: 'Fitogether 減速合計回数',
		descriptionI18n: [
			{
				locale: 'ja',
				value: 'Fitogether 減速合計回数',
			},
			{
				locale: 'en',
				value: 'Fitogether total deceleration count.',
			},
			{
				locale: 'ko',
				value: 'Fitogether 총 감속 횟수.',
			},
		],
		type: 'raw',
		category: 'TRAINING',
		betterDirection: 'HIGHER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'COUNT',
		roundingPrecision: 0,
		meta: {},
	},
	{
		id: 'FSmTTs8BG3fq608Zcy4F',
		createdAt: now,
		updatedAt: now,
		orgId: '2a9dWrDixJ56ysNOgAtR',
		isPublic: false,
		name: 'Decel Zone 4 回数',
		nameI18n: [
			{
				locale: 'ja',
				value: 'Decel Zone 4 回数',
			},
			{
				locale: 'en',
				value: 'Decel Zone 4 Count',
			},
			{
				locale: 'ko',
				value: 'Decel Zone 4 횟수',
			},
		],
		description: 'Fitogether Decel Zone 4 回数',
		descriptionI18n: [
			{
				locale: 'ja',
				value: 'Fitogether Decel Zone 4 回数',
			},
			{
				locale: 'en',
				value: 'Fitogether Decel Zone 4 count.',
			},
			{
				locale: 'ko',
				value: 'Fitogether Decel Zone 4 횟수.',
			},
		],
		type: 'raw',
		category: 'TRAINING',
		betterDirection: 'HIGHER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'COUNT',
		roundingPrecision: 0,
		meta: {},
	},
	{
		id: 'FSw4meWwvmxkcr4G0KvX',
		createdAt: now,
		updatedAt: now,
		orgId: '2a9dWrDixJ56ysNOgAtR',
		isPublic: false,
		name: 'TRスコア消費',
		nameI18n: [
			{
				locale: 'ja',
				value: 'TRスコア消費',
			},
			{
				locale: 'en',
				value: 'TR Score Expenditure',
			},
			{
				locale: 'ko',
				value: 'TR 스코어 소비',
			},
		],
		description: 'Fitogether TRスコア消費',
		descriptionI18n: [
			{
				locale: 'ja',
				value: 'Fitogether TRスコア消費',
			},
			{
				locale: 'en',
				value: 'Fitogether TR score expenditure.',
			},
			{
				locale: 'ko',
				value: 'Fitogether TR 스코어 소비.',
			},
		],
		type: 'raw',
		category: 'TRAINING',
		betterDirection: 'HIGHER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'UNITLESS',
		roundingPrecision: 0,
		meta: {},
	},
	{
		id: 'I7i8bessV96ciVnFw5IB',
		createdAt: now,
		updatedAt: now,
		orgId: '2a9dWrDixJ56ysNOgAtR',
		isPublic: false,
		name: '走行距離/分',
		nameI18n: [
			{
				locale: 'ja',
				value: '走行距離/分',
			},
			{
				locale: 'en',
				value: 'Distance per minute',
			},
			{
				locale: 'ko',
				value: '분당 이동거리',
			},
		],
		description: 'Fitogether 走行距離/分',
		descriptionI18n: [
			{
				locale: 'ja',
				value: 'Fitogether 走行距離/分',
			},
			{
				locale: 'en',
				value: 'Fitogether distance per minute.',
			},
			{
				locale: 'ko',
				value: 'Fitogether 분당 이동거리.',
			},
		],
		type: 'raw',
		category: 'TRAINING',
		betterDirection: 'HIGHER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'METER',
		roundingPrecision: 0,
		meta: {},
	},
	{
		id: 'KkLOxGTCHY2uVOMjLtQE',
		createdAt: now,
		updatedAt: now,
		orgId: '2a9dWrDixJ56ysNOgAtR',
		isPublic: false,
		name: 'トレーニング時間',
		nameI18n: [
			{
				locale: 'ja',
				value: 'トレーニング時間',
			},
			{
				locale: 'en',
				value: 'Training Duration',
			},
			{
				locale: 'ko',
				value: '트레이닝 시간',
			},
		],
		description: 'Fitogether トレーニング時間です。',
		descriptionI18n: [
			{
				locale: 'ja',
				value: 'Fitogether トレーニング時間です。',
			},
			{
				locale: 'en',
				value: 'Fitogether training duration.',
			},
			{
				locale: 'ko',
				value: 'Fitogether 트레이닝 시간.',
			},
		],
		type: 'raw',
		category: 'TRAINING',
		betterDirection: 'HIGHER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'MINUTE',
		roundingPrecision: 0,
		meta: {},
	},
	{
		id: 'Kn39OEkrpQCMQAtMQb5J',
		createdAt: now,
		updatedAt: now,
		orgId: '2a9dWrDixJ56ysNOgAtR',
		isPublic: false,
		name: '高強度距離',
		nameI18n: [
			{
				locale: 'ja',
				value: '高強度距離',
			},
			{
				locale: 'en',
				value: 'High-intensity Distance',
			},
			{
				locale: 'ko',
				value: '고강도 거리',
			},
		],
		description: 'Fitogether トレーニング高強度',
		descriptionI18n: [
			{
				locale: 'ja',
				value: 'Fitogether トレーニング高強度',
			},
			{
				locale: 'en',
				value: 'Fitogether training high intensity.',
			},
			{
				locale: 'ko',
				value: 'Fitogether 트레이닝 고강도.',
			},
		],
		type: 'raw',
		category: 'TRAINING',
		betterDirection: 'HIGHER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'METER',
		roundingPrecision: 0,
		meta: {},
	},
	{
		id: 'P6Zu5epLjDOaDQq20Stx',
		createdAt: now,
		updatedAt: now,
		orgId: '2a9dWrDixJ56ysNOgAtR',
		isPublic: false,
		name: '走行距離',
		nameI18n: [
			{
				locale: 'ja',
				value: '走行距離',
			},
			{
				locale: 'en',
				value: 'Total Distance',
			},
			{
				locale: 'ko',
				value: '총 이동거리',
			},
		],
		description: 'Fitogether トレーニング走行距離',
		descriptionI18n: [
			{
				locale: 'ja',
				value: 'Fitogether トレーニング走行距離',
			},
			{
				locale: 'en',
				value: 'Fitogether training distance.',
			},
			{
				locale: 'ko',
				value: 'Fitogether 트레이닝 이동거리.',
			},
		],
		type: 'raw',
		category: 'TRAINING',
		betterDirection: 'HIGHER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'METER',
		roundingPrecision: 0,
		meta: {},
	},
	{
		id: 'Q4dPRJ2eqeNR0Bg4DI3E',
		createdAt: now,
		updatedAt: now,
		orgId: '2a9dWrDixJ56ysNOgAtR',
		isPublic: false,
		name: '最大速度',
		nameI18n: [
			{
				locale: 'ja',
				value: '最大速度',
			},
			{
				locale: 'en',
				value: 'Max Speed',
			},
			{
				locale: 'ko',
				value: '최대 속도',
			},
		],
		description: 'Fitogether 最大速度',
		descriptionI18n: [
			{
				locale: 'ja',
				value: 'Fitogether 最大速度',
			},
			{
				locale: 'en',
				value: 'Fitogether max speed.',
			},
			{
				locale: 'ko',
				value: 'Fitogether 최대 속도.',
			},
		],
		type: 'raw',
		category: 'TRAINING',
		betterDirection: 'HIGHER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'KMPH',
		roundingPrecision: 1,
		meta: {},
	},
	{
		id: 'RObqK0yOMf4NXhiWig6p',
		createdAt: now,
		updatedAt: now,
		orgId: '2a9dWrDixJ56ysNOgAtR',
		isPublic: false,
		name: '高強度割合',
		nameI18n: [
			{
				locale: 'ja',
				value: '高強度割合',
			},
			{
				locale: 'en',
				value: 'High-intensity Ratio',
			},
			{
				locale: 'ko',
				value: '고강도 비율',
			},
		],
		description: 'Fitogether トレーニング高強度割合',
		descriptionI18n: [
			{
				locale: 'ja',
				value: 'Fitogether トレーニング高強度割合',
			},
			{
				locale: 'en',
				value: 'Fitogether training high-intensity ratio.',
			},
			{
				locale: 'ko',
				value: 'Fitogether 트레이닝 고강도 비율.',
			},
		],
		type: 'raw',
		category: 'TRAINING',
		betterDirection: 'HIGHER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'PERCENT',
		roundingPrecision: 0,
		meta: {},
	},
	{
		id: 'XLp9zGyDi0PgkNHn61ln',
		createdAt: now,
		updatedAt: now,
		orgId: '2a9dWrDixJ56ysNOgAtR',
		isPublic: false,
		name: 'Exp Accel回数',
		nameI18n: [
			{
				locale: 'ja',
				value: 'Exp Accel回数',
			},
			{
				locale: 'en',
				value: 'Exp Accel Count',
			},
			{
				locale: 'ko',
				value: 'Exp Accel 횟수',
			},
		],
		description: 'Fitogether Exp Accel回数',
		descriptionI18n: [
			{
				locale: 'ja',
				value: 'Fitogether Exp Accel回数',
			},
			{
				locale: 'en',
				value: 'Fitogether Exp Accel count.',
			},
			{
				locale: 'ko',
				value: 'Fitogether Exp Accel 횟수.',
			},
		],
		type: 'raw',
		category: 'TRAINING',
		betterDirection: 'HIGHER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'COUNT',
		roundingPrecision: 0,
		meta: {},
	},
	{
		id: 'XYpyu5CZTDZmMY9DbfNG',
		createdAt: now,
		updatedAt: now,
		orgId: '2a9dWrDixJ56ysNOgAtR',
		isPublic: false,
		name: '加速合計回数',
		nameI18n: [
			{
				locale: 'ja',
				value: '加速合計回数',
			},
			{
				locale: 'en',
				value: 'Total Acceleration Count',
			},
			{
				locale: 'ko',
				value: '총 가속 횟수',
			},
		],
		description: 'Fitogether 加速合計回数',
		descriptionI18n: [
			{
				locale: 'ja',
				value: 'Fitogether 加速合計回数',
			},
			{
				locale: 'en',
				value: 'Fitogether total acceleration count.',
			},
			{
				locale: 'ko',
				value: 'Fitogether 총 가속 횟수.',
			},
		],
		type: 'raw',
		category: 'TRAINING',
		betterDirection: 'HIGHER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'COUNT',
		roundingPrecision: 0,
		meta: {},
	},
	{
		id: 'YR3ZEOZLTLwJk23XKVpj',
		createdAt: now,
		updatedAt: now,
		orgId: '2a9dWrDixJ56ysNOgAtR',
		isPublic: false,
		name: 'Accel Zone 6 回数',
		nameI18n: [
			{
				locale: 'ja',
				value: 'Accel Zone 6 回数',
			},
			{
				locale: 'en',
				value: 'Accel Zone 6 Count',
			},
			{
				locale: 'ko',
				value: 'Accel Zone 6 횟수',
			},
		],
		description: 'Fitogether Accel Zone 6 回数',
		descriptionI18n: [
			{
				locale: 'ja',
				value: 'Fitogether Accel Zone 6 回数',
			},
			{
				locale: 'en',
				value: 'Fitogether Accel Zone 6 count.',
			},
			{
				locale: 'ko',
				value: 'Fitogether Accel Zone 6 횟수.',
			},
		],
		type: 'raw',
		category: 'TRAINING',
		betterDirection: 'HIGHER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'COUNT',
		roundingPrecision: 0,
		meta: {},
	},
	{
		id: 'ZfqkRYcNfvwYioquCx5h',
		createdAt: now,
		updatedAt: now,
		orgId: '2a9dWrDixJ56ysNOgAtR',
		isPublic: false,
		name: 'スプリント回数',
		nameI18n: [
			{
				locale: 'ja',
				value: 'スプリント回数',
			},
			{
				locale: 'en',
				value: 'Sprint Count',
			},
			{
				locale: 'ko',
				value: '스프린트 횟수',
			},
		],
		description: 'Fitogether スプリント回数',
		descriptionI18n: [
			{
				locale: 'ja',
				value: 'Fitogether スプリント回数',
			},
			{
				locale: 'en',
				value: 'Fitogether sprint count.',
			},
			{
				locale: 'ko',
				value: 'Fitogether 스프린트 횟수.',
			},
		],
		type: 'raw',
		category: 'TRAINING',
		betterDirection: 'HIGHER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'COUNT',
		roundingPrecision: 0,
		meta: {},
	},
	{
		id: 'b3DroV7arY2KLRUJpdtq',
		createdAt: now,
		updatedAt: now,
		orgId: '2a9dWrDixJ56ysNOgAtR',
		isPublic: false,
		name: 'トレーニングスコア消費',
		nameI18n: [
			{
				locale: 'ja',
				value: 'トレーニングスコア消費',
			},
			{
				locale: 'en',
				value: 'Training Score Expenditure',
			},
			{
				locale: 'ko',
				value: '트레이닝 스코어 소비',
			},
		],
		description: 'Fitogether トレーニングスコア消費',
		descriptionI18n: [
			{
				locale: 'ja',
				value: 'Fitogether トレーニングスコア消費',
			},
			{
				locale: 'en',
				value: 'Fitogether training score expenditure.',
			},
			{
				locale: 'ko',
				value: 'Fitogether 트레이닝 스코어 소비.',
			},
		],
		type: 'raw',
		category: 'TRAINING',
		betterDirection: 'HIGHER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'UNITLESS',
		roundingPrecision: 0,
		meta: {},
	},
	{
		id: 'g60b48TuNLrtstb0dy65',
		createdAt: now,
		updatedAt: now,
		orgId: '2a9dWrDixJ56ysNOgAtR',
		isPublic: false,
		name: 'Decel Zone 5 回数',
		nameI18n: [
			{
				locale: 'ja',
				value: 'Decel Zone 5 回数',
			},
			{
				locale: 'en',
				value: 'Decel Zone 5 Count',
			},
			{
				locale: 'ko',
				value: 'Decel Zone 5 횟수',
			},
		],
		description: 'Fitogether Decel Zone 5 回数',
		descriptionI18n: [
			{
				locale: 'ja',
				value: 'Fitogether Decel Zone 5 回数',
			},
			{
				locale: 'en',
				value: 'Fitogether Decel Zone 5 count.',
			},
			{
				locale: 'ko',
				value: 'Fitogether Decel Zone 5 횟수.',
			},
		],
		type: 'raw',
		category: 'TRAINING',
		betterDirection: 'HIGHER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'COUNT',
		roundingPrecision: 0,
		meta: {},
	},
	{
		id: 'j6u2oo2CjbSngFLioS2Q',
		createdAt: now,
		updatedAt: now,
		orgId: '2a9dWrDixJ56ysNOgAtR',
		isPublic: false,
		name: 'Zone 3 距離',
		nameI18n: [
			{
				locale: 'ja',
				value: 'Zone 3 距離',
			},
			{
				locale: 'en',
				value: 'Zone 3 Distance',
			},
			{
				locale: 'ko',
				value: 'Zone 3 거리',
			},
		],
		description: 'Fitogether Zone 3 距離',
		descriptionI18n: [
			{
				locale: 'ja',
				value: 'Fitogether Zone 3 距離',
			},
			{
				locale: 'en',
				value: 'Fitogether Zone 3 distance.',
			},
			{
				locale: 'ko',
				value: 'Fitogether Zone 3 거리.',
			},
		],
		type: 'raw',
		category: 'TRAINING',
		betterDirection: 'HIGHER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'METER',
		roundingPrecision: 0,
		meta: {},
	},
	{
		id: 'kCZxKxfA9MfWVgBmdTbo',
		createdAt: now,
		updatedAt: now,
		orgId: '2a9dWrDixJ56ysNOgAtR',
		isPublic: false,
		name: 'Accel Zone 5 回数',
		nameI18n: [
			{
				locale: 'ja',
				value: 'Accel Zone 5 回数',
			},
			{
				locale: 'en',
				value: 'Accel Zone 5 Count',
			},
			{
				locale: 'ko',
				value: 'Accel Zone 5 횟수',
			},
		],
		description: 'Fitogether Accel Zone 5 回数',
		descriptionI18n: [
			{
				locale: 'ja',
				value: 'Fitogether Accel Zone 5 回数',
			},
			{
				locale: 'en',
				value: 'Fitogether Accel Zone 5 count.',
			},
			{
				locale: 'ko',
				value: 'Fitogether Accel Zone 5 횟수.',
			},
		],
		type: 'raw',
		category: 'TRAINING',
		betterDirection: 'HIGHER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'COUNT',
		roundingPrecision: 0,
		meta: {},
	},
	{
		id: 'mPoLSRIgbc1IwC3fPsP9',
		createdAt: now,
		updatedAt: now,
		orgId: '2a9dWrDixJ56ysNOgAtR',
		isPublic: false,
		name: 'Decel Zone 6 回数',
		nameI18n: [
			{
				locale: 'ja',
				value: 'Decel Zone 6 回数',
			},
			{
				locale: 'en',
				value: 'Decel Zone 6 Count',
			},
			{
				locale: 'ko',
				value: 'Decel Zone 6 횟수',
			},
		],
		description: 'Fitogether Decel Zone 6 回数',
		descriptionI18n: [
			{
				locale: 'ja',
				value: 'Fitogether Decel Zone 6 回数',
			},
			{
				locale: 'en',
				value: 'Fitogether Decel Zone 6 count.',
			},
			{
				locale: 'ko',
				value: 'Fitogether Decel Zone 6 횟수.',
			},
		],
		type: 'raw',
		category: 'TRAINING',
		betterDirection: 'HIGHER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'COUNT',
		roundingPrecision: 0,
		meta: {},
	},
	{
		id: 'mVykVPzBokSZ0l4C7YhJ',
		createdAt: now,
		updatedAt: now,
		orgId: '2a9dWrDixJ56ysNOgAtR',
		isPublic: false,
		name: 'スプリント距離',
		nameI18n: [
			{
				locale: 'ja',
				value: 'スプリント距離',
			},
			{
				locale: 'en',
				value: 'Sprint Distance',
			},
			{
				locale: 'ko',
				value: '스프린트 거리',
			},
		],
		description: 'Fitogether スプリント距離',
		descriptionI18n: [
			{
				locale: 'ja',
				value: 'Fitogether スプリント距離',
			},
			{
				locale: 'en',
				value: 'Fitogether sprint distance.',
			},
			{
				locale: 'ko',
				value: 'Fitogether 스프린트 거리.',
			},
		],
		type: 'raw',
		category: 'TRAINING',
		betterDirection: 'HIGHER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'METER',
		roundingPrecision: 0,
		meta: {},
	},
	{
		id: 'nulFBwmrHVrA20HPtNrp',
		createdAt: now,
		updatedAt: now,
		orgId: '2a9dWrDixJ56ysNOgAtR',
		isPublic: false,
		name: 'Zone 5 距離',
		nameI18n: [
			{
				locale: 'ja',
				value: 'Zone 5 距離',
			},
			{
				locale: 'en',
				value: 'Zone 5 Distance',
			},
			{
				locale: 'ko',
				value: 'Zone 5 거리',
			},
		],
		description: 'Fitogether Zone 5 距離',
		descriptionI18n: [
			{
				locale: 'ja',
				value: 'Fitogether Zone 5 距離',
			},
			{
				locale: 'en',
				value: 'Fitogether Zone 5 distance.',
			},
			{
				locale: 'ko',
				value: 'Fitogether Zone 5 거리.',
			},
		],
		type: 'raw',
		category: 'TRAINING',
		betterDirection: 'HIGHER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'METER',
		roundingPrecision: 0,
		meta: {},
	},
	{
		id: 'Q6vL9xT2mP3aH7sK1dZ4',
		createdAt: now,
		updatedAt: now,
		orgId: '2a9dWrDixJ56ysNOgAtR',
		isPublic: false,
		name: 'Zone 6 距離',
		nameI18n: [
			{
				locale: 'ja',
				value: 'Zone 6 距離',
			},
			{
				locale: 'en',
				value: 'Zone 6 Distance',
			},
			{
				locale: 'ko',
				value: 'Zone 6 거리',
			},
		],
		description: 'Fitogether Zone 6 距離',
		descriptionI18n: [
			{
				locale: 'ja',
				value: 'Fitogether Zone 6 距離',
			},
			{
				locale: 'en',
				value: 'Fitogether Zone 6 distance.',
			},
			{
				locale: 'ko',
				value: 'Fitogether Zone 6 거리.',
			},
		],
		type: 'raw',
		category: 'TRAINING',
		betterDirection: 'HIGHER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'METER',
		roundingPrecision: 0,
		meta: {},
	},
	{
		id: 'n4Gm1Yc7pR2t8Vb5Jk9X',
		createdAt: now,
		updatedAt: now,
		orgId: '2a9dWrDixJ56ysNOgAtR',
		isPublic: false,
		name: 'Zone 7 距離',
		nameI18n: [
			{
				locale: 'ja',
				value: 'Zone 7 距離',
			},
			{
				locale: 'en',
				value: 'Zone 7 Distance',
			},
			{
				locale: 'ko',
				value: 'Zone 7 거리',
			},
		],
		description: 'Fitogether Zone 7 距離',
		descriptionI18n: [
			{
				locale: 'ja',
				value: 'Fitogether Zone 7 距離',
			},
			{
				locale: 'en',
				value: 'Fitogether Zone 7 distance.',
			},
			{
				locale: 'ko',
				value: 'Fitogether Zone 7 거리.',
			},
		],
		type: 'raw',
		category: 'TRAINING',
		betterDirection: 'HIGHER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'METER',
		roundingPrecision: 0,
		meta: {},
	},
	{
		id: 'a7S2dF9hK3lQ5wE8rT6u',
		createdAt: now,
		updatedAt: now,
		orgId: '2a9dWrDixJ56ysNOgAtR',
		isPublic: false,
		name: 'Zone 8 距離',
		nameI18n: [
			{
				locale: 'ja',
				value: 'Zone 8 距離',
			},
			{
				locale: 'en',
				value: 'Zone 8 Distance',
			},
			{
				locale: 'ko',
				value: 'Zone 8 거리',
			},
		],
		description: 'Fitogether Zone 8 距離',
		descriptionI18n: [
			{
				locale: 'ja',
				value: 'Fitogether Zone 8 距離',
			},
			{
				locale: 'en',
				value: 'Fitogether Zone 8 distance.',
			},
			{
				locale: 'ko',
				value: 'Fitogether Zone 8 거리.',
			},
		],
		type: 'raw',
		category: 'TRAINING',
		betterDirection: 'HIGHER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'METER',
		roundingPrecision: 0,
		meta: {},
	},
	{
		id: 'p8N1cD4fG6hJ2kL5mQ7Z',
		createdAt: now,
		updatedAt: now,
		orgId: '2a9dWrDixJ56ysNOgAtR',
		isPublic: false,
		name: 'Zone 9 距離',
		nameI18n: [
			{
				locale: 'ja',
				value: 'Zone 9 距離',
			},
			{
				locale: 'en',
				value: 'Zone 9 Distance',
			},
			{
				locale: 'ko',
				value: 'Zone 9 거리',
			},
		],
		description: 'Fitogether Zone 9 距離',
		descriptionI18n: [
			{
				locale: 'ja',
				value: 'Fitogether Zone 9 距離',
			},
			{
				locale: 'en',
				value: 'Fitogether Zone 9 distance.',
			},
			{
				locale: 'ko',
				value: 'Fitogether Zone 9 거리.',
			},
		],
		type: 'raw',
		category: 'TRAINING',
		betterDirection: 'HIGHER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'METER',
		roundingPrecision: 0,
		meta: {},
	},
	{
		id: 'oKXeSMbv7zfV7WjTV4Wp',
		createdAt: now,
		updatedAt: now,
		orgId: '2a9dWrDixJ56ysNOgAtR',
		isPublic: false,
		name: 'Zone 4 距離',
		nameI18n: [
			{
				locale: 'ja',
				value: 'Zone 4 距離',
			},
			{
				locale: 'en',
				value: 'Zone 4 Distance',
			},
			{
				locale: 'ko',
				value: 'Zone 4 거리',
			},
		],
		description: 'Fitogether Zone 4 距離',
		descriptionI18n: [
			{
				locale: 'ja',
				value: 'Fitogether Zone 4 距離',
			},
			{
				locale: 'en',
				value: 'Fitogether Zone 4 distance.',
			},
			{
				locale: 'ko',
				value: 'Fitogether Zone 4 거리.',
			},
		],
		type: 'raw',
		category: 'TRAINING',
		betterDirection: 'HIGHER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'METER',
		roundingPrecision: 0,
		meta: {},
	},
	{
		id: 'oOQMjHICxmf3nLwvDitk',
		createdAt: now,
		updatedAt: now,
		orgId: '2a9dWrDixJ56ysNOgAtR',
		isPublic: false,
		name: 'ウォーキング割合',
		nameI18n: [
			{
				locale: 'ja',
				value: 'ウォーキング割合',
			},
			{
				locale: 'en',
				value: 'Walking Ratio',
			},
			{
				locale: 'ko',
				value: '걷기 비율',
			},
		],
		description: 'Fitogether ウォーキング割合',
		descriptionI18n: [
			{
				locale: 'ja',
				value: 'Fitogether ウォーキング割合',
			},
			{
				locale: 'en',
				value: 'Fitogether walking ratio.',
			},
			{
				locale: 'ko',
				value: 'Fitogether 걷기 비율.',
			},
		],
		type: 'raw',
		category: 'TRAINING',
		betterDirection: 'HIGHER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'PERCENT',
		roundingPrecision: 0,
		meta: {},
	},
	{
		id: 'vMV5RRPagpuPxkoU8F2T',
		createdAt: now,
		updatedAt: now,
		orgId: '2a9dWrDixJ56ysNOgAtR',
		isPublic: false,
		name: 'Exp Decell 回数',
		nameI18n: [
			{
				locale: 'ja',
				value: 'Exp Decell 回数',
			},
			{
				locale: 'en',
				value: 'Exp Decel Count',
			},
			{
				locale: 'ko',
				value: 'Exp Decel 횟수',
			},
		],
		description: 'Fitogether Exp Decell 回数',
		descriptionI18n: [
			{
				locale: 'ja',
				value: 'Fitogether Exp Decell 回数',
			},
			{
				locale: 'en',
				value: 'Fitogether Exp Decel count.',
			},
			{
				locale: 'ko',
				value: 'Fitogether Exp Decel 횟수.',
			},
		],
		type: 'raw',
		category: 'TRAINING',
		betterDirection: 'HIGHER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'COUNT',
		roundingPrecision: 0,
		meta: {},
	},
	{
		id: 'zNB0AN1gxSC4IvhgqmlF',
		createdAt: now,
		updatedAt: now,
		orgId: '2a9dWrDixJ56ysNOgAtR',
		isPublic: false,
		name: 'Zone 2 距離',
		nameI18n: [
			{
				locale: 'ja',
				value: 'Zone 2 距離',
			},
			{
				locale: 'en',
				value: 'Zone 2 Distance',
			},
			{
				locale: 'ko',
				value: 'Zone 2 거리',
			},
		],
		description: 'Fitogether Zone 2 距離',
		descriptionI18n: [
			{
				locale: 'ja',
				value: 'Fitogether Zone 2 距離',
			},
			{
				locale: 'en',
				value: 'Fitogether Zone 2 distance.',
			},
			{
				locale: 'ko',
				value: 'Fitogether Zone 2 거리.',
			},
		],
		type: 'raw',
		category: 'TRAINING',
		betterDirection: 'HIGHER_IS_BETTER',
		formula: null,
		sourceMetricDefinitionIds: null,
		unit: 'METER',
		roundingPrecision: 0,
		meta: {},
	},
];

export const deviceInputConfigs: DeviceInputConfig[] = [
	{
		id: 'BcSJAqPj3U9wdK6iOjxA',
		createdAt: now,
		updatedAt: now,
		orgId: null,
		deviceType: 'GATE',
		collectionMode: 'GATE_SESSION_V2',
		mainMetricDefinitionId: 'FEEunCRt96GG5wXvoDWm',
		gatePathSteps: [
			{
				gateIndex: 0,
				state: 'BLOCKING',
				captureTimestamp: false,
				captureOptions: null,
				resetTime: true,
				engageSession: true,
				readyNext: false,
			},
			{
				gateIndex: 0,
				state: 'BLOCKING',
				captureTimestamp: false,
				captureOptions: null,
				resetTime: false,
				engageSession: false,
				readyNext: false,
			},
			{
				gateIndex: 0,
				state: 'BLOCKING',
				captureTimestamp: true,
				captureOptions: {
					metricDefinitionId: 'FEEunCRt96GG5wXvoDWm',
					type: 'ABSOLUTE',
					relativeToStepIndex: null,
				},
				resetTime: false,
				engageSession: false,
				readyNext: false,
			},
		],
		readyConditions: [
			{
				gateIndex: 0,
				requiredState: 'NON_BLOCKING',
			},
		],
		allowStaggeredStart: false,
		contentProviderId: null,
	},
	{
		id: 'Rk9TI1OFeNVQ1vPcBfRl',
		createdAt: now,
		updatedAt: now,
		orgId: null,
		deviceType: 'GATE',
		collectionMode: 'GATE_SESSION_V2',
		mainMetricDefinitionId: 'uaaLUh0KRykPkWA3Dhcd',
		gatePathSteps: [
			{
				gateIndex: 0,
				state: 'BLOCKING',
				captureTimestamp: false,
				captureOptions: null,
				resetTime: true,
				engageSession: true,
				readyNext: false,
			},
			{
				gateIndex: 1,
				state: 'BLOCKING',
				captureTimestamp: true,
				captureOptions: {
					metricDefinitionId: 'uhQDnmvGVOGPgEYAxJh0',
					type: 'ABSOLUTE',
					relativeToStepIndex: null,
				},
				resetTime: false,
				engageSession: false,
				readyNext: false,
			},
			{
				gateIndex: 2,
				state: 'BLOCKING',
				captureTimestamp: true,
				captureOptions: {
					metricDefinitionId: 'sgUyE2xgSX4d5YLDVFdO',
					type: 'ABSOLUTE',
					relativeToStepIndex: null,
				},
				resetTime: false,
				engageSession: false,
				readyNext: false,
			},
			{
				gateIndex: 3,
				state: 'BLOCKING',
				captureTimestamp: true,
				captureOptions: {
					metricDefinitionId: 'uaaLUh0KRykPkWA3Dhcd',
					type: 'ABSOLUTE',
					relativeToStepIndex: null,
				},
				resetTime: false,
				engageSession: false,
				readyNext: false,
			},
		],
		readyConditions: [
			{ gateIndex: 0, requiredState: 'NON_BLOCKING' },
			{ gateIndex: 1, requiredState: 'NON_BLOCKING' },
			{ gateIndex: 2, requiredState: 'NON_BLOCKING' },
			{ gateIndex: 3, requiredState: 'NON_BLOCKING' },
		],
		allowStaggeredStart: false,
		contentProviderId: null,
	},
	{
		id: 'qxgnEF7FUmQeTSIw1sgm',
		createdAt: now,
		updatedAt: now,
		orgId: null,
		deviceType: 'GATE',
		collectionMode: 'GATE_SESSION_V2',
		mainMetricDefinitionId: 'UiJ8YCBfUdI9OPnknlU4',
		gatePathSteps: [
			{
				gateIndex: 0,
				state: 'BLOCKING',
				captureTimestamp: false,
				captureOptions: null,
				resetTime: true,
				engageSession: true,
				readyNext: false,
			},
			{
				gateIndex: 0,
				state: 'BLOCKING',
				captureTimestamp: false,
				captureOptions: null,
				resetTime: false,
				engageSession: false,
				readyNext: false,
			},
			{
				gateIndex: 0,
				state: 'BLOCKING',
				captureTimestamp: true,
				captureOptions: {
					metricDefinitionId: 'UiJ8YCBfUdI9OPnknlU4',
					type: 'ABSOLUTE',
					relativeToStepIndex: null,
				},
				resetTime: false,
				engageSession: false,
				readyNext: false,
			},
		],
		readyConditions: [
			{
				gateIndex: 0,
				requiredState: 'NON_BLOCKING',
			},
		],
		allowStaggeredStart: false,
		contentProviderId: null,
	},
];

export const performanceAssessmentTemplates: PerformanceAssessmentTemplate[] = [
	{
		id: 'lxIwgccLRJElDAkmHgEl',
		name: '藤野メソッド・フル',
		nameI18n: [
			{
				locale: 'ja',
				value: '藤野メソッド・フル',
			},
			{
				locale: 'en',
				value: 'Fujino Method - Full',
			},
			{
				locale: 'ko',
				value: '후지노 메소드 - 풀',
			},
		],
		createdAt: '2025-04-20T05:20:09.732Z',
		updatedAt: '2025-04-20T05:20:09.732Z',
		orgId: 'default',
		description: '',
		descriptionI18n: [
			{
				locale: 'ja',
				value: '',
			},
			{
				locale: 'en',
				value: '',
			},
			{
				locale: 'ko',
				value: '',
			},
		],
		items: [
			{
				metricDefinitionId: '3s004Lb8UM9Tiag3kQNR',
				scored: false,
			},
			{
				metricDefinitionId: 'JyCFHqA5HAOBPcqCOwCv',
				scored: false,
			},
			{
				metricDefinitionId: 'V1AdIWTGwvVa2RYmZLsC',
				scored: false,
			},
			{
				metricDefinitionId: 'uhQDnmvGVOGPgEYAxJh0',
				scored: true,
			},
			{
				metricDefinitionId: 'sgUyE2xgSX4d5YLDVFdO',
				scored: true,
			},
			{
				metricDefinitionId: 'uaaLUh0KRykPkWA3Dhcd',
				scored: true,
			},
			{
				metricDefinitionId: 'FEEunCRt96GG5wXvoDWm',
				scored: false,
			},
			{
				metricDefinitionId: 'UiJ8YCBfUdI9OPnknlU4',
				scored: false,
			},
			{
				metricDefinitionId: 'HWtqdoyh1WIjpJIGtHbM',
				scored: false,
			},
			{
				metricDefinitionId: 'u5Wdg1MlL88rYKbPQW3o',
				scored: true,
			},
			{
				metricDefinitionId: 'Hi5CitOIe4MLS2uF3dqc',
				scored: false,
			},
			{
				metricDefinitionId: '9Ubx6BwRXrl4Fqc60BEQ',
				scored: false,
			},
			{
				metricDefinitionId: 'i3tQbxmRVijkzlXngPan',
				scored: false,
			},
			{
				metricDefinitionId: 'ojpzLOSCTMZf6s4SvRja',
				scored: true,
			},
			{
				metricDefinitionId: '5iu1YWxuZFt6X2Stg0iy',
				scored: true,
			},
			{
				metricDefinitionId: 'lMaeLRMQfMa1WKbOyly7',
				scored: true,
			},
		],
	},
	{
		id: 'pBySImSxY3qMzLvbBMAW',
		name: '藤野メソッド・シンプル',
		nameI18n: [
			{
				locale: 'ja',
				value: '藤野メソッド・シンプル',
			},
			{
				locale: 'en',
				value: 'Fujino Method - Simple',
			},
			{
				locale: 'ko',
				value: '후지노 메소드 - 심플',
			},
		],
		createdAt: '2025-04-21T06:39:41.334Z',
		updatedAt: '2025-04-21T06:39:41.334Z',
		orgId: 'default',
		description: '',
		descriptionI18n: [
			{
				locale: 'ja',
				value: '',
			},
			{
				locale: 'en',
				value: '',
			},
			{
				locale: 'ko',
				value: '',
			},
		],
		items: [
			{
				metricDefinitionId: '3s004Lb8UM9Tiag3kQNR',
				scored: false,
			},
			{
				metricDefinitionId: 'JyCFHqA5HAOBPcqCOwCv',
				scored: false,
			},
			{
				metricDefinitionId: 'V1AdIWTGwvVa2RYmZLsC',
				scored: false,
			},
			{
				metricDefinitionId: 'uhQDnmvGVOGPgEYAxJh0',
				scored: true,
			},
			{
				metricDefinitionId: 'sgUyE2xgSX4d5YLDVFdO',
				scored: true,
			},
			{
				metricDefinitionId: 'uaaLUh0KRykPkWA3Dhcd',
				scored: true,
			},
			{
				metricDefinitionId: 'FEEunCRt96GG5wXvoDWm',
				scored: false,
			},
			{
				metricDefinitionId: 'UiJ8YCBfUdI9OPnknlU4',
				scored: false,
			},
			{
				metricDefinitionId: 'HWtqdoyh1WIjpJIGtHbM',
				scored: false,
			},
			{
				metricDefinitionId: 'u5Wdg1MlL88rYKbPQW3o',
				scored: true,
			},
			{
				metricDefinitionId: 'lMaeLRMQfMa1WKbOyly7',
				scored: true,
			},
			{
				metricDefinitionId: 'Hi5CitOIe4MLS2uF3dqc',
				scored: false,
			},
			{
				metricDefinitionId: '9Ubx6BwRXrl4Fqc60BEQ',
				scored: false,
			},
			{
				metricDefinitionId: 'i3tQbxmRVijkzlXngPan',
				scored: false,
			},
			{
				metricDefinitionId: 'ojpzLOSCTMZf6s4SvRja',
				scored: true,
			},
		],
	},
];

export const referenceTable: ReferenceTable = {
	FEEunCRt96GG5wXvoDWm: {
		'U10-U12': null,
		'U16-U18': null,
	}, // Pro Agility 右
	UiJ8YCBfUdI9OPnknlU4: {
		'U10-U12': null,
		'U16-U18': null,
	}, // Pro Agility 左
	HWtqdoyh1WIjpJIGtHbM: {
		'U10-U12': null,
		'U16-U18': null,
	}, // Pro Agility 左右差(%)
	u5Wdg1MlL88rYKbPQW3o: {
		'U10-U12': { mean: 5.43, std: 0.21 },
		'U16-U18': { mean: 4.81, std: 0.13 },
	}, // Pro Agility 平均
	V1AdIWTGwvVa2RYmZLsC: {
		'U10-U12': null,
		'U16-U18': null,
	}, // BMI
	JyCFHqA5HAOBPcqCOwCv: {
		'U10-U12': null,
		'U16-U18': null,
	}, // 体重
	'3s004Lb8UM9Tiag3kQNR': {
		'U10-U12': null,
		'U16-U18': null,
	}, // 身長
	y7h8I9Mkl1ppg5ZmRpUb: {
		'U10-U12': null,
		'U16-U18': { mean: 24.7, std: 6.1 },
	}, // YoYo
	Hi5CitOIe4MLS2uF3dqc: {
		'U10-U12': null,
		'U16-U18': null,
	}, // 3 HOP 右
	'9Ubx6BwRXrl4Fqc60BEQ': {
		'U10-U12': null,
		'U16-U18': null,
	}, // 3 HOP 左
	i3tQbxmRVijkzlXngPan: {
		'U10-U12': null,
		'U16-U18': null,
	}, // 3 HOP 左右差(%)
	ojpzLOSCTMZf6s4SvRja: {
		'U10-U12': { mean: 4.42, std: 0.42 },
		'U16-U18': { mean: 6.44, std: 0.46 },
	}, // 3 HOP 平均
	'5iu1YWxuZFt6X2Stg0iy': {
		'U10-U12': { mean: 9, std: 0.79 },
		'U16-U18': { mean: 12.3, std: 0.73 },
	}, // 両足５段跳び
	lMaeLRMQfMa1WKbOyly7: {
		'U10-U12': { mean: 1.8285, std: 0.1603 },
		'U16-U18': { mean: 2.42, std: 0.1268 },
	}, // 立ち幅跳び
	uhQDnmvGVOGPgEYAxJh0: {
		'U10-U12': { mean: 2.1, std: 0.09 },
		'U16-U18': { mean: 1.77, std: 0.07 },
	}, // 10M スプリント
	sgUyE2xgSX4d5YLDVFdO: {
		'U10-U12': { mean: 3.63, std: 0.16 },
		'U16-U18': { mean: 3.03, std: 0.09 },
	}, // 20M スプリント
	uaaLUh0KRykPkWA3Dhcd: {
		'U10-U12': { mean: 5.12, std: 0.24 },
		'U16-U18': { mean: 4.22, std: 0.12 },
	}, // 30M スプリント
};

export const capabilitiesResponse = {
	version: 'v1',
	capabilities: {
		metricDefinitions: true,
		scoreProviders: true,
		performanceAssessmentTemplates: true,
		deviceInputConfigs: true,
	},
};
