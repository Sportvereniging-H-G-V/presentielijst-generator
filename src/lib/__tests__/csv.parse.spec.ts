import { describe, expect, it } from 'vitest';
import { parseCsvFromString } from '../csv';

describe('csv parsing', () => {
  it('detects comma delimiters automatically', async () => {
    const csv = 'coursecode,course,name2,function\nL1,Testles,Alice,Leiding\n';
    const result = await parseCsvFromString(csv);
    expect(result.fields).toEqual(['coursecode', 'course', 'name2', 'function']);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].coursecode).toBe('L1');
    expect(result.data[0].name2).toBe('Alice');
    expect(result.mapping.coursecode).toBe('coursecode');
    expect(result.mapping.course).toBe('course');
    expect(result.mapping.name2).toBe('name2');
    expect(result.missingRequiredFields).toEqual([]);
  });

  it('fills missing values when too few fields are present', async () => {
    const csv = 'coursecode;course;name2;function\nL2;Bootcamp;\n';
    const result = await parseCsvFromString(csv);
    expect(result.data).toHaveLength(1);
    const row = result.data[0];
    expect(row.coursecode).toBe('L2');
    expect(row.course).toBe('Bootcamp');
    expect(row.name2).toBe('');
    expect(row.function).toBe('');
    expect(result.missingRequiredFields).toEqual([]);
  });

  it('suppresses TooFewFields warnings when only function is missing', async () => {
    const csv = 'coursecode;course;name2;function\nL3;Lesnaam;Bob\n';
    const result = await parseCsvFromString(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.incompleteFieldErrors).toHaveLength(0);
    expect(result.data[0].function).toBe('');
    expect(result.missingRequiredFields).toEqual([]);
  });

  it('reports missing required columns', async () => {
    const csv = 'coursecode;name2\nL4;Charlie\n';
    const result = await parseCsvFromString(csv);
    expect(result.fields).toEqual(['coursecode', 'name2']);
    expect(result.missingRequiredFields).toEqual(['course']);
  });
});
