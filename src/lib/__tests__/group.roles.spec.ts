import { describe, expect, it } from 'vitest';
import { groupByLesson } from '../group';
import { normalizeRecords } from '../mapping';
import type { ColumnMapping, RawRecord } from '../types';

describe('grouping and role handling', () => {
  const mapping: ColumnMapping = {
    coursecode: 'coursecode',
    course: 'course',
    name2: 'name2',
    function: 'function',
  };

  const rawRows: RawRecord[] = [
    { coursecode: 'L01', course: 'Bootcamp', name2: 'Alice Leiding', function: 'Leiding' },
    { coursecode: 'L01', course: 'Bootcamp', name2: 'Bob Assistent', function: 'Hulpleiding' },
    { coursecode: 'L01', course: 'Bootcamp', name2: 'Charlie Trainer', function: 'Trainer' },
    { coursecode: 'L01', course: 'Bootcamp', name2: 'Dana Lid', function: '' },
  ];

  it('maps functions to categories and collects trainer warnings', () => {
    const normalization = normalizeRecords(rawRows, mapping);
    expect(normalization.records).toHaveLength(4);
    const leader = normalization.records.find((record) => record.name === 'Alice Leiding');
    const assistant = normalization.records.find((record) => record.name === 'Bob Assistent');
    const trainer = normalization.records.find((record) => record.name === 'Charlie Trainer');
    const member = normalization.records.find((record) => record.name === 'Dana Lid');

    expect(leader?.roleCategory).toBe('leiding');
    expect(assistant?.roleCategory).toBe('assistent');
    expect(trainer?.roleCategory).toBe('leiding');
    expect(trainer?.wasTrainer).toBe(true);
    expect(member?.roleCategory).toBe('leden');

    expect(normalization.trainerWarnings).toHaveLength(1);
    const trainerWarning = normalization.trainerWarnings[0];
    expect(trainerWarning.coursecode).toBe('L01');
    expect(trainerWarning.entries).toHaveLength(1);
    expect(trainerWarning.entries[0].name).toBe('Charlie Trainer');
  });

  it('orders staff correctly and adds three placeholder invallers', () => {
    const normalization = normalizeRecords(rawRows, mapping);
    const { lessons, emptyLessons } = groupByLesson(normalization.records);
    expect(emptyLessons).toHaveLength(0);
    expect(lessons).toHaveLength(1);
    const lesson = lessons[0];

    const staffNames = lesson.staffOrdered
      .filter((person) => !person.isPlaceholder)
      .map((person) => person.name);
    expect(staffNames).toEqual(['Alice Leiding', 'Charlie Trainer', 'Bob Assistent']);

    const placeholders = lesson.staffOrdered.filter((person) => person.isPlaceholder);
    expect(placeholders).toHaveLength(3);

    const ledenNames = lesson.leden.map((person) => person.name);
    expect(ledenNames).toEqual(['Dana Lid']);

    expect(lesson.trainerIssues).toHaveLength(1);
    expect(lesson.trainerIssues[0].name).toBe('Charlie Trainer');
    expect(lesson.shouldSkip).toBe(false);
  });

  it('marks lessons with staff but no leden as skip', () => {
    const staffOnlyRows: RawRecord[] = [
      { coursecode: 'L02', course: 'Circuit', name2: 'Eva Leiding', function: 'Leiding' },
      { coursecode: 'L02', course: 'Circuit', name2: 'Frank Assistent', function: 'Hulpleiding' },
    ];
    const normalization = normalizeRecords(staffOnlyRows, mapping);
    const { lessons, emptyLessons } = groupByLesson(normalization.records);

    expect(lessons).toHaveLength(1);
    const lesson = lessons[0];

    expect(lesson.leden).toHaveLength(0);
    expect(lesson.shouldSkip).toBe(true);
    expect(emptyLessons).toEqual([
      {
        coursecode: 'L02',
        course: 'Circuit',
      },
    ]);
  });
});
