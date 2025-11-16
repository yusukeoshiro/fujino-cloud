// src/routes/api/session/+server.ts
import { json } from '@sveltejs/kit';
import { adminAuth } from '$lib/admin-firebase';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const { idToken } = await request.json();

	// 5 days, adjust as needed (max 14d for Firebase session cookies)
	const expiresIn = 5 * 24 * 60 * 60 * 1000;

	const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
	cookies.set('fb.session', sessionCookie, {
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		path: '/',
		maxAge: Math.floor(expiresIn / 1000),
	});

	return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ cookies }) => {
	// Optional: revoke the session server-side
	const cookie = cookies.get('fb.session');
	if (cookie) {
		try {
			const decoded = await adminAuth.verifySessionCookie(cookie, /* checkRevoked */ false);
			// Revoke refresh tokens for this user to invalidate existing sessions
			await adminAuth.revokeRefreshTokens(decoded.sub);
		} catch {
			// ignore verification errors (cookie might be invalid/expired already)
		}
	}

	// Clear the cookie
	cookies.set('fb.session', '', {
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		path: '/',
		maxAge: 0,
	});

	return json({ ok: true });
};
