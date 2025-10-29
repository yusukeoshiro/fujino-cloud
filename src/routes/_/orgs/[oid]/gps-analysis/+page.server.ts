import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import jwt from 'jsonwebtoken';

export const load: PageServerLoad = (event) => {
	const oid = event.params?.oid;
	if (oid) {
		const user = event.locals.user;
		if (!user) {
			throw error(401, 'Unauthorized');
		}

		const hasAccess = user.members?.some((m) => m.orgId === oid);
		if (!hasAccess) {
			throw error(403, 'Forbidden: you do not have access to this organization');
		}
	}

	const METABASE_SITE_URL = 'https://metabase.oshiro.app';
	const METABASE_SECRET_KEY = 'ef93dd6872823554b5c9e87b389b346eb8c7d381532d6284d6b5b4f691071555';

	const payload = {
		resource: { dashboard: 2 },
		params: {
			date: 'past30days~',
			orgid: [oid],
		},
		exp: Math.round(Date.now() / 1000) + 10 * 60, // 10 minute expiration
	};
	const token = jwt.sign(payload, METABASE_SECRET_KEY);

	const iframeUrl = METABASE_SITE_URL + '/embed/dashboard/' + token + '#bordered=true&titled=true';

	return { iframeUrl };
};
