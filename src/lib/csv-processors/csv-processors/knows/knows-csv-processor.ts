import { json } from '@sveltejs/kit';
import { PlayerGpsSession } from '$lib/csv-processors/player-gps-session/player-gps-session';
import {
	coerce,
	normalizeIdentifier,
} from '$lib/csv-processors/csv-processors/fitogether/fitogether-csv-processor';

export const KNOWS_NAME_FIELD = 'Name';

export interface KnowsPersonRecord {
	id?: string | null;
	fullName?: string | null;
	birthday?: string | null;
	externalId?: string | number | null;
}

export interface KnowsCsvProcessorOptions {
	rawRecords: Array<Record<string, string>>;
	originalHeaders: string[];
	persons: KnowsPersonRecord[];
	sessionDate?: string | null;
}

export interface KnowsBuildParsersOptions {
	trainingBaseline: ConstructorParameters<typeof PlayerGpsSession>[1];
	fallbackBirthday?: string;
}

export interface KnowsCsvProcessedEntry {
	rowIndex: number;
	values: Record<string, string | number>;
	fullName: string;
	matchedPerson: KnowsPersonRecord | null;
	resolvedFullName: string;
	resolvedBirthday: string;
}

export interface KnowsCsvProcessResult {
	entries: KnowsCsvProcessedEntry[];
	parsers: PlayerGpsSession[];
	unmatched: KnowsUnmatchedPerson[];
	headers: string[];
	headerMap: Array<{ field: string; metricDefinitionId: string }>;
}

export interface KnowsUnmatchedPerson {
	row: number;
	playerName: string;
}

const normalizeName = (value: string | null | undefined) =>
	value ? value.replace(/\s+/g, '').trim().toLowerCase() : '';

const parseDurationToMinutes = (raw: string | number): number => {
	const text = String(raw ?? '').trim();
	if (!text) return 0;
	const parts = text.split(':').map((part) => Number(part));
	if (parts.some((part) => !Number.isFinite(part))) return 0;
	let seconds = 0;
	if (parts.length === 3) {
		seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
	} else if (parts.length === 2) {
		seconds = parts[0] * 60 + parts[1];
	} else if (parts.length === 1) {
		seconds = parts[0] * 60;
	} else {
		return 0;
	}
	return Math.floor(seconds / 60);
};

export class KnowsCsvProcessor {
	private personsByExternalId = new Map<string, KnowsPersonRecord>();
	private personsByFullName = new Map<string, KnowsPersonRecord>();
	private seenKeys = new Set<string>();

	constructor(private readonly options: KnowsCsvProcessorOptions) {
		for (const person of options.persons) {
			const externalId = normalizeIdentifier(person.externalId as string | number | null);
			if (externalId) this.personsByExternalId.set(externalId, person);
			const nameKey = normalizeName(person.fullName ?? '');
			if (nameKey && !this.personsByFullName.has(nameKey)) {
				this.personsByFullName.set(nameKey, person);
			}
		}
	}

	process(options: KnowsBuildParsersOptions): KnowsCsvProcessResult {
		const { entries, unmatched, headers, headerMap } = this.collectEntries();
		const fallbackBirthday = options.fallbackBirthday ?? '0000-00-00';
		const sessionDate = this.options.sessionDate ?? '';

		const parsers = entries.map((entry) => {
			const valueFor = (field: string) => entry.values[field] ?? '';
			const resolvedBirthday =
				entry.resolvedBirthday && entry.resolvedBirthday !== '0000-00-00'
					? entry.resolvedBirthday
					: fallbackBirthday;

			const durationMin = parseDurationToMinutes(valueFor('Duration_TF'));
			const totalDistanceM = Number(valueFor('Distance'));
			const totalDistanceMPerMin = durationMin > 0 ? totalDistanceM / durationMin : 0;
			const maxSpeedKMH = Number(valueFor('SPD MX'));
			const sprintCount = Number(valueFor('Sprint'));
			const lowIntensityDistanceM = Number(valueFor('SPD_D_Z1'));
			const highIntensityDistanceM = Number(valueFor('SPD_D_Z5')) + Number(valueFor('SPD_D_Z6'));

			const accelerationCountTotal =
				Number(valueFor('Accel_Z1')) + Number(valueFor('Accel_Z2')) + Number(valueFor('Accel_Z3'));
			const decelerationCountTotal =
				Number(valueFor('Decel_Z1')) + Number(valueFor('Decel_Z2')) + Number(valueFor('Decel_Z3'));

			return new PlayerGpsSession(
				{
					type: 'TRAINING',
					date: sessionDate,
					fullName: entry.resolvedFullName,
					birthday: resolvedBirthday,

					durationMin,
					totalDistanceM,
					totalDistanceMPerMin,
					maxSpeedKMH,

					noOfHSR: 0,
					hsrDistanceM: 0,

					sprintCount,
					sprintDistanceM: 0,
					highIntensityDistanceM,
					lowIntensityDistanceM,
					accelerationCountTotal,
					decelerationCountTotal,

					expAccCount: 0,
					expDecCount: 0,
				},
				options.trainingBaseline,
			);
		});

		return {
			entries,
			parsers,
			unmatched,
			headers,
			headerMap,
		};
	}

