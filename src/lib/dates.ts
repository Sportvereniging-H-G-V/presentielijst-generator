import { clampColumnCount } from './columns';

const MONTH_NAMES = [
  'januari',
  'februari',
  'maart',
  'april',
  'mei',
  'juni',
  'juli',
  'augustus',
  'september',
  'oktober',
  'november',
  'december',
];

export function getMonthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? '';
}

export function formatMonthTitle(month: number, year: number): string {
  return `${getMonthName(month)} ${year}`;
}

export function makeBlankColumns(count: number): number[] {
  const safeCount = Math.max(0, Math.min(40, Math.floor(count)));
  return Array.from({ length: safeCount }, (_, index) => index + 1);
}

function clampMonth(month: number): number {
  if (!Number.isFinite(month)) {
    return 1;
  }
  const rounded = Math.floor(month);
  return Math.min(12, Math.max(1, rounded));
}

function clampYear(year: number): number {
  if (!Number.isFinite(year)) {
    return new Date().getFullYear();
  }
  return Math.floor(year);
}

export interface LessonDateColumn {
  isoDate: string;
  label: string;
}

export function getLessonDateColumns(month: number, year: number, count: number): LessonDateColumn[] {
  const safeCount = clampColumnCount(count);
  const safeMonth = clampMonth(month);
  const safeYear = clampYear(year);
  const baseDate = new Date(Date.UTC(safeYear, safeMonth - 1, 1));

  return Array.from({ length: safeCount }, (_, index) => {
    const current = new Date(baseDate.getTime());
    current.setUTCDate(baseDate.getUTCDate() + index);
    const isoDate = current.toISOString().slice(0, 10);
    const label = current.toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
    });
    return { isoDate, label };
  });
}

export function normalizeBirthdate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  const sanitized = trimmed.replace(/[./]/g, '-');
  const parts = sanitized.split('-');
  if (parts.length === 3) {
    const [a, b, c] = parts.map((part) => part.padStart(2, '0'));
    if (a.length === 4) {
      // YYYY-MM-DD or YYYY-DD-MM
      const year = parseInt(a, 10);
      const first = parseInt(b, 10);
      const second = parseInt(c, 10);
      if (!Number.isNaN(year) && !Number.isNaN(first) && !Number.isNaN(second)) {
        const month = first > 12 && second <= 12 ? second : first;
        const day = first > 12 && second <= 12 ? first : second;
        if (isValidYMD(year, month, day)) {
          return formatDDMMYYYY(day, month, year);
        }
      }
    }
    if (c.length === 4) {
      const day = parseInt(a, 10);
      const month = parseInt(b, 10);
      const year = parseInt(c, 10);
      if (isValidYMD(year, month, day)) {
        return formatDDMMYYYY(day, month, year);
      }
    }
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return formatDDMMYYYY(parsed.getUTCDate(), parsed.getUTCMonth() + 1, parsed.getUTCFullYear());
  }
  return '';
}

function isValidYMD(year: number, month: number, day: number): boolean {
  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function formatDDMMYYYY(day: number, month: number, year: number): string {
  const dayStr = day.toString().padStart(2, '0');
  const monthStr = month.toString().padStart(2, '0');
  return `${dayStr}-${monthStr}-${year}`;
}

