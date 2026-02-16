import { describe, expect, it } from 'vitest';
import { formatPhones } from '../phones';

describe('phone formatting', () => {
  it('joins two phone numbers with a comma', () => {
    expect(formatPhones('0612345678', '0698765432')).toBe('0612345678, 0698765432');
  });

  it('returns a single phone number when only one is provided', () => {
    expect(formatPhones('0612345678', '')).toBe('0612345678');
    expect(formatPhones('', '0698765432')).toBe('0698765432');
  });

  it('strips brackets and trims whitespace', () => {
    expect(formatPhones(' [0612345678] ', '  ')).toBe('0612345678');
  });

  it('returns an empty string when no numbers are provided', () => {
    expect(formatPhones('', '')).toBe('');
  });
});