	private collectEntries(): Pick<
		KnowsCsvProcessResult,
		'entries' | 'unmatched' | 'headers' | 'headerMap'
	> {
		const { rawRecords, originalHeaders } = this.options;
		const headers: string[] = [];
		const headerSet = new Set<string>();

		const entries: KnowsCsvProcessedEntry[] = [];
		const unmatched: KnowsUnmatchedPerson[] = [];

		rawRecords.forEach((row, rowIndex) => {
			const values: Record<string, string | number> = {};
			for (const [field, value] of Object.entries(row)) {
				values[field] = coerce(value);
				if (!headerSet.has(field)) {
					headerSet.add(field);
					headers.push(field);
				}
			}

			const fullNameValue = values[KNOWS_NAME_FIELD];
			const fullName =
				typeof fullNameValue === 'string'
					? fullNameValue
					: typeof fullNameValue === 'number'
						? String(fullNameValue)
						: '';

			const nameKey = normalizeName(fullName);
			const externalKey = normalizeIdentifier(fullName);
			let matchedPerson = externalKey ? this.personsByExternalId.get(externalKey) : undefined;
			if (!matchedPerson && nameKey) {
				matchedPerson = this.personsByFullName.get(nameKey);
			}

			if (!matchedPerson) {
				unmatched.push({
					row: rowIndex + 2,
					playerName: fullName || '(missing)',
				});
				return;
			}

			const dedupeKey =
				(matchedPerson.id && `person:${matchedPerson.id}`) ||
				(externalKey && `external:${externalKey}`) ||
				`name:${nameKey}`;
			if (dedupeKey) {
				if (this.seenKeys.has(dedupeKey)) return;
				this.seenKeys.add(dedupeKey);
			}

			const resolvedFullName = matchedPerson.fullName ?? fullName;
			const resolvedBirthday = matchedPerson.birthday ?? '0000-00-00';

			entries.push({
				rowIndex,
				values,
				fullName,
				matchedPerson,
				resolvedFullName,
				resolvedBirthday,
			});
		});

		const headerMap = originalHeaders.map((field) => ({
			field,
			metricDefinitionId: '',
		}));

		return {
			entries,
			unmatched,
			headers,
			headerMap,
		};
	}
}

export function buildKnowsUnmatchedPersonsResponse(
	unmatched: KnowsUnmatchedPerson[],
	headers?: string[],
) {
	if (unmatched.length === 0) return null;

	const missingCount = unmatched.filter((item) => item.playerName === '(missing)').length;
	const messageLines = [
		`以下の${unmatched.length}名を既存の選手情報と照合できませんでした。`,
		'KNOWS_V1 は Name 列で照合します（空白を除去して完全一致）。',
		'Name が数値の場合は externalId として照合します。',
		'CSV の Name が空欄、または Persons データベースに一致する氏名/外部IDがありません。',
	];

	if (missingCount === unmatched.length) {
		messageLines.push(
			'全行で Name が取得できませんでした。CSV の区切り文字やヘッダ名（Name）を確認してください。',
		);
	}

	if (headers?.length) {
		messageLines.push(`検出したヘッダ: ${headers.join(', ')}`);
	}
	return json(
		{
			code: 'UNMATCHED_PERSONS',
			message: messageLines.join('\n'),
			details: unmatched.map((item) => ({
				row: item.row,
				playerName: item.playerName,
				description:
					item.playerName === '(missing)'
						? `Row ${item.row}: Name is missing`
						: /^[0-9]+$/.test(item.playerName)
							? `Row ${item.row}: Name "${item.playerName}" not found in Persons (checked externalId/fullName)`
							: `Row ${item.row}: Name "${item.playerName}" not found in Persons`,
			})),
		},
		{ status: 422 },
	);
}
