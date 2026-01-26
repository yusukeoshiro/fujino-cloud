import type { PageServerLoad } from './$types';
import { organizationService } from '$lib/services/organization.service';

export const load: PageServerLoad = async ({ params }) => {
	const orgId = params.oid;

	if (!orgId) {
		return {
			defaultCsvVendorFormat: null,
		};
	}

	const organization = await organizationService.getById(orgId);

	return {
		defaultCsvVendorFormat: organization.defaultCsvVendorFormat ?? null,
	};
};
