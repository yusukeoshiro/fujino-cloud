export interface MemberDto {
	id: string;
	orgId: string;
	userId: string;
	name: string;
}

export interface CreateMemberDto {
	orgId: string;
	userId: string;
	name: string;
}
