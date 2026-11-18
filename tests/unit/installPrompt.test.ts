import { describe, expect, it } from 'vitest';
import {
  INSTALL_SNOOZE_DAYS,
  installPromptMode,
  type InstallContext,
} from '../../src/domain/installPrompt';

const DAY = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 10, 18);

const base: InstallContext = {
  isTouchDevice: true,
  isStandalone: false,
  isInstalled: false,
  isIos: false,
  hasNativePrompt: true,
  dismissedAt: null,
};

describe('installPromptMode', () => {
  it('offers the native install button on a touch device with a browser prompt', () => {
    expect(installPromptMode(base, now)).toBe('native');
  });

  it('shows Add to Home Screen steps on iOS, which has no native prompt', () => {
    expect(installPromptMode({ ...base, isIos: true, hasNativePrompt: false }, now)).toBe('ios');
  });

  it('never shows on desktop', () => {
    expect(installPromptMode({ ...base, isTouchDevice: false }, now)).toBeNull();
    expect(installPromptMode({ ...base, isTouchDevice: false, isIos: true, hasNativePrompt: false }, now)).toBeNull();
  });

  it('stays quiet when running as the installed app', () => {
    expect(installPromptMode({ ...base, isStandalone: true }, now)).toBeNull();
  });

  it('stays quiet once the app was installed, even when opened in a browser tab', () => {
    expect(installPromptMode({ ...base, isInstalled: true }, now)).toBeNull();
  });

  it('shows nothing when the browser cannot install and it is not iOS', () => {
    expect(installPromptMode({ ...base, hasNativePrompt: false }, now)).toBeNull();
  });

  it('snoozes for two weeks after a dismissal, then asks again', () => {
    expect(INSTALL_SNOOZE_DAYS).toBe(14);
    const dismissedAt = now - 13 * DAY;
    expect(installPromptMode({ ...base, dismissedAt }, now)).toBeNull();
    expect(installPromptMode({ ...base, dismissedAt: now - 14 * DAY }, now)).toBe('native');
  });

  it('treats a dismissal timestamp from the future (clock change) as still snoozed', () => {
    expect(installPromptMode({ ...base, dismissedAt: now + DAY }, now)).toBeNull();
  });
});
