import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deviceTokenService } from '$lib/services/device-token.service';

export const GET: RequestHandler = async (event) => {
	const orgId = event.params.oid;
	if (!orgId) {
		throw error(400, 'orgId is required');
	}

	const doc = await deviceTokenService.get(orgId);

	return json({
		orgId,
		hasToken: Boolean(doc?.token),
		updatedAt: doc?.updatedAt ?? null,
	});
};

export const POST: RequestHandler = async (event) => {
	const orgId = event.params.oid;
	if (!orgId) {
		throw error(400, 'orgId is required');
	}

	let body: { token?: string } = {};
	try {
		body = (await event.request.json()) as { token?: string };
	} catch {
		// ignore, will be validated below
	}

	const token = body.token?.trim();
	if (!token) {
		return json({ message: 'token is required' }, { status: 400 });
	}

	const payload = await deviceTokenService.set(orgId, token);

	return json(
		{
			success: true,
			orgId,
			updatedAt: payload.updatedAt,
			message: 'デバイストークンを保存しました。',
		},
		{ status: 200 },
	);
};

export const DELETE: RequestHandler = async (event) => {
	const orgId = event.params.oid;
	if (!orgId) {
		throw error(400, 'orgId is required');
	}

	await deviceTokenService.delete(orgId);

	return json(
		{
			success: true,
			orgId,
			updatedAt: null,
			message: 'デバイストークンを削除しました。',
		},
		{ status: 200 },
	);
};
