export type MetadataEntry = { key: string; value: string };

const FUJINO_METADATA_PREFIX = 'x-fujino-';
const GPS_TYPE_KEY = 'x-fujino-cloud-gps-type';

export function isFujinoCreated(metadata?: MetadataEntry[] | null): boolean {
	if (!metadata || metadata.length === 0) return false;
	return metadata.some(
		(entry) =>
			typeof entry?.key === 'string' && entry.key.toLowerCase().startsWith(FUJINO_METADATA_PREFIX),
	);
}

export function getGpsType(metadata?: MetadataEntry[] | null): string | null {
	if (!metadata || metadata.length === 0) return null;
	const match = metadata.find(
		(entry) => typeof entry?.key === 'string' && entry.key.toLowerCase() === GPS_TYPE_KEY,
	);
	return match?.value ?? null;
}
