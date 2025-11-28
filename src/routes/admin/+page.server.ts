import type { Actions, PageServerLoad } from './$types';
import { organizationService } from '$lib/services/organization.service';
import { fail } from '@sveltejs/kit';
import { adminAuth } from '$lib/admin-firebase';
import { memberService } from '$lib/services/member.service';

export const load: PageServerLoad = async () => {
	const orgs = await organizationService.list();
	return {
		orgs,
	};
};

export const actions: Actions = {
	createOrg: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name') as string;
		const id = data.get('id') as string;

		if (!name || !id) {
			return fail(400, { missing: true });
		}

		try {
			await organizationService.create({ id, name });
		} catch (e: unknown) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			if ((e as any).status === 409) {
				return fail(409, { error: 'Organization already exists' });
			}
			console.error('Error creating org:', e);
			return fail(500, { error: 'Failed to create organization' });
		}
		return { success: true };
	},

	deleteOrg: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id') as string;

		if (!id) {
			return fail(400, { missing: true });
		}

		await organizationService.delete(id);
		return { success: true };
	},

	updateOrgName: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id') as string;
		const name = data.get('name') as string;

		if (!id || !name) {
			return fail(400, { missing: true });
		}

		await organizationService.updateName(id, name);
		return { success: true };
	},

	addUserToOrg: async ({ request }) => {
		const data = await request.formData();
		const email = data.get('email') as string;
		const orgId = data.get('orgId') as string;

		if (!email || !orgId) {
			return fail(400, { missing: true });
		}

		let userRecord;
		try {
			userRecord = await adminAuth.getUserByEmail(email);
		} catch (e: unknown) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			if ((e as any).code === 'auth/user-not-found') {
				// Create user
				try {
					userRecord = await adminAuth.createUser({
						email: email,
						emailVerified: false,
						disabled: false,
					});
				} catch (createError) {
					console.error('Error creating user:', createError);
					return fail(500, { error: 'Failed to create user' });
				}
			} else {
				console.error('Error fetching user:', e);
				return fail(500, { error: 'Failed to fetch user' });
			}
		}

		if (!userRecord) {
			return fail(500, { error: 'Could not find or create user' });
		}

		try {
			const organization = await organizationService.getById(orgId);
			await memberService.create({
				orgId,
				userId: userRecord.uid,
				name: organization.name,
			});
		} catch (e: unknown) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			if ((e as any).status === 409) {
				return fail(409, { error: 'User already in org' });
			}
			console.error('Error adding member:', e);
			return fail(500, { error: 'Failed to add member to org' });
		}

		return { success: true };
	},
};
