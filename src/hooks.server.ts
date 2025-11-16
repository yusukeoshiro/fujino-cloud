import { error, type Handle } from '@sveltejs/kit';
import { adminAuth } from '$lib/admin-firebase'; // your Firebase Admin init
import { memberService } from './lib/services/member.service';
import { deviceTokenService } from './lib/services/device-token.service';
import { deviceTokenAccessor } from '$lib/accessors/device-token.accessor';

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

	deviceTokenAccessor.set(null);

	const ensureOrgAccess = (orgId: string) => {
		const user = event.locals.user;
		if (!user) {
			throw error(401, 'Unauthorized');
		}
		const hasAccess = user.members?.some((m) => m.orgId === orgId);
		if (!hasAccess) {
			throw error(403, 'Forbidden: you do not have access to this organization');
		}
	};

	const pathOrgId = event.params?.oid ?? null;
	const queryOrgId = event.url.searchParams.get('orgId');
	let resolvedOrgId: string | null = null;

	if (pathOrgId) {
		ensureOrgAccess(pathOrgId);
		resolvedOrgId = pathOrgId;
	} else if (queryOrgId) {
		ensureOrgAccess(queryOrgId);
		resolvedOrgId = queryOrgId;
	}

	if (resolvedOrgId) {
		const doc = await deviceTokenService.get(resolvedOrgId);
		deviceTokenAccessor.set(doc?.token ?? null);
	}

	// (Optional) gate server-rendered/private routes
	// Example: protect everything under "/_/" except "/login"
	if (event.url.pathname.startsWith('/_/') && !event.locals.user) {
		console.log(`user is not logged in! redirecting user!`);
		return Response.redirect(new URL('/login', event.url), 303);
	}

	return resolve(event);
};
