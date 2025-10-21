import type { MemberDto } from '$lib/services/member.dto';
import type { PageServerLoad, RequestEvent } from './$types';

export const load: PageServerLoad = async (event: RequestEvent) => {
	const members: MemberDto[] = event.locals.user?.members || [];

	return {
		members,
	};
};
