import { error, type RequestEvent } from '@sveltejs/kit';
import { contentsProviderApiTokenService } from '$lib/services/contents-provider-api-token.service';

export const requireBearer = async (event: RequestEvent) => {
	const header = event.request.headers.get('authorization') ?? '';
	const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
	if (!token) {
		throw error(401, 'Missing bearer token');
	}
	const doc = await contentsProviderApiTokenService.verify(token);
	if (!doc) {
		throw error(401, 'Invalid bearer token');
	}
	return doc;
};

export const errorResponse = (status: number, code: string, message: string) => {
	return {
		status,
		body: {
			error: { code, message },
			meta: {},
		},
	};
};
