import { describe, expect, it } from 'vitest';
import { normalizeBirthdate } from './dates';

describe('normalizeBirthdate', () => {
  it('normaliseert ISO-formaat naar DD-MM-YYYY', () => {
    expect(normalizeBirthdate('1990-05-21')).toBe('21-05-1990');
  });

  it('normaliseert dag-maand-jaar met streepjes', () => {
    expect(normalizeBirthdate('21-5-1990')).toBe('21-05-1990');
  });

  it('herkent gescheiden data met schuine strepen', () => {
    expect(normalizeBirthdate('2001/12/01')).toBe('01-12-2001');
  });

  it('normaliseert data met punten', () => {
    expect(normalizeBirthdate('13.02.2001')).toBe('13-02-2001');
  });

  it('geeft lege string terug bij onbekend formaat', () => {
    expect(normalizeBirthdate('onbekend')).toBe('');
  });

  it('geeft lege string terug voor lege invoer', () => {
    expect(normalizeBirthdate('   ')).toBe('');
  });
});
