import { describe, expect, it } from 'vitest';
import { isThemePref, resolveTheme, themeAttribute } from '../../src/domain/theme';

describe('theme preference', () => {
  it('follows the system when set to system', () => {
    expect(resolveTheme('system', true)).toBe('night');
    expect(resolveTheme('system', false)).toBe('day');
  });

  it('lets an explicit choice override the system', () => {
    expect(resolveTheme('day', true)).toBe('day');
    expect(resolveTheme('night', false)).toBe('night');
  });

  it('maps preferences to the root data-theme attribute', () => {
    expect(themeAttribute('system')).toBeNull();
    expect(themeAttribute('day')).toBe('light');
    expect(themeAttribute('night')).toBe('dark');
  });

  it('validates stored values', () => {
    expect(isThemePref('night')).toBe(true);
    expect(isThemePref('purple')).toBe(false);
    expect(isThemePref(undefined)).toBe(false);
  });
});
