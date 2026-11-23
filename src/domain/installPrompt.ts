/** How long "Not now" hides the install banner. Kept long so nobody feels nagged. */
export const INSTALL_SNOOZE_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface InstallContext {
  /** Touch-first device. Desktop browsers must never see the banner. */
  isTouchDevice: boolean;
  /** Running as the installed app right now. */
  isStandalone: boolean;
  /** The learner installed it at some point (remembered, so a browser tab stays quiet too). */
  isInstalled: boolean;
  isIos: boolean;
  /** The browser fired `beforeinstallprompt`, so one tap can install. */
  hasNativePrompt: boolean;
  dismissedAt: number | null;
}

/** `native`: show an Install button. `ios`: show Add to Home Screen steps. `null`: show nothing. */
export type InstallMode = 'native' | 'ios' | null;

export function installPromptMode(ctx: InstallContext, now: number): InstallMode {
  if (!ctx.isTouchDevice || ctx.isStandalone || ctx.isInstalled) return null;
  // A dismissal dated in the future means the clock moved; stay quiet rather than nag.
  if (ctx.dismissedAt !== null && now - ctx.dismissedAt < INSTALL_SNOOZE_DAYS * DAY_MS) return null;
  if (ctx.hasNativePrompt) return 'native';
  return ctx.isIos ? 'ios' : null;
}
