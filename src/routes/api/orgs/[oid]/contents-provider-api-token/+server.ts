import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { contentsProviderApiTokenService } from '$lib/services/contents-provider-api-token.service';

const ensureOrgId = (orgId: string | undefined) => {
	if (!orgId) {
		throw error(400, 'orgId is required');
	}
	return orgId;
};

export const GET: RequestHandler = async (event) => {
	const orgId = ensureOrgId(event.params.oid);
	const doc = await contentsProviderApiTokenService.get(orgId);

	return json({
		orgId,
		hasToken: Boolean(doc),
		lastFour: doc?.lastFour ?? null,
		updatedAt: doc?.updatedAt ?? null,
	});
};

export const POST: RequestHandler = async (event) => {
	const orgId = ensureOrgId(event.params.oid);

	const { token, payload } = await contentsProviderApiTokenService.issue(orgId);

	return json(
		{
			success: true,
			orgId,
			token,
			lastFour: payload.lastFour,
			updatedAt: payload.updatedAt,
			message: 'API トークンを発行しました。表示されるのは今回のみです。必ず控えてください。',
		},
		{ status: 200 },
	);
};

export const DELETE: RequestHandler = async (event) => {
	const orgId = ensureOrgId(event.params.oid);

	await contentsProviderApiTokenService.delete(orgId);

	return json(
		{
			success: true,
			orgId,
			lastFour: null,
			updatedAt: null,
			message: 'API トークンを削除しました。',
		},
		{ status: 200 },
	);
};
