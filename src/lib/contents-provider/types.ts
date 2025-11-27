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
