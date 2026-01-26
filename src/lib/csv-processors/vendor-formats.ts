export const CSV_VENDOR_FORMATS = ['FITOGETHER_V1', 'KNOWS_V1'] as const;

export type CsvVendorFormat = (typeof CSV_VENDOR_FORMATS)[number];

export const DEFAULT_CSV_VENDOR_FORMAT: CsvVendorFormat = 'FITOGETHER_V1';
