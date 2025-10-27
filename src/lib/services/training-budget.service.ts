import { randomUUID } from 'node:crypto';
import { adminDb } from '../admin-firebase';
import { DateTime } from 'luxon';
import { getCalendarYearRange } from '../utils/calendar.util';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';

export type TrainingBudgetConfig = {
	orgId: string;
	startMonth: number; // 1-12
	weekStartsOn: number; // 0 (Mon) - 6 (Sun)
};

export type WeeklyTrainingBudget = {
	id: string;
	orgId: string;
	allocatedOn: string; // ISO date (week start)
	expiresOn: string; // ISO date (week end)
	budget: number;
};

export type TrainingKeyEvent = {
	id: string;
	orgId: string;
	eventName: string;
	eventDate: string; // ISO date
};

const DEFAULT_CONFIG: TrainingBudgetConfig = {
	orgId: '',
	startMonth: 4,
	weekStartsOn: 0
};

const budgetId = (orgId: string, allocatedOn: string) => `${orgId}_${allocatedOn}`;

class TrainingBudgetService {
	private readonly budgetCollection = adminDb.collection('trainingBudgets');
	private readonly eventCollection = adminDb.collection('trainingKeyEvents');
	private readonly configCollection = adminDb.collection('trainingBudgetConfigs');

	async getConfig(orgId: string): Promise<TrainingBudgetConfig> {
		const snapshot = await this.configCollection.doc(orgId).get();
		if (!snapshot.exists) {
			return { ...DEFAULT_CONFIG, orgId };
		}

		return snapshot.data() as TrainingBudgetConfig;
	}

	async saveConfig(orgId: string, config: Partial<TrainingBudgetConfig>) {
		const payload = {
			startMonth: config.startMonth ?? DEFAULT_CONFIG.startMonth,
			weekStartsOn: config.weekStartsOn ?? DEFAULT_CONFIG.weekStartsOn,
			orgId
		};
		await this.configCollection.doc(orgId).set(payload, { merge: true });
		return payload;
	}

	async listYearBudgets(orgId: string, year: number, startMonth: number): Promise<WeeklyTrainingBudget[]> {
		const { start, end } = getCalendarYearRange(year, startMonth);
		const docs = await this.budgetCollection
			.where('orgId', '==', orgId)
			.where('allocatedOn', '>=', start.toISODate())
			.where('allocatedOn', '<', end.toISODate())
			.orderBy('allocatedOn')
			.get();

		return docs.docs.map((docSnap: QueryDocumentSnapshot) => {
			const data = docSnap.data() as WeeklyTrainingBudget;
			return { ...data, id: docSnap.id };
		});
	}

	async listYearEvents(orgId: string, year: number, startMonth: number): Promise<TrainingKeyEvent[]> {
		const { start, end } = getCalendarYearRange(year, startMonth);
		const docs = await this.eventCollection
			.where('orgId', '==', orgId)
			.where('eventDate', '>=', start.toISODate())
			.where('eventDate', '<', end.toISODate())
			.orderBy('eventDate')
			.get();

		return docs.docs.map((docSnap: QueryDocumentSnapshot) => {
			const data = docSnap.data() as TrainingKeyEvent;
			return { ...data, id: docSnap.id };
		});
	}

	async saveBudgets(orgId: string, budgets: WeeklyTrainingBudget[]) {
		const batch = adminDb.batch();
		for (const budget of budgets) {
			const docId = budgetId(orgId, budget.allocatedOn);
			const ref = this.budgetCollection.doc(docId);
			batch.set(ref, { ...budget, orgId, id: docId });
		}
		await batch.commit();
	}

	async deleteBudgets(orgId: string, allocatedOnDates: string[]) {
		if (!allocatedOnDates.length) return;
		const batch = adminDb.batch();
		for (const allocatedOn of allocatedOnDates) {
			const ref = this.budgetCollection.doc(budgetId(orgId, allocatedOn));
			batch.delete(ref);
		}
		await batch.commit();
	}

	async saveEvents(orgId: string, events: TrainingKeyEvent[], deletedEventIds: string[]) {
		const batch = adminDb.batch();

		for (const id of deletedEventIds) {
			const ref = this.eventCollection.doc(id);
			batch.delete(ref);
		}

		for (const event of events) {
			if (!event.eventName?.trim() || !event.eventDate) continue;
			const docId = event.id?.startsWith('temp-') || !event.id ? randomUUID() : event.id;
			const ref = this.eventCollection.doc(docId);
			batch.set(ref, {
				id: docId,
				orgId,
				eventDate: event.eventDate,
				eventName: event.eventName.trim()
			});
		}

		await batch.commit();
	}

	async saveYearSnapshot(params: {
		orgId: string;
		config?: Partial<TrainingBudgetConfig>;
		budgets: Array<{ allocatedOn: string; budget: number }>;
		budgetDatesToDelete: string[];
		events: Array<{ id?: string; eventName: string; eventDate: string }>;
		deletedEventIds: string[];
	}) {
		const { orgId, config, budgets, budgetDatesToDelete, events, deletedEventIds } = params;
		if (config) {
			await this.saveConfig(orgId, config);
		}

		const sanitizedBudgets: WeeklyTrainingBudget[] = budgets
			.map((entry) => {
				const date = DateTime.fromISO(entry.allocatedOn);
				if (!date.isValid) return null;
				const allocatedOn = date.toISODate();
				if (!allocatedOn || entry.budget === null || entry.budget === undefined) return null;
				return {
					id: budgetId(orgId, allocatedOn),
					orgId,
					allocatedOn,
					expiresOn: date.plus({ days: 6 }).toISODate()!,
					budget: entry.budget
				};
			})
			.filter((item): item is WeeklyTrainingBudget => Boolean(item));

		await this.saveBudgets(orgId, sanitizedBudgets);
		await this.deleteBudgets(orgId, budgetDatesToDelete);

		const sanitizedEvents: TrainingKeyEvent[] = events.map((event) => ({
			id: event.id ?? `temp-${randomUUID()}`,
			orgId,
			eventDate: event.eventDate,
			eventName: event.eventName
		}));

		await this.saveEvents(orgId, sanitizedEvents, deletedEventIds);
	}

	async getYearSnapshot(orgId: string, year: number) {
		const config = await this.getConfig(orgId);
		const budgets = await this.listYearBudgets(orgId, year, config.startMonth);
		const events = await this.listYearEvents(orgId, year, config.startMonth);
		return { config, budgets, events };
	}
}

export const trainingBudgetService = new TrainingBudgetService();
