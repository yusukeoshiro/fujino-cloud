import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { trainingBudgetService } from '$lib/services/training-budget.service';
import { DateTime } from 'luxon';

export const load: PageServerLoad = async ({ params, url }) => {
	const orgId = params.oid;
	if (!orgId) {
		throw error(400, '組織IDが見つかりません。');
	}

	const config = await trainingBudgetService.getConfig(orgId);
	const today = DateTime.now();
	const currentYearFromConfig = today.month >= config.startMonth ? today.year : today.year - 1;
	const yearParam = url.searchParams.get('year');
	const parsedYear = yearParam ? Number(yearParam) : undefined;
	const year =
		parsedYear !== undefined && Number.isFinite(parsedYear) ? parsedYear : currentYearFromConfig;

	const { budgets, events } = await trainingBudgetService.getYearSnapshot(orgId, year);

	return {
		orgId,
		year,
		config,
		budgets,
		events,
		today: today.toISODate(),
	};
};
