import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { trainingBudgetService } from '$lib/services/training-budget.service';
import { DateTime } from 'luxon';

export const GET: RequestHandler = async ({ url }) => {
	const orgId = url.searchParams.get('orgId');
	const yearParamStr = url.searchParams.get('year');
	const yearParam = yearParamStr ? Number(yearParamStr) : undefined;

	if (!orgId) {
		return json({ message: 'orgId is required' }, { status: 400 });
	}

	const config = await trainingBudgetService.getConfig(orgId);
	const resolvedYear = resolveCalendarYear(yearParam, config.startMonth);
	const snapshot = await trainingBudgetService.getYearSnapshot(orgId, resolvedYear);

	return json({
		orgId,
		year: resolvedYear,
		config: snapshot.config,
		budgets: snapshot.budgets,
		events: snapshot.events
	});
};

type SavePayload = {
	orgId?: string;
	year?: number;
	config?: {
		startMonth: number;
		weekStartsOn: number;
	};
	budgets?: Array<{ allocatedOn: string; value: string | number }>;
	events?: Array<{ id?: string; eventDate: string; eventName: string }>;
	deletedEventIds?: string[];
};

export const POST: RequestHandler = async ({ request }) => {
	let body: SavePayload;
	try {
		body = await request.json();
	} catch (err) {
		return json({ message: 'Invalid JSON payload' }, { status: 400 });
	}

	if (!body.orgId) {
		return json({ message: 'orgId is required' }, { status: 400 });
	}

	const config = body.config
		? {
				startMonth: Number(body.config.startMonth),
				weekStartsOn: Number(body.config.weekStartsOn)
			}
		: undefined;

	const budgets = (body.budgets ?? []).map((entry) => ({
		allocatedOn: entry.allocatedOn,
		budget: toNumber(entry.value)
	}));

	const datesToDelete = budgets
		.filter((entry) => entry.budget === null)
		.map((entry) => entry.allocatedOn);
	const budgetsToSave = budgets.filter(
		(entry): entry is { allocatedOn: string; budget: number } => entry.budget !== null
	);

	await trainingBudgetService.saveYearSnapshot({
		orgId: body.orgId,
		config,
		budgets: budgetsToSave,
		budgetDatesToDelete: datesToDelete,
		events: body.events ?? [],
		deletedEventIds: body.deletedEventIds ?? []
	});

	const configDoc = await trainingBudgetService.getConfig(body.orgId);
	const resolvedYear = resolveCalendarYear(body.year, configDoc.startMonth);
	const snapshot = await trainingBudgetService.getYearSnapshot(body.orgId, resolvedYear);

	return json({
		ok: true,
		config: snapshot.config,
		budgets: snapshot.budgets,
		events: snapshot.events
	});
};

const toNumber = (value: string | number | undefined): number | null => {
	if (value === undefined || value === null || value === '') return null;
	const parsed = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(parsed) ? parsed : null;
};

const resolveCalendarYear = (yearParam: number | undefined | null, startMonth: number) => {
	if (Number.isFinite(yearParam)) return Number(yearParam);
	const today = DateTime.now();
	return today.month >= startMonth ? today.year : today.year - 1;
};
