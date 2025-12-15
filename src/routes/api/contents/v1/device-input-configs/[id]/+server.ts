import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deviceInputConfigs } from '$lib/contents-provider/content';
import { requireBearer } from '$lib/contents-provider/auth';

export const GET: RequestHandler = async (event) => {
	await requireBearer(event);
	const id = event.params.id;
	const item = deviceInputConfigs.find((config) => config.id === id);
	if (!item) {
		throw error(404, 'Not found');
	}
	return json(item);
};
