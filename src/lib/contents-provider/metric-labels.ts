import { metricDefinitions } from './content';

export type MetricMeta = {
	label: string;
	unit?: string;
	roundingPrecision?: number;
};

export function buildMetricLabels(): Map<string, string> {
	const labels = new Map<string, string>();
	labels.set('fullName', '氏名');
	for (const metric of metricDefinitions) {
		labels.set(metric.id, metric.name);
	}
	return labels;
}

export function buildMetricMeta(): Map<string, MetricMeta> {
	const meta = new Map<string, MetricMeta>();
	meta.set('fullName', { label: '氏名' });
	for (const metric of metricDefinitions) {
		meta.set(metric.id, {
			label: metric.name,
			unit: metric.unit,
			roundingPrecision: metric.roundingPrecision,
		});
	}
	return meta;
}
