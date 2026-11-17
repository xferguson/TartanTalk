import { describe, expect, it } from 'vitest';
import { ellsTo, formatLength } from '../../src/domain/length';

describe('length', () => {
  it('converts ells to inches and centimetres', () => {
    expect(ellsTo(1, 'in')).toBe(37);
    expect(ellsTo(1, 'cm')).toBeCloseTo(93.98);
    expect(ellsTo(2.5, 'ell')).toBe(2.5);
  });

  it('formats lengths', () => {
    expect(formatLength(0)).toBe('0 ells');
    expect(formatLength(1)).toBe('1 ell');
    expect(formatLength(1.234)).toBe('1.23 ells');
    expect(formatLength(1, 'cm')).toBe('94 cm');
  });
});
