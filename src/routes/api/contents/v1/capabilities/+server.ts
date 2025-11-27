import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { capabilitiesResponse } from '$lib/contents-provider/content';
import { requireBearer } from '$lib/contents-provider/auth';

export const GET: RequestHandler = async (event) => {
	await requireBearer(event);
	return json(capabilitiesResponse);
};
