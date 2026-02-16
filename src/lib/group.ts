import {
  EmptyLessonWarning,
  GroupedLessonsResult,
  LessonGroup,
  NormalizedRecord,
  TrainerIssueEntry,
} from './types';

const INVALLER_COUNT = 3;

function isFilled(value: unknown): boolean {
  return String(value ?? '').trim().length > 0;
}

function normalizeNameKey(value: string): string {
  return value.trim().toLowerCase();
}

interface LessonBuckets {
  course: string;
  leiding: Map<string, NormalizedRecord>;
  assistent: Map<string, NormalizedRecord>;
  leden: Map<string, NormalizedRecord>;
  trainerIssues: TrainerIssueEntry[];
}

function createBuckets(): LessonBuckets {
  return {
    course: '',
    leiding: new Map(),
    assistent: new Map(),
    leden: new Map(),
    trainerIssues: [],
  };
}

function addRecordToBucket(buckets: LessonBuckets, record: NormalizedRecord) {
  const nameKey = normalizeNameKey(record.name);
  if (record.wasTrainer) {
    buckets.trainerIssues.push({
      name: record.name,
      rowNumber: record.sourceRowNumber,
    });
  }

  if (record.roleCategory === 'leiding') {
    if (!buckets.leiding.has(nameKey)) {
      buckets.leiding.set(nameKey, record);
    }
    return;
  }

  if (record.roleCategory === 'assistent') {
    if (!buckets.assistent.has(nameKey)) {
      buckets.assistent.set(nameKey, record);
    }
    return;
  }

  if (!buckets.leden.has(nameKey)) {
    buckets.leden.set(nameKey, record);
  }
}

function sortRecords(records: NormalizedRecord[]): NormalizedRecord[] {
  return [...records].sort((a, b) => a.name.localeCompare(b.name, 'nl-NL', { sensitivity: 'base' }));
}

function createPlaceholderRecords(coursecode: string, count: number): NormalizedRecord[] {
  return Array.from({ length: count }, () => ({
    coursecode,
    course: '',
    name: '',
    phone1: undefined,
    phone2: undefined,
    phoneDisplay: '',
    phoneNumbers: [],
    birthdate: undefined,
    birthdateRaw: undefined,
    secretImagesFlag: false,
    function: undefined,
    roleCategory: 'leden',
    wasTrainer: false,
    sourceRowNumber: 0,
    isPlaceholder: true,
  }));
}

function resolveCourseName(existing: string, next: string): string {
  if (isFilled(existing)) {
    return existing;
  }
  if (isFilled(next)) {
    return next;
  }
  return existing;
}

export function groupByLesson(records: NormalizedRecord[]): GroupedLessonsResult {
  const lessonMap = new Map<string, LessonBuckets>();

  records.forEach((record) => {
    const key = record.coursecode;
    if (!lessonMap.has(key)) {
      lessonMap.set(key, createBuckets());
    }
    const buckets = lessonMap.get(key)!;
    buckets.course = resolveCourseName(buckets.course, record.course);
    addRecordToBucket(buckets, record);
  });

  const lessons = Array.from(lessonMap.entries())
    .sort(([a], [b]) => a.localeCompare(b, 'nl-NL', { sensitivity: 'base' }))
    .map(([coursecode, buckets]) => {
      const leiding = sortRecords(Array.from(buckets.leiding.values()));
      const assistent = sortRecords(Array.from(buckets.assistent.values()));
      const leden = sortRecords(Array.from(buckets.leden.values()));
      const invallers = createPlaceholderRecords(coursecode, INVALLER_COUNT);
      const staffOrdered = [...leiding, ...assistent, ...invallers];

      const trainerIssues = [...buckets.trainerIssues].sort((a, b) => a.rowNumber - b.rowNumber);

      const hasStaff = leiding.length > 0 || assistent.length > 0;
      const hasMembers = leden.length > 0;
      const shouldSkip = hasStaff && !hasMembers;

      return {
        coursecode,
        course: buckets.course,
        staffOrdered,
        leden,
        trainerIssues,
        shouldSkip,
      } satisfies LessonGroup;
    });

  const emptyLessons: EmptyLessonWarning[] = lessons
    .filter((lesson) => lesson.shouldSkip)
    .map((lesson) => ({ coursecode: lesson.coursecode, course: lesson.course }));

  return { lessons, emptyLessons } satisfies GroupedLessonsResult;
}
