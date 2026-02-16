import { useMemo } from 'react';
import type { LessonDateColumn } from '../lib/dates';
import { NormalizedRecord } from '../lib/types';
import { ParticipantsTable } from './ParticipantsTable';
import type { Trial } from '../lib/trials';

const TRIAL_METADATA = Symbol('trial-metadata');

interface TrialMetadata {
  count: number;
  phone?: string;
}

type TrialDisplayRecord = NormalizedRecord & {
  [TRIAL_METADATA]?: TrialMetadata;
};

function getTrialMetadata(record: NormalizedRecord): TrialMetadata | null {
  const candidate = record as TrialDisplayRecord;
  return candidate[TRIAL_METADATA] ?? null;
}

function createTrialRecord(coursecode: string, course: string, trial: Trial): TrialDisplayRecord {
  const sanitizedCount = Number.isFinite(trial.count) ? Math.max(0, Math.trunc(trial.count)) : 0;
  const trimmedPhone = trial.phone?.trim();
  return {
    coursecode,
    course,
    name: trial.name,
    phone1: trimmedPhone,
    phoneDisplay: trimmedPhone ?? '',
    phoneNumbers: trimmedPhone ? [trimmedPhone] : [],
    birthdate: '',
    birthdateRaw: '',
    secretImagesFlag: false,
    roleCategory: 'leden',
    sourceRowNumber: -1,
    isPlaceholder: false,
    [TRIAL_METADATA]: {
      count: sanitizedCount,
      phone: trimmedPhone || undefined,
    },
  };
}

function createSeparatorRecord(coursecode: string, course: string): NormalizedRecord {
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

interface LedenTableProps {
  records: NormalizedRecord[];
  coursecode: string;
  columnCount: number;
  dateColumns: LessonDateColumn[];
  trials?: Trial[];
}

export function LedenTable({ records, coursecode, columnCount, dateColumns, trials = [] }: LedenTableProps) {
  const courseName = records[0]?.course ?? '';
  const trialRows = useMemo(
    () => trials.map((trial) => createTrialRecord(coursecode, courseName, trial)),
    [courseName, coursecode, trials],
  );
  const extraRows = useMemo(() => {
    if (trialRows.length === 0) {
      return [];
    }
    const separator = createSeparatorRecord(coursecode, courseName);
    return [separator, ...trialRows];
  }, [courseName, coursecode, trialRows]);

  const sections = [
    {
      id: `${coursecode}-leden`,
      records,
    },
  ];
  return (
    <ParticipantsTable
      title="Leden"
      coursecode={coursecode}
      columnCount={columnCount}
      dateColumns={dateColumns}
      sections={sections}
      extraRows={extraRows}
      formatPhones={(person) => {
        if (person.isPlaceholder) {
          return '';
        }
        const metadata = getTrialMetadata(person);
        if (metadata) {
          return metadata.phone ?? '';
        }
        return person.phoneDisplay;
      }}
      getNameClassName={(person) => {
        if (person.isPlaceholder) {
          return 'font-medium text-slate-800';
        }
        return 'font-medium text-slate-800';
      }}
      renderNameContent={(person) => {
        if (person.isPlaceholder) {
          return '';
        }
        const metadata = getTrialMetadata(person);
        if (!metadata) {
          return person.name;
        }
        const trimmedName = person.name.trim() || person.name;
        return `${trimmedName} (${metadata.count})`;
      }}
    />
  );
}

export default LedenTable;
