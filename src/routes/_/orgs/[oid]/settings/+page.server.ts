import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { contentsProviderApiTokenService } from '$lib/services/contents-provider-api-token.service';
import { memberService } from '$lib/services/member.service';
import { adminAuth } from '$lib/admin-firebase';

export const load: PageServerLoad = async ({ params, parent }) => {
	const parentData = await parent();
	const orgId = params.oid;

	if (!orgId) {
		return {
			...parentData,
			contentsProviderApiToken: {
				hasToken: false,
				lastFour: null,
				updatedAt: null
			},
			members: []
		};
	}

	const [tokenDoc, members] = await Promise.all([
		contentsProviderApiTokenService.get(orgId),
		memberService.listByOrgId(orgId)
	]);

	// Enrich members with email using batch fetch
	let enrichedMembers = members;
	if (members.length > 0) {
		const uids = members.map((m) => m.userId);
		try {
			const usersResult = await adminAuth.getUsers(
				uids.map((uid) => ({ uid }))
			);
			const userMap = new Map(usersResult.users.map((u) => [u.uid, u]));

			enrichedMembers = members.map((member) => {
				const userRecord = userMap.get(member.userId);
				return {
					...member,
					email: userRecord?.email ?? null,
					photoURL: userRecord?.photoURL ?? null
				};
			});
		} catch (e) {
			console.error('Failed to batch fetch users', e);
			// Fallback to no enrichment
			enrichedMembers = members.map((member) => ({
				...member,
				email: null,
				photoURL: null
			}));
		}
	}

	return {
		...parentData,
		contentsProviderApiToken: {
			hasToken: Boolean(tokenDoc),
			lastFour: tokenDoc?.lastFour ?? null,
			updatedAt: tokenDoc?.updatedAt ?? null
		},
		members: enrichedMembers
	};
};

export const actions: Actions = {
	invite: async ({ request, params, locals }) => {
		const orgId = params.oid;
		if (!orgId) throw error(400, 'Organization ID is missing');

		// Authorization check
		if (!locals.user || !locals.user.members?.some(m => m.orgId === orgId)) {
			throw error(403, 'Forbidden');
		}

		const data = await request.formData();
		const email = data.get('email') as string;

		if (!email) {
			return fail(400, { email, missing: true });
		}

		try {
			const userRecord = await adminAuth.getUserByEmail(email);

			// Check for duplicate membership
			// We can check the current members of the org or check the user's memberships
			const existingMembers = await memberService.listByOrgId(orgId);
			const isAlreadyMember = existingMembers.some(m => m.userId === userRecord.uid);

			if (isAlreadyMember) {
				return fail(409, { email, alreadyExists: true });
			}

			await memberService.create({
				orgId,
				userId: userRecord.uid,
				name: userRecord.displayName || email.split('@')[0]
			});
			return { success: true };
		} catch (e: any) {
			if (e.code === 'auth/user-not-found') {
				return fail(400, { email, notFound: true });
			}
			console.error('Invite failed', e);
			return fail(500, { email, error: e.message });
		}
	},

	delete: async ({ request, params, locals }) => {
		const orgId = params.oid;
		if (!orgId) throw error(400, 'Organization ID is missing');

		// Authorization check
		if (!locals.user || !locals.user.members?.some(m => m.orgId === orgId)) {
			throw error(403, 'Forbidden');
		}

		const data = await request.formData();
		const memberId = data.get('memberId') as string;

		if (!memberId) {
			return fail(400, { missing: true });
		}

		const member = await memberService.getById(memberId);
		if (!member || member.orgId !== orgId) {
			return fail(404, { notFound: true });
		}

		// Check if user is deleting themselves
		if (locals.user && member.userId === locals.user.uid) {
			return fail(400, { cannotDeleteSelf: true });
		}

		await memberService.delete(memberId);
		return { success: true };
	}
};
