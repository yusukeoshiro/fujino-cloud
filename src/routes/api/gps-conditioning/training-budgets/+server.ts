import { error, json, type RequestHandler } from '@sveltejs/kit';
import { DateTime } from 'luxon';
import { trainingBudgetService } from '$lib/services/training-budget.service';

export const GET: RequestHandler = async (event) => {
	const orgId = event.url.searchParams.get('orgId');
	if (!orgId) {
		throw error(400, 'orgId is required');
	}

	const yearParamStr = event.url.searchParams.get('year');
	const yearParam = yearParamStr ? Number(yearParamStr) : undefined;

	const config = await trainingBudgetService.getConfig(orgId);
	const resolvedYear = resolveCalendarYear(yearParam, config.startMonth);
	const snapshot = await trainingBudgetService.getYearSnapshot(orgId, resolvedYear);

	return json({
		orgId,
		year: resolvedYear,
		config: snapshot.config,
		budgets: snapshot.budgets,
		events: snapshot.events,
	});
};

const resolveCalendarYear = (yearParam: number | undefined | null, startMonth: number) => {
	if (Number.isFinite(yearParam)) return Number(yearParam);
	const today = DateTime.now();
	return today.month >= startMonth ? today.year : today.year - 1;
};
