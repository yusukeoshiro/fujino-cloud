export interface OrganizationDto {
	id: string;
	name: string;
	createdAt?: string;
}

export interface CreateOrganizationDto {
	id: string;
	name: string;
}
