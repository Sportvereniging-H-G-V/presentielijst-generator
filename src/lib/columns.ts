export const MIN_COLUMN_COUNT = 1;
export const MAX_COLUMN_COUNT = 40;

export function clampColumnCount(value: number): number {
  if (Number.isNaN(value)) {
    return MIN_COLUMN_COUNT;
  }
  const floored = Math.floor(value);
  if (!Number.isFinite(floored)) {
    return MIN_COLUMN_COUNT;
  }
  return Math.min(MAX_COLUMN_COUNT, Math.max(MIN_COLUMN_COUNT, floored));
}

export function getDefaultColumnLabels(count: number): string[] {
  const safeCount = clampColumnCount(count);
  return Array.from({ length: safeCount }, () => 'Datum');
}
