import { json } from '@sveltejs/kit';
import { DateTime } from 'luxon';
import { PlayerGpsSession } from '$lib/csv-processors/player-gps-session/player-gps-session';

export const PLAYER_NAME_FIELD = 'Player Name';
export const JERSEY_NO_FIELD = 'Jersey No.';

export interface FitogetherPersonRecord {
	id?: string | null;
	fullName?: string | null;
	birthday?: string | null;
	externalId?: string | number | null;
}

export interface FitogetherCsvProcessorOptions {
	rawRecords: Array<Record<string, string>>;
	originalHeaders: string[];
	persons: FitogetherPersonRecord[];
	fieldToMetricId?: Record<string, string | undefined>;
	useMetricIds?: boolean;
}

export interface FitogetherBuildParsersOptions {
	trainingBaseline: ConstructorParameters<typeof PlayerGpsSession>[1];
	fallbackBirthday?: string;
}

export interface FitogetherCsvProcessedEntry {
	rowIndex: number;
	values: Record<string, string | number>;
	fullName: string;
	jerseyNo: string;
	matchedPerson: FitogetherPersonRecord | null;
	resolvedFullName: string;
	resolvedBirthday: string;
}

export interface FitogetherCsvProcessResult {
	entries: FitogetherCsvProcessedEntry[];
	parsers: PlayerGpsSession[];
	unmatched: UnmatchedPerson[];
	headers: string[];
	headerMap: Array<{ field: string; metricDefinitionId: string }>;
}

export interface UnmatchedPerson {
	row: number;
	playerName: string;
	jerseyNo: string;
}

export function coerce(value: string): string | number {
	if (value === '') return value;
	const cleaned = value.replace(/,/g, '').trim();
	if (!isNaN(Number(cleaned)) && /^-?\d+(\.\d+)?$/.test(cleaned)) return Number(cleaned);
	return value;
}

export const normalizeIdentifier = (value: string | number | null | undefined) => {
	if (value === null || value === undefined) return '';
	const raw = typeof value === 'number' ? String(value) : value.trim();
	if (!raw) return '';
	return /^[0-9]+$/.test(raw) ? String(Number(raw)) : raw;
};

export const normalizeName = (value: string | null | undefined) =>
	value ? value.trim().toLowerCase() : '';

type CollectEntriesResult = Pick<
	FitogetherCsvProcessResult,
	'entries' | 'unmatched' | 'headers' | 'headerMap'
>;

export class FitogetherCsvProcessor {
	private personsByExternalId = new Map<string, FitogetherPersonRecord>();
	private personsByFullName = new Map<string, FitogetherPersonRecord>();
	private seenKeys = new Set<string>();

	constructor(private readonly options: FitogetherCsvProcessorOptions) {
		for (const person of options.persons) {
			const externalId = normalizeIdentifier(person.externalId as string | number | null);
			if (externalId) this.personsByExternalId.set(externalId, person);
			const nameKey = normalizeName(person.fullName ?? '');
			if (nameKey && !this.personsByFullName.has(nameKey)) {
				this.personsByFullName.set(nameKey, person);
			}
		}
	}

