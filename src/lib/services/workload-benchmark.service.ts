import { adminDb } from '../admin-firebase';

export type WorkloadBenchmarkValueEntry = {
	metricDefinitionId: string;
	value: number;
};

export type WorkloadBenchmarkDocument = {
	orgId: string;
	values: WorkloadBenchmarkValueEntry[];
};

class WorkloadBenchmarkService {
	private collection = adminDb.collection('gameScores');

	async getByOrgId(orgId: string): Promise<WorkloadBenchmarkDocument | null> {
		const snapshot = await this.collection.doc(orgId).get();
		if (!snapshot.exists) {
			return null;
		}

		return snapshot.data() as WorkloadBenchmarkDocument;
	}

	async upsert(
		orgId: string,
		values: WorkloadBenchmarkValueEntry[],
	): Promise<WorkloadBenchmarkDocument> {
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

export const workloadBenchmarkService = new WorkloadBenchmarkService();
