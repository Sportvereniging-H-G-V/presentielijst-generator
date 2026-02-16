export interface RawRecord {
  [key: string]: string | undefined;
}

export interface ColumnMapping {
  coursecode?: string;
  course?: string;
  name2?: string;
  function?: string;
  phone1?: string;
  phone2?: string;
  birthdate?: string;
  secretimages?: string;
}

export type RoleCategory = 'leiding' | 'assistent' | 'leden';

export interface TrainerIssueEntry {
  name: string;
  rowNumber: number;
}

export interface LessonTrainerIssue {
  coursecode: string;
  course: string;
  entries: TrainerIssueEntry[];
}

export interface EmptyLessonWarning {
  coursecode: string;
  course: string;
}

export interface NormalizedRecord {
  coursecode: string;
  course: string;
  name: string;
  phone1?: string;
  phone2?: string;
  phoneDisplay: string;
  phoneNumbers: string[];
  birthdate?: string;
  birthdateRaw?: string;
  secretImagesFlag?: boolean;
  function?: string;
  roleCategory: RoleCategory;
  wasTrainer?: boolean;
  sourceRowNumber: number;
  isPlaceholder?: boolean;
}

export interface LessonGroup {
  coursecode: string;
  course: string;
  staffOrdered: NormalizedRecord[];
  leden: NormalizedRecord[];
  trainerIssues: TrainerIssueEntry[];
  shouldSkip: boolean;
}

export interface GroupedLessonsResult {
  lessons: LessonGroup[];
  emptyLessons: EmptyLessonWarning[];
}
