import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import jwt from 'jsonwebtoken';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = (event) => {
	const oid = event.params?.oid;

	// --- AuthZ: must be logged in and belong to org {oid}
	if (!oid) throw error(400, 'Bad Request: missing org id');
	const user = event.locals.user;
	if (!user) throw error(401, 'Unauthorized');

	const hasAccess = !!user.members?.some((m) => m.orgId === oid);
	if (!hasAccess) {
		throw error(403, 'Forbidden: you do not have access to this organization');
	}

	// --- Sanitize/whitelist the date token from query (?date=past30days~ ...)
	const allowedDateTokens = new Set(['past30days~', 'past90days~', 'past180days~', 'past365days~']);
	const rawDate = event.url.searchParams.get('date')?.trim() ?? '';
	const normalizedDate = rawDate.toLowerCase();
	const safeDate = allowedDateTokens.has(normalizedDate) ? normalizedDate : 'past30days~';

	const METABASE_SITE_URL = env.METABASE_SITE_URL;
	const METABASE_SECRET_KEY = env.METABASE_EMBED_SECRET;

	if (!METABASE_SITE_URL) {
		throw error(500, 'Metabase site URL is not configured');
	}
	if (!METABASE_SECRET_KEY) {
		throw error(500, 'Metabase embed secret is not configured');
	}

	// --- Build a minimal, safe payload. Do not pass through arbitrary params.
	const payload = {
		resource: { dashboard: 2 }, // your dashboard id
		params: {
			date: safeDate, // sanitized date token
			orgid: [oid], // constrain to the org from the route (already authZ-checked)
		},
		exp: Math.round(Date.now() / 1000) + 10 * 60, // 10 minutes
	} as const;

	const token = jwt.sign(payload, METABASE_SECRET_KEY); // HS256 default

	const iframeUrl = `${METABASE_SITE_URL}/embed/dashboard/${token}#bordered=true&titled=true`;

	return { iframeUrl };
};
