import { error } from '@sveltejs/kit';
import type { RequestEvent } from '../$types';

export function requireOrgAccess(event: RequestEvent) {
	const { locals, params } = event;
	const orgId = params.oid;
	if (!orgId) {
		throw error(400, 'orgId is required');
	}

	const user = locals.user;
	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const hasAccess = user.members?.some((m) => m.orgId === orgId);
	if (!hasAccess) {
		throw error(403, 'Forbidden: you do not have access to this organization');
	}

	return orgId;
}
