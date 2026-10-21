import type { z } from 'zod';

/** Stored data could not be parsed, migrated or validated. The raw value is preserved. */
export class StorageCorruptedError extends Error {
  override readonly name = 'StorageCorruptedError';
  readonly raw: string;
  readonly backupKey: string | null;
  readonly issues: z.core.$ZodIssue[];

  constructor(message: string, options: { raw: string; backupKey: string | null; issues?: z.core.$ZodIssue[]; cause?: unknown }) {
    super(message, { cause: options.cause });
    this.raw = options.raw;
    this.backupKey = options.backupKey;
    this.issues = options.issues ?? [];
  }
}

/** Imported data failed validation. Nothing was written. */
export class ImportValidationError extends Error {
  override readonly name = 'ImportValidationError';
  readonly issues: z.core.$ZodIssue[];

  constructor(message: string, issues: z.core.$ZodIssue[] = [], cause?: unknown) {
    super(message, { cause });
    this.issues = issues;
  }
}

/** Data on disk was written by a newer app version than this one understands. */
export class UnsupportedSchemaVersionError extends Error {
  override readonly name = 'UnsupportedSchemaVersionError';
  readonly version: unknown;

  constructor(version: unknown) {
    super(`Unsupported schemaVersion: ${String(version)}`);
    this.version = version;
  }
}

export class NotFoundError extends Error {
  override readonly name = 'NotFoundError';

  constructor(entity: string, id: string) {
    super(`${entity} ${id} not found`);
  }
}

/** Writing failed, most likely because the browser storage quota is full. */
export class StorageWriteError extends Error {
  override readonly name = 'StorageWriteError';

  constructor(cause: unknown) {
    super('Could not save data. Browser storage may be full.', { cause });
  }
}
