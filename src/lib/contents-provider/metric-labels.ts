import { metricDefinitions } from './content';

export function buildMetricLabels(): Map<string, string> {
	const labels = new Map<string, string>();
	labels.set('fullName', '氏名');
	for (const metric of metricDefinitions) {
		labels.set(metric.id, metric.name);
	}
	return labels;
}
