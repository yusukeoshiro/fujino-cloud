import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { WORKLOAD_BENCHMARK_COLUMNS, createEmptyValues, valuesMapFromEntries } from './columns';
import { workloadBenchmarkService } from '$lib/services/workload-benchmark.service';

export const load: PageServerLoad = async ({ params }) => {
	const orgId = params.oid;
	if (!orgId) {
		throw error(400, '組織IDが見つかりません。');
	}

	const existing = await workloadBenchmarkService.getByOrgId(orgId);
	const values = existing ? valuesMapFromEntries(existing.values) : createEmptyValues();

	return {
		columns: WORKLOAD_BENCHMARK_COLUMNS,
		values,
		orgId,
	};
};
