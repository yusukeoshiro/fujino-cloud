import type { Handle } from '@sveltejs/kit';
import { adminAuth } from '$lib/admin-firebase'; // your Firebase Admin init
import { memberService } from './lib/services/member.service';

export const handle: Handle = async ({ event, resolve }) => {
	const cookie = event.cookies.get('fb.session');

	if (cookie) {
		try {
			// Verify the Firebase **session cookie** (not ID token)
			const decoded = await adminAuth.verifySessionCookie(cookie, /* checkRevoked */ true);
			const members = await memberService.listByUserId(decoded.uid);

			const user = {
				uid: decoded.uid,
				email: decoded.email ?? null,
				name: decoded.name ?? null,
				picture: decoded.picture ?? null,
				members,
			};

			// Normalize what you put in locals (keep it small & serializable)

			event.locals.user = user;
		} catch (err) {
			console.log(err);
			// Invalid/expired cookie → clear user
			event.locals.user = null;
		}
	} else {
		event.locals.user = null;
	}

	// (Optional) gate server-rendered/private routes
	// Example: protect everything under "/_/" except "/login"
	if (event.url.pathname.startsWith('/_/') && !event.locals.user) {
		console.log(`user is not logged in! redirecting user!`);
		return Response.redirect(new URL('/login', event.url), 303);
	}

	return resolve(event);
};
