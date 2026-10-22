import { datasetSchema, type Dataset } from '../schemas';
import { ImportValidationError, UnsupportedSchemaVersionError } from './errors';
import { migrate } from './migrations';

/**
 * Migrates and validates untrusted data (e.g. an uploaded backup file) without
 * writing anything, so the UI can preview an import before committing to it.
 */
export function validateDataset(raw: unknown): Dataset {
  let migrated: unknown;
  try {
    migrated = migrate(raw).data;
  } catch (error) {
    const message = error instanceof UnsupportedSchemaVersionError ? error.message : 'Unrecognised file format';
    throw new ImportValidationError(message, [], error);
  }
  if (typeof migrated !== 'object' || migrated === null || Array.isArray(migrated)) {
    throw new ImportValidationError('Unrecognised file format: expected a Dayzero export');
  }
  const result = datasetSchema.safeParse(migrated);
  if (!result.success) throw new ImportValidationError('The file failed validation', result.error.issues);
  return result.data;
}

/** Parses JSON text then validates it; JSON syntax errors become ImportValidationError too. */
export function parseDatasetJson(text: string): Dataset {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    throw new ImportValidationError('The file is not valid JSON', [], error);
  }
  return validateDataset(raw);
}
