export type BetterDirection = 'LOWER_IS_BETTER' | 'HIGHER_IS_BETTER';
export type MetricDefinitionType = 'raw' | 'derived';
export type MetricUnit =
	| 'UNITLESS'
	| 'CENTIMETER'
	| 'KILOGRAM'
	| 'COUNT'
	| 'PERCENT'
	| 'METER'
	| 'SECOND'
	| 'MINUTE'
	| 'HOUR'
	| 'KMPH';

export type DerivedOperation = 'AVERAGE' | 'DIFFERENCE_PERCENT' | 'BMI';

export type DeviceType = 'GATE' | 'UNKNOWN';
export type CollectionMode = 'GATE_SESSION_V2' | 'GROUP_DROPOUT_V1' | 'SIMPLE_INPUT_V1';
export type BlockingState = 'BLOCKING' | 'NON_BLOCKING';
export type CaptureType = 'ABSOLUTE' | 'RELATIVE';
