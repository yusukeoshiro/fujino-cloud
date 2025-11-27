import type { PageServerLoad } from './$types';
import { contentsProviderApiTokenService } from '$lib/services/contents-provider-api-token.service';

export const load: PageServerLoad = async ({ params, parent }) => {
	const parentData = await parent();
	const orgId = params.oid;

	if (!orgId) {
		return {
			...parentData,
			contentsProviderApiToken: {
				hasToken: false,
				lastFour: null,
				updatedAt: null
			}
		};
	}

	const doc = await contentsProviderApiTokenService.get(orgId);

	return {
		...parentData,
		contentsProviderApiToken: {
			hasToken: Boolean(doc),
			lastFour: doc?.lastFour ?? null,
			updatedAt: doc?.updatedAt ?? null
		}
	};
};
