import {
	GAME_SCORE_COLUMNS,
	createEmptyValues,
	type GameScoreColumn,
	type GameScoreValues
} from './columns';

const memoryStore = new Map<string, GameScoreValues>();

export const getGameScoreValues = (orgId: string): GameScoreValues => {
	if (!memoryStore.has(orgId)) {
		memoryStore.set(orgId, seedValues());
	}

	return cloneValues(memoryStore.get(orgId)!);
};

export const saveGameScoreValues = (orgId: string, values: GameScoreValues): GameScoreValues => {
	const sanitized = sanitizeIncomingValues(values);
	memoryStore.set(orgId, sanitized);
	return cloneValues(sanitized);
};

const seedValues = (): GameScoreValues => {
	const seeded = createEmptyValues();

	GAME_SCORE_COLUMNS.forEach((column, index) => {
		seeded[column.key] = buildSeedValue(column, index);
	});

	return seeded;
};

const buildSeedValue = (column: GameScoreColumn, index: number) => {
	const normalizedIndex = index + 1;

	if (column.label.includes('割合')) {
		const value = 0.1 + normalizedIndex * 0.02;
		return Math.min(value, 0.95).toFixed(2);
	}

	if (column.label.includes('距離')) {
		return (1500 + normalizedIndex * 120).toString();
	}

	if (column.label.includes('速度')) {
		return (25 + normalizedIndex * 0.8).toFixed(1);
	}

	if (column.label.includes('回数')) {
		return (10 + normalizedIndex).toString();
	}

	if (column.label.includes('時間') || column.label.includes('分')) {
		return (60 + normalizedIndex * 2).toString();
	}

	return (40 + normalizedIndex * 3).toString();
};

const sanitizeIncomingValues = (values: GameScoreValues): GameScoreValues => {
	const sanitized: GameScoreValues = createEmptyValues();

	for (const column of GAME_SCORE_COLUMNS) {
		const rawValue = values[column.key];
		if (rawValue === undefined || rawValue === null) {
			sanitized[column.key] = '';
			continue;
		}

		sanitized[column.key] =
			typeof rawValue === 'string'
				? rawValue.replace(/\u00a0/g, ' ').trim()
				: String(rawValue).trim();
	}

	return sanitized;
};

const cloneValues = (values: GameScoreValues): GameScoreValues => ({ ...values });
