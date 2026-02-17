import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { adminAuth } from '$lib/admin-firebase';
import { memberService } from '$lib/services/member.service';
import { env } from '$env/dynamic/private';

// Disable CSRF protection for this endpoint as it receives cross-site POSTs
export const config = {
	csrf: false,
};

// Initialize JWKS client
// Using the URL provided by the user: https://api.dev.mobili-platform.com/.well-known/jwks.json
const client = jwksClient({
	jwksUri: env.CANVAS_JWKS_URI || 'https://api.dev.mobili-platform.com/.well-known/jwks.json',
	requestHeaders: {},
	timeout: 30000,
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
	const kid = header.kid;
	if (kid) {
		client.getSigningKey(kid, (err, key) => {
			if (err) {
				console.warn('Failed to get signing key by kid, trying fallback to all keys', err);
				fallbackToFirstKey(callback);
			} else {
				const signingKey = key?.getPublicKey();
				callback(null, signingKey);
			}
		});
	} else {
		fallbackToFirstKey(callback);
	}
}

function fallbackToFirstKey(callback: jwt.SigningKeyCallback) {
	client
		.getSigningKeys()
		.then((keys) => {
			if (!keys || keys.length === 0) {
				callback(new Error('No keys found in JWKS'));
				return;
			}
			// Use the first key as fallback
			callback(null, keys[0].getPublicKey());
		})
		.catch((err) => {
			callback(err);
		});
}

function verifyToken(token: string): Promise<jwt.JwtPayload> {
	return new Promise((resolve, reject) => {
		jwt.verify(
			token,
			getKey,
			{
				algorithms: ['RS256'],
				// Verify audience and issuer if provided in env, else use defaults from user sample or specific checks
				audience: env.CANVAS_AUDIENCE || 'https://api.dev.mobili-platform.com',
				issuer: env.CANVAS_ISSUER || 'https://api.dev.mobili-platform.com',
			},
			(err, decoded) => {
				if (err) {
					reject(err);
				} else {
					resolve(decoded as jwt.JwtPayload);
				}
			},
		);
	});
}

export const POST: RequestHandler = async ({ request, url }) => {
	try {
		// handle both json and form-urlencoded
		let body;
		const contentType = request.headers.get('content-type');
		if (contentType?.includes('application/json')) {
			body = await request.json();
		} else if (contentType?.includes('application/x-www-form-urlencoded')) {
			const formData = await request.formData();
			body = Object.fromEntries(formData);
		} else {
			return json({ error: 'Unsupported content type' }, { status: 400 });
		}

		// eslint-disable-next-line prefer-const
		let { signed_request, token, requested_path } = body;

		// Accept token as alias for signed_request
		signed_request = signed_request || token;

		if (!signed_request) {
			return json({ error: 'Missing signed_request or token' }, { status: 400 });
		}

		// 1. Verify JWT
		const decoded = await verifyToken(signed_request);
		console.log('User verified via Canvas SSO:', decoded.sub, decoded.email);

		// 2. Identify/Create User in Firebase
		// The JWT token ideally contains an email. If not, we might need another way to map users.
		// User said: "try to identify the user by the email."
		// So we blindly trust `decoded.email`.
		const email = decoded.email;
		const uid = decoded.sub; // Use the 'sub' from Canvas as the primary ID or fallback?
		// User said: "try to identify the user by the email."
		// "If it doesn't, we will automatically create that user in the Firebase Admin API"

		if (!email) {
			return json({ error: 'Email not found in the signed request' }, { status: 400 });
		}

		let firebaseUser;
		try {
			firebaseUser = await adminAuth.getUserByEmail(email);
		} catch (e: any) {
			if (e.code === 'auth/user-not-found') {
				// Create user
				// We can use the 'sub' as uid or let Firebase generate one.
				// Canvas 'sub' might be consistent, so using it as UID is good IF it doesn't conflict with existing uids format.
				// However, if we want to merge with existing accounts by email, we should let Firebase handle it or use email as key.
				// The requirement "identify the user by the email" suggests email is the key.
				// If we create a new user, we should probably set the email.
				try {
					firebaseUser = await adminAuth.createUser({
						email: email,
						emailVerified: true, // Trusted provider
						displayName: decoded.name || email.split('@')[0],
						// We can store the Canvas ID in custom claims or provider data if needed
					});
					console.log('Created new Firebase user:', firebaseUser.uid);
				} catch (createError) {
					console.error('Error creating user:', createError);
					return json({ error: 'Failed to create user' }, { status: 500 });
				}
			} else {
				console.error('Error fetching user:', e);
				return json({ error: 'Error fetching user' }, { status: 500 });
			}
		}

		// 3. Add User to Org Members (if org_id is present)
		const orgId = decoded.org_id;
		if (orgId) {
			try {
				// Check if user is already a member
				const existingMembers = await memberService.listByUserId(firebaseUser.uid);
				const isMember = existingMembers.some((m) => m.orgId === orgId);

				if (!isMember) {
					// Add user to org members
					await memberService.create({
						orgId: orgId,
						userId: firebaseUser.uid,
						name: firebaseUser.displayName || firebaseUser.email || 'Unknown User',
					});
					console.log(`Added user ${firebaseUser.uid} to org ${orgId}`);
				} else {
					console.log(`User ${firebaseUser.uid} already member of org ${orgId}`);
				}
			} catch (e: any) {
				// If error is 409 (already exists), that's fine - ignore it
				if (e.status !== 409) {
					console.error('Error adding user to org:', e);
					// Don't fail the authentication, just log the error
				}
			}
		}

		// 4. Generate Custom Token
		// We can embed additional claims if needed, e.g. org_id
		const additionalClaims = orgId ? { orgId } : {};
		const customToken = await adminAuth.createCustomToken(firebaseUser.uid, additionalClaims);

		// 5. Redirect to Launchpad
		const targetUrl = requested_path || '/'; // Fallback to root
		const launchpadUrl = new URL('/launchpad', url.origin);
		launchpadUrl.searchParams.set('token', customToken);
		launchpadUrl.searchParams.set('targetUrl', targetUrl);

		// Using 303 for redirect after POST
		return new Response(null, {
			status: 303,
			headers: {
				Location: launchpadUrl.toString(),
			},
		});
	} catch (err: any) {
		console.error('Canvas SSO Error:', err);
		return json({ error: err.message || 'Authentication failed' }, { status: 401 });
	}
};
