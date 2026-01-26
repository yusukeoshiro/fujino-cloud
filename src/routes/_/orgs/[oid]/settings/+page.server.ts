import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { contentsProviderApiTokenService } from '$lib/services/contents-provider-api-token.service';
import { memberService } from '$lib/services/member.service';
import { organizationService } from '$lib/services/organization.service';
import { adminAuth } from '$lib/admin-firebase';
import type { UserRecord } from 'firebase-admin/auth';
import type { MemberDto } from '$lib/services/member.dto';
import { CSV_VENDOR_FORMATS, type CsvVendorFormat } from '$lib/csv-processors/vendor-formats';

type EnrichedMember = MemberDto & { email: string | null; photoURL: string | null };
type FirebaseError = { code?: string; message?: string };

const isUserNotFoundError = (error: unknown) =>
	typeof error === 'object' &&
	error !== null &&
	'code' in error &&
	(error as FirebaseError).code === 'auth/user-not-found';

const errorMessage = (error: unknown) =>
	error instanceof Error
		? error.message
		: typeof error === 'object' && error !== null && 'message' in error
			? String((error as FirebaseError).message)
			: 'unknown error';

export const load: PageServerLoad = async ({ params, parent, locals }) => {
	const parentData = await parent();
	const orgId = params.oid;

	if (!orgId) {
		return {
			...parentData,
			contentsProviderApiToken: {
				hasToken: false,
				lastFour: null,
				updatedAt: null,
			},
			organization: null,
			members: [],
		};
	}

	const [tokenDoc, members, organization] = await Promise.all([
		contentsProviderApiTokenService.get(orgId),
		memberService.listByOrgId(orgId),
		organizationService.getById(orgId),
	]);

	// Enrich members with email using batch fetch
	let enrichedMembers: EnrichedMember[] = members.map((member: MemberDto) => ({
		...member,
		email: null,
		photoURL: null,
	}));
	if (members.length > 0) {
		const uids = members.map((m) => m.userId);
		try {
			const usersResult = await adminAuth.getUsers(uids.map((uid) => ({ uid })));
			const userMap = new Map<string, UserRecord>(
				usersResult.users.map((u: UserRecord) => [u.uid, u]),
			);

			enrichedMembers = enrichedMembers.map((member) => {
				const userRecord = userMap.get(member.userId);
				return {
					...member,
					email: userRecord?.email ?? member.email,
					photoURL: userRecord?.photoURL ?? member.photoURL,
				};
			});
		} catch (e) {
			console.error('Failed to batch fetch users', e);
			// Fallback to existing values which are already initialized
		}
	}

	return {
		...parentData,
		contentsProviderApiToken: {
			hasToken: Boolean(tokenDoc),
			lastFour: tokenDoc?.lastFour ?? null,
			updatedAt: tokenDoc?.updatedAt ?? null,
		},
		organization,
		user: locals.user,
		members: enrichedMembers,
	};
};

export const actions: Actions = {
	invite: async ({ request, params, locals }) => {
		const orgId = params.oid;
		if (!orgId) throw error(400, 'Organization ID is missing');

		// Authorization check
		if (!locals.user || !locals.user.members?.some((m) => m.orgId === orgId)) {
			throw error(403, 'Forbidden');
		}

		const data = await request.formData();
		const email = data.get('email') as string;

		if (!email) {
			return fail(400, { email, missing: true });
		}

		try {
			let userRecord: UserRecord | null = null;
			try {
				userRecord = await adminAuth.getUserByEmail(email);
			} catch (e) {
				if (isUserNotFoundError(e)) {
					try {
						userRecord = await adminAuth.createUser({
							email,
							emailVerified: false,
							disabled: false,
						});
					} catch (createError) {
						console.error('Failed to create user for invitation', createError);
						return fail(500, { email, error: 'ユーザーの作成に失敗しました。' });
					}
				} else {
					console.error('Failed to fetch user by email', e);
					return fail(500, { email, error: 'ユーザーの取得に失敗しました。' });
				}
			}
			if (!userRecord) {
				console.error('User record was not retrieved or created');
				return fail(500, { email, error: 'ユーザー情報の取得に失敗しました。' });
			}

			// Check for duplicate membership
			// We can check the current members of the org or check the user's memberships
			const existingMembers = await memberService.listByOrgId(orgId);
			const isAlreadyMember = existingMembers.some((m) => m.userId === userRecord.uid);

			if (isAlreadyMember) {
				return fail(409, { email, alreadyExists: true });
			}

			await memberService.create({
				orgId,
				userId: userRecord.uid,
				name: userRecord.displayName || email.split('@')[0],
			});
			return { success: true };
		} catch (e) {
			if (isUserNotFoundError(e)) {
				return fail(400, { email, notFound: true });
			}
			console.error('Invite failed', e);
			return fail(500, { email, error: errorMessage(e) });
		}
	},

	delete: async ({ request, params, locals }) => {
		const orgId = params.oid;
		if (!orgId) throw error(400, 'Organization ID is missing');

		// Authorization check
		if (!locals.user || !locals.user.members?.some((m) => m.orgId === orgId)) {
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
	},

	updateGpsConfig: async ({ request, params, locals }) => {
		const orgId = params.oid;
		if (!orgId) throw error(400, 'Organization ID is missing');

		if (!locals.user || !locals.user.members?.some((m) => m.orgId === orgId)) {
			throw error(403, 'Forbidden');
		}

		const data = await request.formData();
		const rawFormat = data.get('defaultCsvVendorFormat');
		let defaultCsvVendorFormat: CsvVendorFormat | null = null;

		if (typeof rawFormat === 'string' && rawFormat.trim().length > 0) {
			if (!CSV_VENDOR_FORMATS.includes(rawFormat as CsvVendorFormat)) {
				return fail(400, { gpsInvalidFormat: true });
			}
			defaultCsvVendorFormat = rawFormat as CsvVendorFormat;
		}

		try {
			await organizationService.updateDefaultCsvVendorFormat(orgId, defaultCsvVendorFormat);
		} catch (e) {
			console.error('Failed to update GPS config', e);
			return fail(500, { gpsError: true });
		}

		return { gpsConfigSaved: true, defaultCsvVendorFormat };
	},
};
