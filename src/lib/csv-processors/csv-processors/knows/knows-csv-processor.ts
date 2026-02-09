import { json } from '@sveltejs/kit';
import { PlayerGpsSession } from '$lib/csv-processors/player-gps-session/player-gps-session';
import { coerce } from '$lib/csv-processors/csv-processors/fitogether/fitogether-csv-processor';

export const KNOWS_NAME_FIELD = 'Name';
export const KNOWS_USER_ID_FIELD = 'User_ID';

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
	rowIndices: number[];
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
	rows: number[];
	playerName: string;
	userId?: string;
}

const normalizeName = (value: string | null | undefined) =>
	value ? value.replace(/\s+/g, '').trim().toLowerCase() : '';

const normalizeUserId = (value: string | number | null | undefined) => {
	if (value === null || value === undefined) return '';
	const raw = typeof value === 'number' ? String(value) : value.trim();
	if (!raw) return '';
	const trimmed = raw.replace(/^0+/, '').replace(/0+$/, '');
	return trimmed || '0';
};

const parseDurationToSeconds = (raw: string | number): number => {
	const text = String(raw ?? '').trim();
	if (!text) return NaN;
	const parts = text.split(':').map((part) => Number(part));
	if (parts.some((part) => !Number.isFinite(part))) return NaN;
	let seconds = 0;
	if (parts.length === 3) {
		seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
	} else if (parts.length === 2) {
		seconds = parts[0] * 60 + parts[1];
	} else if (parts.length === 1) {
		seconds = parts[0] * 60;
	} else {
		return NaN;
	}
	return seconds;
};

const hasField = (entry: KnowsCsvProcessedEntry, field: string) =>
	Object.prototype.hasOwnProperty.call(entry.values, field);

const readNumber = (entry: KnowsCsvProcessedEntry, field: string): number | null => {
	if (!hasField(entry, field)) return null;
	const raw = entry.values[field];
	if (raw === '' || raw === null || raw === undefined) return null;
	const value = Number(raw);
	return Number.isFinite(value) ? value : null;
};

const readDuration = (entry: KnowsCsvProcessedEntry, field: string): number | null => {
	if (!hasField(entry, field)) return null;
	const raw = entry.values[field];
	if (raw === '' || raw === null || raw === undefined) return null;
	const value = parseDurationToSeconds(raw);
	return Number.isFinite(value) ? Math.floor(value / 60) : null;
};

const sumIfAllPresent = (values: Array<number | null>): number | null => {
	if (values.some((value) => value === null || !Number.isFinite(value))) return null;
	let total = 0;
	for (const value of values) {
		total += value as number;
	}
	return total;
};

export class KnowsCsvProcessor {
	private personsByExternalId = new Map<string, KnowsPersonRecord>();
	private personsByFullName = new Map<string, KnowsPersonRecord>();

