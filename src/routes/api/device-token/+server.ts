import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deviceTokenService } from '$lib/services/device-token.service';

export const GET: RequestHandler = async ({ url, locals }) => {
	const orgId = url.searchParams.get('orgId');

	if (!orgId) {
		return json({ message: 'orgId is required' }, { status: 400 });
	}

	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');
	const hasAccess = user.members?.some((m) => m.orgId === orgId);
	if (!hasAccess) throw error(403, 'Forbidden: you do not have access to this organization');

	const doc = await deviceTokenService.get(orgId);

	return json({
		orgId,
		hasToken: Boolean(doc?.token),
		updatedAt: doc?.updatedAt ?? null
	});
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const body = await request.json();
	const orgId = body?.orgId;
	const token = body?.token;

	if (!orgId || typeof orgId !== 'string') {
		return json({ message: 'orgId is required' }, { status: 400 });
	}

	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');
	const hasAccess = user.members?.some((m) => m.orgId === orgId);
	if (!hasAccess) throw error(403, 'Forbidden: you do not have access to this organization');

	if (!token || typeof token !== 'string' || !token.trim()) {
		return json({ message: 'token is required' }, { status: 400 });
	}

	const payload = await deviceTokenService.set(orgId, token.trim());

	return json(
		{
			success: true,
			orgId,
			updatedAt: payload.updatedAt,
			message: 'デバイストークンを保存しました。'
		},
		{ status: 200 }
	);
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	const body = await request.json();
	const orgId = body?.orgId;

	if (!orgId || typeof orgId !== 'string') {
		return json({ message: 'orgId is required' }, { status: 400 });
	}

	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');
	const hasAccess = user.members?.some((m) => m.orgId === orgId);
	if (!hasAccess) throw error(403, 'Forbidden: you do not have access to this organization');

	await deviceTokenService.delete(orgId);

	return json(
		{
			success: true,
			orgId,
			updatedAt: null,
			message: 'デバイストークンを削除しました。'
		},
		{ status: 200 }
	);
};
