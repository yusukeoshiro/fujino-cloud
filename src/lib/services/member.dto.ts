export class MemberDto {
	id: string;
	orgId: string;
	userId: string;
	name: string;
}

export class CreateMemberDto {
	orgId: string;
	userId: string;
	name: string;
}