	constructor(private readonly options: KnowsCsvProcessorOptions) {
		for (const person of options.persons) {
			const externalId = normalizeUserId(person.externalId as string | number | null);
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
			const resolvedBirthday =
				entry.resolvedBirthday && entry.resolvedBirthday !== '0000-00-00'
					? entry.resolvedBirthday
					: fallbackBirthday;

			const durationMin = readDuration(entry, 'Duration_TF');
			const totalDistanceM = readNumber(entry, 'Distance') ?? NaN;
			const totalDistanceMPerMin =
				durationMin !== null && Number.isFinite(totalDistanceM)
					? durationMin > 0
						? totalDistanceM / durationMin
						: 0
					: null;
			const maxSpeedKMH = readNumber(entry, 'SPD MX');
			const sprintCount = readNumber(entry, 'Sprint');
			const lowIntensityDistanceM = readNumber(entry, 'SPD_D_Z1');
			const highIntensityDistanceM =
				sumIfAllPresent([readNumber(entry, 'SPD_D_Z5'), readNumber(entry, 'SPD_D_Z6')]) ?? NaN;

			const accelerationCountTotal =
				sumIfAllPresent([
					readNumber(entry, 'Accel_Z1'),
					readNumber(entry, 'Accel_Z2'),
					readNumber(entry, 'Accel_Z3'),
				]) ?? NaN;
			const decelerationCountTotal =
				sumIfAllPresent([
					readNumber(entry, 'Decel_Z1'),
					readNumber(entry, 'Decel_Z2'),
					readNumber(entry, 'Decel_Z3'),
				]) ?? NaN;

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

					noOfHSR: null,
					hsrDistanceM: null,

					sprintCount,
					sprintDistanceM: null,
					highIntensityDistanceM,
					lowIntensityDistanceM,
					accelerationCountTotal,
					decelerationCountTotal,

					expAccCount: null,
					expDecCount: null,
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
		const groups = new Map<
			string,
			{
				userId: string;
				rowIndices: number[];
				fullName: string;
				durationSeconds: number | null;
				totalDistanceM: number | null;
				maxSpeedKMH: number | null;
				lowIntensityDistanceM: number | null;
				highIntensityDistanceZ5M: number | null;
				highIntensityDistanceZ6M: number | null;
				sprintCount: number | null;
				accelZ1: number | null;
				accelZ2: number | null;
				accelZ3: number | null;
				decelZ1: number | null;
				decelZ2: number | null;
				decelZ3: number | null;
			}
		>();

		const toNumber = (value: unknown): number | null => {
			if (value === '' || value === null || value === undefined) return null;
			const coerced = typeof value === 'string' ? coerce(value) : value;
			const num = Number(coerced);
			return Number.isFinite(num) ? num : null;
		};

		const addSum = (current: number | null, value: unknown): number | null => {
			const parsed = toNumber(value);
			if (parsed === null) return current;
			return (current ?? 0) + parsed;
		};

		const addMax = (current: number | null, value: unknown): number | null => {
			const parsed = toNumber(value);
			if (parsed === null) return current;
			return current === null ? parsed : Math.max(current, parsed);
		};

		const addDurationSeconds = (current: number | null, value: unknown): number | null => {
			if (value === '' || value === null || value === undefined) return current;
			const parsed = parseDurationToSeconds(value as string | number);
			if (!Number.isFinite(parsed)) return current;
			return (current ?? 0) + parsed;
		};

		rawRecords.forEach((row, rowIndex) => {
			for (const field of Object.keys(row)) {
				if (!headerSet.has(field)) {
					headerSet.add(field);
					headers.push(field);
				}
			}

			const userIdValue = row[KNOWS_USER_ID_FIELD];
			const userId = normalizeUserId(userIdValue ?? '');
			const fullNameValue = row[KNOWS_NAME_FIELD];
			const fullName =
				typeof fullNameValue === 'string'
					? fullNameValue
					: typeof fullNameValue === 'number'
						? String(fullNameValue)
						: '';
			const rowNumber = rowIndex + 2;

			if (!userId) {
				unmatched.push({
					rows: [rowNumber],
					playerName: fullName || '(missing)',
					userId: '',
				});
				return;
			}

			let group = groups.get(userId);
			if (!group) {
				group = {
					userId,
					rowIndices: [],
					fullName: '',
					durationSeconds: null,
					totalDistanceM: null,
					maxSpeedKMH: null,
					lowIntensityDistanceM: null,
					highIntensityDistanceZ5M: null,
					highIntensityDistanceZ6M: null,
					sprintCount: null,
					accelZ1: null,
					accelZ2: null,
					accelZ3: null,
					decelZ1: null,
					decelZ2: null,
					decelZ3: null,
				};
				groups.set(userId, group);
			}

			group.rowIndices.push(rowNumber);
			if (!group.fullName && fullName) {
				group.fullName = fullName;
			}

			group.durationSeconds = addDurationSeconds(group.durationSeconds, row['Duration_TF']);
			group.totalDistanceM = addSum(group.totalDistanceM, row['Distance']);
			group.maxSpeedKMH = addMax(group.maxSpeedKMH, row['SPD MX']);
			group.lowIntensityDistanceM = addSum(group.lowIntensityDistanceM, row['SPD_D_Z1']);
			group.highIntensityDistanceZ5M = addSum(group.highIntensityDistanceZ5M, row['SPD_D_Z5']);
			group.highIntensityDistanceZ6M = addSum(group.highIntensityDistanceZ6M, row['SPD_D_Z6']);
			group.sprintCount = addSum(group.sprintCount, row['Sprint']);
			group.accelZ1 = addSum(group.accelZ1, row['Accel_Z1']);
			group.accelZ2 = addSum(group.accelZ2, row['Accel_Z2']);
			group.accelZ3 = addSum(group.accelZ3, row['Accel_Z3']);
			group.decelZ1 = addSum(group.decelZ1, row['Decel_Z1']);
			group.decelZ2 = addSum(group.decelZ2, row['Decel_Z2']);
			group.decelZ3 = addSum(group.decelZ3, row['Decel_Z3']);
		});

		for (const group of groups.values()) {
			const fullName = group.fullName;
			const nameKey = normalizeName(fullName);
			let matchedPerson = this.personsByExternalId.get(group.userId);
			if (!matchedPerson && nameKey) {
				matchedPerson = this.personsByFullName.get(nameKey);
			}

			if (!matchedPerson) {
				unmatched.push({
					rows: group.rowIndices,
					playerName: fullName || '(missing)',
					userId: group.userId,
				});
				continue;
			}

			const resolvedFullName = matchedPerson.fullName ?? fullName;
			const resolvedBirthday = matchedPerson.birthday ?? '0000-00-00';

			const durationMin =
				group.durationSeconds !== null ? Math.floor(group.durationSeconds / 60) : null;

			const values: Record<string, string | number> = {};
			if (durationMin !== null) values['Duration_TF'] = durationMin;
			if (group.totalDistanceM !== null) values['Distance'] = group.totalDistanceM;
			if (group.maxSpeedKMH !== null) values['SPD MX'] = group.maxSpeedKMH;
			if (group.lowIntensityDistanceM !== null) values['SPD_D_Z1'] = group.lowIntensityDistanceM;
			if (group.highIntensityDistanceZ5M !== null)
				values['SPD_D_Z5'] = group.highIntensityDistanceZ5M;
			if (group.highIntensityDistanceZ6M !== null)
				values['SPD_D_Z6'] = group.highIntensityDistanceZ6M;
			if (group.sprintCount !== null) values['Sprint'] = group.sprintCount;
			if (group.accelZ1 !== null) values['Accel_Z1'] = group.accelZ1;
			if (group.accelZ2 !== null) values['Accel_Z2'] = group.accelZ2;
			if (group.accelZ3 !== null) values['Accel_Z3'] = group.accelZ3;
			if (group.decelZ1 !== null) values['Decel_Z1'] = group.decelZ1;
			if (group.decelZ2 !== null) values['Decel_Z2'] = group.decelZ2;
			if (group.decelZ3 !== null) values['Decel_Z3'] = group.decelZ3;

			entries.push({
				rowIndices: group.rowIndices,
				values,
				fullName,
				matchedPerson,
				resolvedFullName,
				resolvedBirthday,
			});
		}

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

	const missingNameCount = unmatched.filter((item) => item.playerName === '(missing)').length;
	const missingUserIdCount = unmatched.filter((item) => !item.userId).length;
	const messageLines = [
		`以下の${unmatched.length}名を既存の選手情報と照合できませんでした。`,
		'KNOWS_V1 は User_ID 列で照合します（前後の0を除去して一致）。',
		'User_ID が一致しない場合は Name 列を空白除去して照合します。',
		'CSV の User_ID が空欄、または Persons データベースに一致する externalId/氏名がありません。',
	];

	if (missingUserIdCount === unmatched.length) {
		messageLines.push(
			'全行で User_ID が取得できませんでした。CSV の区切り文字やヘッダ名（User_ID）を確認してください。',
		);
	} else if (missingNameCount === unmatched.length) {
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
			details: unmatched.map((item) => {
				const rowLabel = item.rows.join(', ');
				const rowPrefix = item.rows.length > 1 ? 'Rows' : 'Row';
				let description = `${rowPrefix} ${rowLabel}: User_ID "${item.userId ?? ''}" not found in Persons`;
				if (!item.userId) {
					description = `${rowPrefix} ${rowLabel}: User_ID is missing`;
				} else if (item.playerName === '(missing)') {
					description = `${rowPrefix} ${rowLabel}: Name is missing (User_ID "${item.userId}" not found in Persons)`;
				} else {
					description = `${rowPrefix} ${rowLabel}: User_ID "${item.userId}" not found in Persons (also checked Name "${item.playerName}")`;
				}
				return {
					row: item.rows[0],
					rows: item.rows,
					playerName: item.playerName,
					userId: item.userId,
					description,
				};
			}),
		},
		{ status: 422 },
	);
}
