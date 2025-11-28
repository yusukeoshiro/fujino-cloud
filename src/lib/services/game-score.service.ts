import { adminDb } from '../admin-firebase';

export type GameScoreValueEntry = {
	metricDefinitionId: string;
	value: number;
};

export type GameScoreDocument = {
	orgId: string;
	values: GameScoreValueEntry[];
};

class GameScoreService {
	private collection = adminDb.collection('gameScores');

	async getByOrgId(orgId: string): Promise<GameScoreDocument | null> {
		const snapshot = await this.collection.doc(orgId).get();
		if (!snapshot.exists) {
			return null;
		}

		return snapshot.data() as GameScoreDocument;
	}

	async upsert(orgId: string, values: GameScoreValueEntry[]): Promise<GameScoreDocument> {
		await this.collection.doc(orgId).set(
			{
				orgId,
				values,
			},
			{ merge: true },
		);

		return {
			orgId,
			values,
		};
	}
}

export const gameScoreService = new GameScoreService();
