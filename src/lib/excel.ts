import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { THEME } from '../theme';
import { LessonGroup, NormalizedRecord } from './types';
import { getMonthName } from './dates';
import { clampColumnCount } from './columns';
import { getTrials, Trial } from './trials';

type XlsxPopulateModule = typeof import('xlsx-populate/browser/xlsx-populate');

let xlsxPopulateModulePromise: Promise<XlsxPopulateModule> | null = null;

async function loadXlsxPopulateModule(): Promise<XlsxPopulateModule> {
  if (!xlsxPopulateModulePromise) {
    xlsxPopulateModulePromise = import('xlsx-populate/browser/xlsx-populate');
  }
  return xlsxPopulateModulePromise;
}

async function getXlsxPopulate() {
  const module = await loadXlsxPopulateModule();
  return module.default;
}

type XlsxPopulateStatic = Awaited<ReturnType<typeof getXlsxPopulate>>;
type Workbook = Awaited<ReturnType<XlsxPopulateStatic['fromBlankAsync']>>;
type XlsxSheet = ReturnType<Workbook['sheet']>;

type RowValues = (string | number)[];

function addSheet(workbook: Workbook, name: string): XlsxSheet {
  return (workbook as unknown as { addSheet: (sheetName: string) => XlsxSheet }).addSheet(name);
}

const BASE_COLUMNS = 4;

