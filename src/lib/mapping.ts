import { normalizeBirthdate } from './dates';
import { formatPhones, normalizePhone } from './phones';
import { ColumnMapping, LessonTrainerIssue, NormalizedRecord, RawRecord, TrainerIssueEntry } from './types';

const FIELD_ALIASES: Record<keyof ColumnMapping, string[]> = {
  coursecode: ['coursecode', 'lesnummer', 'code'],
  course: ['course', 'cursus', 'lesnaam', 'title'],
  name2: ['name2', 'naam', 'name'],
  function: ['function', 'rol', 'role', 'functie'],
  phone1: ['phone1', 'telefoon', 'telefoon1', 'phone'],
  phone2: ['phone2', 'telefoon2', 'mobile', 'gsm'],
  birthdate: ['birthdate', 'geboortedatum', 'dob'],
  secretimages: ['secretimages', 'foto', 'photos', 'privacy'],
};

export const REQUIRED_FIELDS: (keyof ColumnMapping)[] = ['coursecode', 'course', 'name2'];

export const FIELD_LABELS: Record<keyof ColumnMapping, string> = {
  coursecode: 'Lesnummer (coursecode)',
  course: 'Naam les (course)',
  name2: 'Naam (name2)',
  function: 'Rol (function)',
  phone1: 'Telefoonnummer 1',
  phone2: 'Telefoonnummer 2',
  birthdate: 'Geboortedatum',
  secretimages: 'Foto toestemming (secretimages)',
};

export interface MappingResult {
  mapping: ColumnMapping;
  missing: (keyof ColumnMapping)[];
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase();
}

export function resolveMapping(headers: string[]): MappingResult {
  const trimmedHeaders = headers.map((header) => header.trim());
  const mapping: ColumnMapping = {};
  const normalizedHeaders = trimmedHeaders.map((header) => ({
    original: header,
    normalized: normalizeHeader(header),
  }));

  normalizedHeaders.forEach(({ original, normalized }) => {
    (Object.keys(FIELD_ALIASES) as (keyof ColumnMapping)[]).forEach((field) => {
      if (mapping[field]) {
        return;
      }
      const aliases = FIELD_ALIASES[field];
      if (aliases.some((alias) => normalizeHeader(alias) === normalized)) {
        mapping[field] = original;
      }
    });
  });

  const missing = REQUIRED_FIELDS.filter((field) => {
    const column = mapping[field];
    return !column || !trimmedHeaders.includes(column);
  });

  return { mapping, missing };
}

const ROLE_NORMALIZATION: Record<string, 'leiding' | 'assistent' | 'trainer'> = {
  leiding: 'leiding',
  hulpleiding: 'assistent',
  assistent: 'assistent',
  assistant: 'assistent',
  hulpleidster: 'assistent',
  'hulpleiding ': 'assistent',
  trainer: 'trainer',
  'trainer ': 'trainer',
};

function detectRole(value: string): { category: NormalizedRecord['roleCategory']; wasTrainer: boolean; normalized?: string } {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return { category: 'leden', wasTrainer: false };
  }
  const mapped = ROLE_NORMALIZATION[normalized];
  if (mapped === 'leiding') {
    return { category: 'leiding', wasTrainer: false, normalized };
  }
  if (mapped === 'assistent') {
    return { category: 'assistent', wasTrainer: false, normalized };
  }
  if (mapped === 'trainer') {
    return { category: 'leiding', wasTrainer: true, normalized };
  }
  return { category: 'leden', wasTrainer: false, normalized };
}

function readValue(record: RawRecord, column?: string): string {
  if (!column) return '';
  const value = record[column];
  if (Array.isArray(value)) {
    return value.join(' ').trim();
  }
  return (value ?? '').toString().trim();
}

export interface NormalizationResult {
  records: NormalizedRecord[];
  warnings: string[];
  trainerWarnings: LessonTrainerIssue[];
}

export function normalizeRecords(data: RawRecord[], mapping: ColumnMapping): NormalizationResult {
  const normalized: NormalizedRecord[] = [];
  const warnings = new Set<string>();
  const trainerIssueMap = new Map<string, LessonTrainerIssue>();

  data.forEach((record, index) => {
    const coursecode = readValue(record, mapping.coursecode);
    const course = readValue(record, mapping.course);
    const name = String(readValue(record, mapping.name2)).trim();
    if (!coursecode || !name) {
      return;
    }

    const roleRaw = readValue(record, mapping.function);
    const roleDetection = detectRole(roleRaw);
    const normalizedRole = roleRaw.trim();
    if (normalizedRole && !ROLE_NORMALIZATION[normalizedRole.toLowerCase()]) {
      warnings.add(`Onbekende rol '${normalizedRole}' → behandeld als lid.`);
    }

    const phone1Raw = normalizePhone(readValue(record, mapping.phone1));
    const phone2Raw = normalizePhone(readValue(record, mapping.phone2));
    const phoneNumbers = [phone1Raw, phone2Raw].filter((phone) => phone.length > 0);
    const phoneDisplay = formatPhones(phone1Raw, phone2Raw);

    const birthdateRaw = readValue(record, mapping.birthdate);
    const birthdate = normalizeBirthdate(birthdateRaw);
    const secretImagesFlag = readValue(record, mapping.secretimages) === '1';

    const sourceRowNumberRaw = (record as Record<string, string | undefined>)['__rowNumber'];
    const sourceRowNumber = sourceRowNumberRaw ? Number.parseInt(sourceRowNumberRaw, 10) : index + 2;

    const normalizedRecord: NormalizedRecord = {
      coursecode,
      course,
      name,
      phone1: phone1Raw || undefined,
      phone2: phone2Raw || undefined,
      phoneDisplay,
      phoneNumbers,
      birthdate: birthdate || undefined,
      birthdateRaw: birthdateRaw || undefined,
      secretImagesFlag,
      function: normalizedRole || undefined,
      roleCategory: roleDetection.category,
      wasTrainer: roleDetection.wasTrainer,
      sourceRowNumber: Number.isFinite(sourceRowNumber) ? sourceRowNumber : index + 2,
    };

    if (roleDetection.wasTrainer) {
      const entry: TrainerIssueEntry = {
        name,
        rowNumber: normalizedRecord.sourceRowNumber,
      };
      const existing = trainerIssueMap.get(coursecode);
      if (existing) {
        if (course && !existing.course) {
          existing.course = course;
        }
        existing.entries.push(entry);
      } else {
        trainerIssueMap.set(coursecode, {
          coursecode,
          course,
          entries: [entry],
        });
      }
    }

    normalized.push(normalizedRecord);
  });

  const trainerWarnings = Array.from(trainerIssueMap.values()).map((warning) => ({
    coursecode: warning.coursecode,
    course: warning.course,
    entries: warning.entries.sort((a, b) => a.rowNumber - b.rowNumber),
  }));

  trainerWarnings.sort((a, b) => a.coursecode.localeCompare(b.coursecode, 'nl-NL', { sensitivity: 'base' }));

  return { records: normalized, warnings: Array.from(warnings), trainerWarnings };
}
