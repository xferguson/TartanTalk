/** One Scots ell is 37 inches. */
export const INCHES_PER_ELL = 37;
export const CM_PER_INCH = 2.54;

export type LengthUnit = 'ell' | 'in' | 'cm';

export function ellsTo(ells: number, unit: LengthUnit): number {
  if (unit === 'ell') return ells;
  const inches = ells * INCHES_PER_ELL;
  return unit === 'in' ? inches : inches * CM_PER_INCH;
}

export function formatLength(ells: number, unit: LengthUnit = 'ell'): string {
  const value = ellsTo(ells, unit);
  if (unit === 'ell') {
    const rounded = Math.round(value * 100) / 100;
    return `${rounded} ${rounded === 1 ? 'ell' : 'ells'}`;
  }
  return `${Math.round(value)} ${unit}`;
}
