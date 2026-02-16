import { describe, expect, it } from 'vitest';
import { getLessonExcelFilename, getZipFilename } from './excel';

describe('Excel bestandsnamen', () => {
  it('maakt lesbestandsnaam met maandnaam, jaar en cursusnaam', () => {
    expect(getLessonExcelFilename('ABC123', 'Kampvuur', 9, 2025)).toBe(
      'ABC123 Kampvuur september 2025.xlsx',
    );
  });

  it('saniteert spaties en speciale tekens in coursecode en cursusnaam', () => {
    expect(getLessonExcelFilename('Les 1/2', 'Intro & start', 1, 2024)).toBe(
      'Les 1-2 Intro & start januari 2024.xlsx',
    );
  });

  it('maakt zip-bestandsnaam voor maand en jaar', () => {
    expect(getZipFilename(5, 2030)).toBe('presentielijsten_mei-2030.zip');
  });
});