function columnLetter(index: number): string {
  let letter = '';
  let value = index;
  while (value > 0) {
    const remainder = (value - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    value = Math.floor((value - 1) / 26);
  }
  return letter;
}

function sanitizeFilenamePart(value: string): string {
  return value
    .replace(/\//g, '-')
    .replace(/[:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeSheetName(value: string): string {
  const cleaned = value
    .replace(/[\\/*?:\[\]]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) {
    return 'blad';
  }
  return cleaned.slice(0, 31);
}

function reserveSheetName(existing: Set<string>, baseName: string): string {
  const sanitizedBase = sanitizeSheetName(baseName);
  if (!existing.has(sanitizedBase)) {
    existing.add(sanitizedBase);
    return sanitizedBase;
  }
  let counter = 2;
  while (true) {
    const suffix = ` (${counter})`;
    const maxBaseLength = Math.max(0, 31 - suffix.length);
    const shortenedBase = sanitizedBase.slice(0, maxBaseLength).trim() || 'blad';
    const candidate = `${shortenedBase}${suffix}`.slice(0, 31);
    if (!existing.has(candidate)) {
      existing.add(candidate);
      return candidate;
    }
    counter += 1;
  }
}

function normalizeNameKey(value: string): string {
  return value.trim().toLowerCase();
}

const HEADER_LABELS = ['Naam', 'Telefoonnummer(s)', 'Geb. datum', 'Foto'] as const;

const EXCEL_BLACK = '#000000';

const GRID_BORDER = { style: 'thin', color: 'FF000000' } as const;

const EXCEL_COLORS = {
  titleFill: THEME.titleBg,
  titleText: THEME.titleText,
  headerFill: THEME.headerBg,
  headerText: THEME.headerText,
  sectionFill: THEME.sectionHeaderBg,
  sectionText: THEME.sectionHeaderText,
  dateFill: THEME.dateCellBg,
  white: '#FFFFFF',
  black: EXCEL_BLACK,
} as const;

function toArgb(hex: string): string {
  const value = hex.replace('#', '').toUpperCase();
  return `FF${value}`;
}

function solidFill(argbColor: string) {
  return {
    type: 'pattern' as const,
    pattern: 'solid' as const,
    foreground: { rgb: argbColor },
  };
}

interface BuiltRow {
  values: RowValues;
  name: string;
  phone: string;
  birthdate: string;
  foto: string;
}

interface SectionWriteResult {
  nextRow: number;
  names: string[];
  phones: string[];
  birthdates: string[];
  fotos: string[];
  headerRow: number;
  dataStartRow: number;
  dataEndRow: number;
}

interface SectionWriteOptions {
  onWriteRow?: (context: {
    rowNumber: number;
    record: NormalizedRecord;
    rowRange: ReturnType<XlsxSheet['range']>;
    lastColumnLetter: string;
  }) => void;
}

function createExcelSeparatorRecord(coursecode: string, course: string): NormalizedRecord {
  return {
    coursecode,
    course,
    name: '',
    phoneDisplay: '',
    phoneNumbers: [],
    birthdate: '',
    birthdateRaw: '',
    secretImagesFlag: false,
    roleCategory: 'leden',
    sourceRowNumber: -1,
    isPlaceholder: true,
  };
}

function createExcelTrialRecord(coursecode: string, course: string, trial: Trial): NormalizedRecord {
  const sanitizedCount = Math.max(0, Math.trunc(trial.count));
  const trimmedName = trial.name.trim() || trial.name;
  const trimmedPhone = trial.phone?.trim();
  const displayName = `${trimmedName} (${sanitizedCount})`;

  return {
    coursecode,
    course,
    name: displayName,
    phoneDisplay: trimmedPhone ?? '',
    phoneNumbers: trimmedPhone ? [trimmedPhone] : [],
    birthdate: '',
    birthdateRaw: '',
    secretImagesFlag: false,
    roleCategory: 'leden',
    sourceRowNumber: -1,
    isPlaceholder: false,
  };
}

function buildRow(person: NormalizedRecord, dateColumnCount: number): BuiltRow {
  const name = person.name;
  const phone = person.phoneDisplay;
  const birthdate = person.birthdate ?? person.birthdateRaw ?? '';
  const foto = person.secretImagesFlag ? 'Nee' : '';
  const blanks = Array.from({ length: dateColumnCount }, () => '');
  return {
    values: [name, phone, birthdate, foto, ...blanks],
    name,
    phone,
    birthdate,
    foto,
  };
}

function autosizeColumnByValues(
  sheet: XlsxSheet,
  colIndex: number,
  values: Array<string | number>,
  { min = 10, max = 45, padding = 2 }: { min?: number; max?: number; padding?: number } = {},
) {
  const estimate = (s: string) => Math.ceil(s.length * 1.2) + padding;
  const normalized = values.map((value) => String(value ?? ''));
  const widths = normalized.map((value) => estimate(value));
  const computed = widths.length > 0 ? Math.max(...widths) : min;
  const width = Math.max(min, Math.min(max, computed));
  sheet.column(colIndex).width(width);
  sheet.column(colIndex).style({
    wrapText: false,
    horizontalAlignment: 'left',
    verticalAlignment: 'center',
  });
}

function applyRangeBorder(range: ReturnType<XlsxSheet['range']>) {
  range.style({
    border: {
      left: GRID_BORDER,
      right: GRID_BORDER,
      top: GRID_BORDER,
      bottom: GRID_BORDER,
    },
  });
}

function writeSection(
  sheet: XlsxSheet,
  startRow: number,
  title: string,
  records: NormalizedRecord[],
  dateColumnCount: number,
  options: SectionWriteOptions = {},
): SectionWriteResult {
  const datumColumns = Array.from({ length: dateColumnCount }, () => 'Datum');
  const header = [...HEADER_LABELS, ...datumColumns];
  const totalColumns = HEADER_LABELS.length + dateColumnCount;
  const lastColumnLetter = columnLetter(totalColumns);

  const sectionHeaderRange = sheet.range(`A${startRow}:${lastColumnLetter}${startRow}`);
  sectionHeaderRange.merged(true).value(title);
  sectionHeaderRange.style({
    bold: true,
    fill: solidFill(toArgb(EXCEL_COLORS.sectionFill)),
    fontColor: { rgb: toArgb(EXCEL_COLORS.sectionText) },
    horizontalAlignment: 'left',
    verticalAlignment: 'center',
  });
  applyRangeBorder(sectionHeaderRange);
  sheet.row(startRow).height(20);

  const headerRow = startRow + 1;
  const headerRange = sheet.range(`A${headerRow}:${lastColumnLetter}${headerRow}`);
  headerRange.value([header]);
  headerRange.style({
    bold: true,
    fill: solidFill(toArgb(EXCEL_COLORS.headerFill)),
    fontColor: { rgb: toArgb(EXCEL_COLORS.headerText) },
    horizontalAlignment: 'center',
    verticalAlignment: 'center',
    wrapText: false,
  });
  sheet.range(`A${headerRow}:D${headerRow}`).style({ horizontalAlignment: 'left' });
  sheet.row(headerRow).height(22);

  const names = ['Naam'];
  const phones = ['Telefoonnummer(s)'];
  const birthdates = ['Geb. datum'];
  const fotos = ['Foto'];

  const dataStartRow = headerRow + 1;
  let currentRow = dataStartRow;
  if (records.length === 0) {
    const emptyRow = Array.from({ length: totalColumns }, () => '');
    sheet.range(`A${currentRow}:${lastColumnLetter}${currentRow}`).value([emptyRow]);
    names.push('');
    phones.push('');
    birthdates.push('');
    fotos.push('');
    currentRow += 1;
  } else {
    records.forEach((person) => {
      const row = buildRow(person, dateColumnCount);
      const rowRange = sheet.range(`A${currentRow}:${lastColumnLetter}${currentRow}`);
      rowRange.value([row.values]);
      names.push(row.name);
      phones.push(row.phone);
      birthdates.push(row.birthdate);
      fotos.push(row.foto);
      options.onWriteRow?.({ rowNumber: currentRow, record: person, rowRange, lastColumnLetter });
      currentRow += 1;
    });
  }

  const lastDataRow = currentRow - 1;
  const tableRange = sheet.range(`A${headerRow}:${lastColumnLetter}${lastDataRow}`);
  tableRange.style({
    verticalAlignment: 'center',
    fontColor: { rgb: toArgb(EXCEL_COLORS.headerText) },
  });
  applyRangeBorder(tableRange);

  if (lastDataRow >= headerRow + 1) {
    const dataRange = sheet.range(`A${headerRow + 1}:${lastColumnLetter}${lastDataRow}`);
    dataRange.style({
      fill: solidFill(toArgb(EXCEL_COLORS.white)),
      fontColor: { rgb: toArgb(EXCEL_COLORS.black) },
    });
    sheet.range(`A${headerRow + 1}:D${lastDataRow}`).style({ horizontalAlignment: 'left' });
  }

  if (dateColumnCount > 0) {
    const firstDateColumn = columnLetter(BASE_COLUMNS + 1);
    const lastDateColumn = columnLetter(BASE_COLUMNS + dateColumnCount);
    const dateStartRow = headerRow + 1;
    if (lastDataRow >= dateStartRow) {
      const dateRange = sheet.range(`${firstDateColumn}${dateStartRow}:${lastDateColumn}${lastDataRow}`);
      dateRange.style({
        fill: solidFill(toArgb(EXCEL_COLORS.dateFill)),
        fontColor: { rgb: toArgb(EXCEL_COLORS.black) },
        horizontalAlignment: 'center',
      });
    }
  }

  return {
    nextRow: lastDataRow + 2,
    names,
    phones,
    birthdates,
    fotos,
    headerRow,
    dataStartRow,
    dataEndRow: lastDataRow,
  };
}

function populateLessonSheet(
  sheet: XlsxSheet,
  lesson: LessonGroup,
  month: number,
  year: number,
  columnCount: number,
) {
  const safeColumnCount = clampColumnCount(columnCount);
  const totalColumns = BASE_COLUMNS + safeColumnCount;
  const lastColumnLetter = columnLetter(totalColumns);
  const monthName = getMonthName(month);
  const ledenCount = lesson.leden.filter((person) => !person.isPlaceholder).length;
  const title = `Presentielijst ${monthName} ${year} voor lesnummer ${lesson.coursecode}: ${lesson.course} (${ledenCount} leden)`;

  const titleRange = sheet.range(`A1:${lastColumnLetter}1`);
  titleRange.merged(true).value(title);
  titleRange.style({
    bold: true,
    fontSize: 14,
    horizontalAlignment: 'center',
    verticalAlignment: 'center',
    fill: solidFill(toArgb(EXCEL_COLORS.titleFill)),
    fontColor: { rgb: toArgb(EXCEL_COLORS.titleText) },
  });
  applyRangeBorder(titleRange);
  sheet.row(1).height(28);

  const staffResult = writeSection(
    sheet,
    2,
    'Leiding & Assistenten',
    lesson.staffOrdered,
    safeColumnCount,
    {
      onWriteRow: ({ rowNumber, record }) => {
        if (record.roleCategory === 'leiding') {
          sheet.cell(`A${rowNumber}`).style({ bold: true });
        }
      },
    },
  );
  const trials = getTrials(lesson.coursecode);

  const ledenRecords: NormalizedRecord[] = [...lesson.leden];
  if (trials.length > 0) {
    const separatorRow = createExcelSeparatorRecord(lesson.coursecode, lesson.course);
    const trialRows = trials.map((trial) => createExcelTrialRecord(lesson.coursecode, lesson.course, trial));
    ledenRecords.push(separatorRow, ...trialRows);
  }

  const ledenResult = writeSection(sheet, staffResult.nextRow, 'Leden', ledenRecords, safeColumnCount);

  const allNames = [...staffResult.names, ...ledenResult.names];
  const allPhones = [...staffResult.phones, ...ledenResult.phones];
  const allBirthdates = [...staffResult.birthdates, ...ledenResult.birthdates];
  const allFotos = [...staffResult.fotos, ...ledenResult.fotos];

  autosizeColumnByValues(sheet, 1, allNames, { min: 28, max: 45, padding: 3 });
  autosizeColumnByValues(sheet, 2, allPhones, { min: 24, max: 42, padding: 4 });
  autosizeColumnByValues(sheet, 3, allBirthdates, { min: 12, max: 14, padding: 2 });
  autosizeColumnByValues(sheet, 4, allFotos, { min: 8, max: 10, padding: 1 });

  sheet.column(3).style({
    horizontalAlignment: 'left',
    verticalAlignment: 'center',
    wrapText: false,
  });
  sheet.column(4).style({
    horizontalAlignment: 'left',
    verticalAlignment: 'center',
    wrapText: false,
  });

  for (let i = 0; i < safeColumnCount; i += 1) {
    const colIndex = BASE_COLUMNS + 1 + i;
    autosizeColumnByValues(sheet, colIndex, ['Datum'], { min: 4, max: 6, padding: 1 });
    sheet.column(colIndex).style({
      horizontalAlignment: 'center',
      verticalAlignment: 'center',
      wrapText: false,
    });
  }
}

export async function buildLessonWorkbook(
  lesson: LessonGroup,
  month: number,
  year: number,
  columnCount: number,
): Promise<Blob> {
  const XlsxPopulate = await getXlsxPopulate();
  const workbook = await XlsxPopulate.fromBlankAsync();
  const sheet = workbook.sheet(0);
  sheet.name('Presentielijst');

  populateLessonSheet(sheet, lesson, month, year, columnCount);

  const blob = (await workbook.outputAsync('blob')) as Blob;
  return blob;
}

export function getLessonExcelFilename(
  coursecode: string,
  course: string,
  month: number,
  year: number,
): string {
  const monthName = getMonthName(month);
  const safeCoursecode = sanitizeFilenamePart(coursecode || 'les') || 'les';
  const safeCourse = sanitizeFilenamePart(course || 'cursus') || 'cursus';
  const parts = [safeCoursecode, safeCourse, monthName, String(year)];
  return `${parts.join(' ')}.xlsx`;
}

export function getZipFilename(month: number, year: number): string {
  const monthName = getMonthName(month);
  return `presentielijsten_${monthName}-${year}.zip`;
}

function getLeaderWorkbookFilename(leaderName: string, month: number, year: number): string {
  const monthName = getMonthName(month);
  const safeLeaderName = sanitizeFilenamePart(leaderName || 'Leiding') || 'Leiding';
  return `${safeLeaderName} - Presentielijsten ${monthName} ${year}.xlsx`;
}

function getPerLeaderZipFilename(month: number, year: number): string {
  const monthName = getMonthName(month);
  return `presentielijsten_per_leiding_${monthName}-${year}.zip`;
}

export async function downloadLessonExcel(
  lesson: LessonGroup,
  month: number,
  year: number,
  columnCount: number,
): Promise<void> {
  if (lesson.shouldSkip) {
    return;
  }
  const blob = await buildLessonWorkbook(lesson, month, year, columnCount);
  const filename = getLessonExcelFilename(lesson.coursecode, lesson.course, month, year);
  saveAs(blob, filename);
}

export async function downloadAllLessonsZip(
  lessons: LessonGroup[],
  month: number,
  year: number,
  columnCount: number,
): Promise<void> {
  const eligibleLessons = lessons.filter((lesson) => !lesson.shouldSkip);
  if (eligibleLessons.length === 0) {
    return;
  }

  const zip = new JSZip();
  await Promise.all(
    eligibleLessons.map(async (lesson) => {
      const blob = await buildLessonWorkbook(lesson, month, year, columnCount);
      const filename = getLessonExcelFilename(lesson.coursecode, lesson.course, month, year);
      zip.file(filename, blob);
    }),
  );

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const filename = getZipFilename(month, year);
  saveAs(zipBlob, filename);
}

export async function downloadPerLeaderZip(
  lessons: LessonGroup[],
  month: number,
  year: number,
  columnCount: number,
): Promise<void> {
  const eligibleLessons = lessons.filter((lesson) => !lesson.shouldSkip);
  if (eligibleLessons.length === 0) {
    return;
  }

  const leaderMap = new Map<string, { name: string; lessons: LessonGroup[] }>();

  eligibleLessons.forEach((lesson) => {
    lesson.staffOrdered
      .filter(
        (person) =>
          person.roleCategory === 'leiding' &&
          !person.isPlaceholder &&
          person.name.trim().length > 0,
      )
      .forEach((person) => {
        const key = normalizeNameKey(person.name);
        if (!leaderMap.has(key)) {
          leaderMap.set(key, { name: person.name, lessons: [] });
        }
        const entry = leaderMap.get(key)!;
        if (!entry.lessons.includes(lesson)) {
          entry.lessons.push(lesson);
        }
      });
  });

  if (leaderMap.size === 0) {
    return;
  }

  const zip = new JSZip();

  await Promise.all(
    Array.from(leaderMap.values()).map(async ({ name, lessons: leaderLessons }) => {
      if (leaderLessons.length === 0) {
        return;
      }

      const XlsxPopulate = await getXlsxPopulate();
      const workbook = await XlsxPopulate.fromBlankAsync();
      const usedSheetNames = new Set<string>();

      leaderLessons.forEach((lesson, index) => {
        const baseName = lesson.coursecode ? `les ${lesson.coursecode}` : 'les';
        const sheetName = reserveSheetName(usedSheetNames, baseName);
        let sheet: XlsxSheet;
        if (index === 0) {
          sheet = workbook.sheet(0);
          sheet.name(sheetName);
        } else {
          sheet = addSheet(workbook, sheetName);
        }
        populateLessonSheet(sheet, lesson, month, year, columnCount);
      });

      const blob = (await workbook.outputAsync('blob')) as Blob;
      const filename = getLeaderWorkbookFilename(name, month, year);
      zip.file(filename, blob);
    }),
  );

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const filename = getPerLeaderZipFilename(month, year);
  saveAs(zipBlob, filename);
}
