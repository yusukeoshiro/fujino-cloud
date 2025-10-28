import { error } from '@sveltejs/kit';

export function requireOrgAccess(orgId: string | undefined, user: App.Locals['user']) {
	if (!orgId) {
		throw error(400, 'orgId is required');
	}

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const hasAccess = user.members?.some((m) => m.orgId === orgId);
	if (!hasAccess) {
		throw error(403, 'Forbidden: you do not have access to this organization');
	}

	return orgId;
}
