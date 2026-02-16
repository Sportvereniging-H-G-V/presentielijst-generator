import Papa, { ParseResult } from 'papaparse';
import { REQUIRED_FIELDS, resolveMapping } from './mapping';
import { formatPhones, normalizePhone } from './phones';
import type { ColumnMapping, RawRecord } from './types';

export type RawRow = Record<string, unknown>;
export type ParsedRow = RawRecord;

export type CsvParseError = {
  type?: string;
  code?: string;
  message: string;
  row?: number;
};

export type CsvParseResult = {
  data: ParsedRow[];
  fields: string[];
  errors: CsvParseError[];
  incompleteFieldErrors: CsvParseError[];
  mapping: ColumnMapping;
  missingRequiredFields: (keyof ColumnMapping)[];
};

const DEFAULT_DELIMITER = ';';
const SUPPRESSIBLE_FIELD = 'function';

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

function detectDelimiter(input: string, preferred?: string): string {
  if (preferred && preferred.length > 0) {
    return preferred;
  }
  const lines = input.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const sample = lines.slice(0, 5).join('\n');
  const commaCount = countOccurrences(sample, ',');
  const semicolonCount = countOccurrences(sample, ';');
  if (semicolonCount === 0 && commaCount === 0) {
    return DEFAULT_DELIMITER;
  }
  if (semicolonCount >= commaCount) {
    return ';';
  }
  return ',';
}

function normalizeFieldName(field: string): string {
  return field.trim().toLowerCase();
}

export function parseCsv(input: string, delimiter?: string) {
  return new Promise<CsvParseResult>((resolve) => {
    const detectedDelimiter = detectDelimiter(input, delimiter);
    Papa.parse<RawRow>(input, {
      delimiter: detectedDelimiter,
      header: true,
      skipEmptyLines: true,
      complete: (results: ParseResult<RawRow>) => {
        const rawFields = results.meta.fields ?? [];
        const fields = rawFields.map((field) => field.trim());
        const mappingResult = resolveMapping(fields);
        const rawErrors = results.errors ?? [];
        const parseErrors: CsvParseError[] = rawErrors.map((error) => ({
          type: error.type,
          code: error.code,
          message: error.message,
          row: error.row,
        }));
        const errorsByRow = new Map<number, CsvParseError[]>();
        parseErrors.forEach((error) => {
          if (typeof error.row === 'number') {
            const existing = errorsByRow.get(error.row) ?? [];
            existing.push(error);
            errorsByRow.set(error.row, existing);
          }
        });
        const suppressedRows = new Set<number>();
        const additionalErrors: CsvParseError[] = [];

        const data = results.data.map((row, rowIndex) => {
          const cleaned: ParsedRow = {};
          const trimmedEntries = new Map<string, string | undefined>();
          Object.entries(row).forEach(([key, value]) => {
            const trimmedKey = key.trim();
            const normalizedValue =
              typeof value === 'string'
                ? value.trim()
                : value == null
                ? undefined
                : String(value).trim();
            trimmedEntries.set(trimmedKey, normalizedValue);
          });

          fields.forEach((field) => {
            const existing = trimmedEntries.get(field);
            cleaned[field] = existing ?? '';
          });

          const normalizedName = String(trimmedEntries.get('name2') ?? '').trim();
          if (fields.includes('name2')) {
            cleaned['name2'] = normalizedName;
          }

          const phone1 = normalizePhone(String((row as RawRow)['phone1'] ?? ''));
          const phone2 = normalizePhone(String((row as RawRow)['phone2'] ?? ''));
          if (phone1 || phone2) {
            cleaned['phone1'] = phone1;
            cleaned['phone2'] = phone2;
          }
          cleaned['phoneDisplay'] = formatPhones(phone1, phone2);

          const missingFields = fields.filter((field) => !trimmedEntries.has(field));
          const rowErrors = errorsByRow.get(rowIndex) ?? [];
          const hasNonTooFewErrors = rowErrors.some((error) => error.code !== 'TooFewFields');
          if (!hasNonTooFewErrors && missingFields.length > 0) {
            const missingOnlyTooFew = rowErrors.some((error) => error.code === 'TooFewFields');
            const onlyFunctionMissing =
              missingFields.length === 1 && normalizeFieldName(missingFields[0]) === SUPPRESSIBLE_FIELD;
            if (missingOnlyTooFew || onlyFunctionMissing) {
              suppressedRows.add(rowIndex);
            }
          }

          const shouldReportMissing = missingFields.length > 0 && !suppressedRows.has(rowIndex);
          if (shouldReportMissing) {
            const messageBase =
              missingFields.length === 1
                ? `Kolom '${missingFields[0]}' ontbrak in de rij.`
                : `Kolommen ${missingFields.map((field) => `'${field}'`).join(', ')} ontbraken in de rij.`;
            additionalErrors.push({
              type: 'FieldMismatch',
              code: 'TooFewFields',
              message: messageBase,
              row: rowIndex,
            });
          }

          trimmedEntries.forEach((value, key) => {
            if (!(key in cleaned)) {
              cleaned[key] = value ?? '';
            }
          });

          cleaned['__rowNumber'] = String(rowIndex + 2);

          return cleaned;
        });

        const filteredParseErrors = parseErrors.filter((error) => {
          if (error.code !== 'TooFewFields') {
            return true;
          }
          const rowIndex = typeof error.row === 'number' ? error.row : undefined;
          if (rowIndex === undefined) {
            return true;
          }
          return !suppressedRows.has(rowIndex);
        });

        const filteredAdditionalErrors = additionalErrors.filter((error) => {
          if (error.code !== 'TooFewFields') {
            return true;
          }
          const rowIndex = typeof error.row === 'number' ? error.row : undefined;
          if (rowIndex === undefined) {
            return true;
          }
          return !suppressedRows.has(rowIndex);
        });

        const incompleteFieldIssues = [
          ...filteredParseErrors.filter((error) => error.code === 'TooFewFields'),
          ...filteredAdditionalErrors.filter((error) => error.code === 'TooFewFields'),
        ];
        resolve({
          data,
          fields,
          errors: [...filteredParseErrors, ...filteredAdditionalErrors],
          incompleteFieldErrors: incompleteFieldIssues,
          mapping: mappingResult.mapping,
          missingRequiredFields: mappingResult.missing,
        });
      },
      error: (error: unknown) => {
        const message =
          typeof error === 'object' && error && 'message' in error
            ? String((error as { message?: unknown }).message)
            : String(error);
        const fallbackError: CsvParseError = {
          type: 'Error',
          code: 'Unknown',
          message,
          row: -1,
        };
        resolve({
          data: [],
          fields: [],
          errors: [fallbackError],
          incompleteFieldErrors: [],
          mapping: {},
          missingRequiredFields: [...REQUIRED_FIELDS],
        });
      },
    });
  });
}

export async function parseCsvFromFile(file: File, delimiter?: string): Promise<CsvParseResult> {
  const text = await file.text();
  return parseCsv(text, delimiter);
}

export function parseCsvFromString(text: string, delimiter?: string): Promise<CsvParseResult> {
  return parseCsv(text, delimiter);
}

export function takePreviewRows(rows: ParsedRow[], count = 10): ParsedRow[] {
  return rows.slice(0, count);
}

