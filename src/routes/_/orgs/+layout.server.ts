import type { LayoutServerLoad } from './$types';
import { deviceTokenService } from '$lib/services/device-token.service';

export const load: LayoutServerLoad = async ({ params }) => {
	const orgId = params.oid;

	if (!orgId) {
		return {
			deviceToken: null,
			deviceTokenUpdatedAt: null,
			orgId: null
		};
	}

	const doc = await deviceTokenService.get(orgId);

	return {
		deviceToken: doc?.token ?? null,
		deviceTokenUpdatedAt: doc?.updatedAt ?? null,
		orgId
	};
};