	process(options: FitogetherBuildParsersOptions): FitogetherCsvProcessResult {
		const { entries, unmatched, headers, headerMap } = this.collectEntries();
		const fallbackBirthday = options.fallbackBirthday ?? '0000-00-00';

		const parsers = entries.map((entry) => {
			const resolvedBirthday =
				entry.resolvedBirthday && entry.resolvedBirthday !== '0000-00-00'
					? entry.resolvedBirthday
					: fallbackBirthday;
			return new PlayerGpsSession(
				{
					type: 'TRAINING',
					date: DateTime.fromFormat(entry.values['Date'] as string, 'yyyy/M/d').toFormat(
						'yyyy-MM-dd',
					),
					startTime: DateTime.fromFormat(entry.values['Start Time'] as string, 'yyyy/M/d H:mm', {
						zone: 'Asia/Tokyo',
					}).toJSDate(),
					endTime: DateTime.fromFormat(entry.values['End Time'] as string, 'yyyy/M/d H:mm', {
						zone: 'Asia/Tokyo',
					}).toJSDate(),

					fullName: entry.resolvedFullName,
					birthday: resolvedBirthday,

					durationMin: Number(entry.values['Duration (min)']),
					totalDistanceM: Number(entry.values['Total Distance (m)']),
					totalDistanceMPerMin: Number(entry.values['Total Distance/min (m/min)']),
					maxSpeedKMH: Number(entry.values['Max Speed (km/h)']),

					noOfHSR: Number(entry.values['No. of HSR (times)']),
					hsrDistanceM: Number(entry.values['HSR Distance (m)']),

					sprintCount: Number(entry.values['No. of Sprint (times)']),
					sprintDistanceM: Number(entry.values['Sprint Distance (m)']),
					speedZone1DistanceM: Number(entry.values['Speed Zone 1 Distance (m)']),
					speedZone3DistanceM: Number(entry.values['Speed Zone 3 Distance (m)']),
					speedZone4DistanceM: Number(entry.values['Speed Zone 4 Distance (m)']),
					speedZone5DistanceM: Number(entry.values['Speed Zone 5 Distance (m)']),
					speedZone6DistanceM: Number(entry.values['Speed Zone 6 Distance (m)']),
					speedZone7DistanceM: Number(entry.values['Speed Zone 7 Distance (m)']),
					speedZone8DistanceM: Number(entry.values['Speed Zone 8 Distance (m)']),
					speedZone9DistanceM: Number(entry.values['Speed Zone 9 Distance (m)']),

					accelerationZone4EntryCount: Number(
						entry.values['Acceleration Zone 4 Entry Count (times)'],
					),
					accelerationZone5EntryCount: Number(
						entry.values['Acceleration Zone 5 Entry Count (times)'],
					),
					accelerationZone6EntryCount: Number(
						entry.values['Acceleration Zone 6 Entry Count (times)'],
					),

					decelerationZone4EntryCount: Number(
						entry.values['Deceleration Zone 4 Entry Count (times)'],
					),
					decelerationZone5EntryCount: Number(
						entry.values['Deceleration Zone 5 Entry Count (times)'],
					),
					decelerationZone6EntryCount: Number(
						entry.values['Deceleration Zone 6 Entry Count (times)'],
					),

					expAccCount: Number(entry.values['No. of Exp. Acc. (times)']),
					expDecCount: Number(entry.values['No. of Exp. Dec. (times)']),
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

	private collectEntries(): CollectEntriesResult {
		const { rawRecords, originalHeaders, fieldToMetricId, useMetricIds } = this.options;
		const headers: string[] = [];
		const headerSet = new Set<string>();
		const headerMap = originalHeaders
			.map((field) => ({
				field,
				metricDefinitionId: fieldToMetricId?.[field] ?? '',
			}))
			.filter((item) => item.metricDefinitionId);

		const entries: FitogetherCsvProcessedEntry[] = [];
		const unmatched: UnmatchedPerson[] = [];

		rawRecords.forEach((row, rowIndex) => {
			const values: Record<string, string | number> = {};
			for (const [field, value] of Object.entries(row)) {
				const key = useMetricIds && fieldToMetricId?.[field] ? fieldToMetricId[field]! : field;
				values[key] = coerce(value);
				if (!headerSet.has(key)) {
					headerSet.add(key);
					headers.push(key);
				}
			}

			const fullNameValue = values[PLAYER_NAME_FIELD];
			const fullName = typeof fullNameValue === 'string' ? fullNameValue : '';
			if (fullName === 'Team Average') return;

			const jerseyValue = values[JERSEY_NO_FIELD];
			const jerseyNo =
				typeof jerseyValue === 'string'
					? jerseyValue.trim()
					: typeof jerseyValue === 'number'
						? String(jerseyValue)
						: '';
			const jerseyKey = normalizeIdentifier(jerseyNo);

			let matchedPerson = jerseyKey ? this.personsByExternalId.get(jerseyKey) : undefined;
			if (!matchedPerson) {
				const nameKey = normalizeName(fullName);
				if (nameKey) matchedPerson = this.personsByFullName.get(nameKey);
			}

			if (!matchedPerson) {
				unmatched.push({
					row: rowIndex + 2,
					playerName: fullName || '(missing)',
					jerseyNo: jerseyNo || '(missing)',
				});
				return;
			}

			const nameKey = normalizeName(fullName);
			const dedupeKey =
				(matchedPerson.id && `person:${matchedPerson.id}`) ||
				(jerseyKey && `jersey:${jerseyKey}`) ||
				(nameKey && `name:${nameKey}`);
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
				jerseyNo,
				matchedPerson,
				resolvedFullName,
				resolvedBirthday,
			});
		});

		return {
			entries,
			unmatched,
			headers,
			headerMap,
		};
	}
}

export function buildUnmatchedPersonsResponse(unmatched: UnmatchedPerson[]) {
	if (unmatched.length === 0) return null;

	const messageLines = [
		`以下の${unmatched.length}名を既存の選手情報と照合できませんでした。`,
		'Persons データベースの externalId を Fitogether の背番号と一致するように更新してください。',
	];
	return json(
		{
			code: 'UNMATCHED_PERSONS',
			message: messageLines.join('\n'),
			details: unmatched.map((item) => ({
				row: item.row,
				playerName: item.playerName,
				jerseyNo: item.jerseyNo,
				description: `行${item.row}：${PLAYER_NAME_FIELD}「${item.playerName}」 ${JERSEY_NO_FIELD}「${item.jerseyNo}」`,
			})),
		},
		{ status: 400 },
	);
}
