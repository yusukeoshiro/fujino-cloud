import type { CsvVendorFormat } from '$lib/csv-processors/vendor-formats';

export interface OrganizationDto {
	id: string;
	name: string;
	createdAt?: string;
	defaultCsvVendorFormat?: CsvVendorFormat | null;
}

export interface CreateOrganizationDto {
	id: string;
	name: string;
}
