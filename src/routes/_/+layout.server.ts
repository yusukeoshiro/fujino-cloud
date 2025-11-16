import type { MemberDto } from '$lib/services/member.dto';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const members: MemberDto[] = locals.user?.members || [];

	return {
		members,
	};
};
