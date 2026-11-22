/** Local-only memory of the install banner (no cookies are sent anywhere). */
export const INSTALL_STORAGE_KEY = 'tt-install';

export interface InstallState {
  dismissedAt: number | null;
  installed: boolean;
}

const EMPTY: InstallState = { dismissedAt: null, installed: false };

export function readInstallState(storage: Storage): InstallState {
  try {
    const raw = storage.getItem(INSTALL_STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return EMPTY;
    const { dismissedAt, installed } = parsed as Record<string, unknown>;
    return {
      dismissedAt: typeof dismissedAt === 'number' ? dismissedAt : null,
      installed: installed === true,
    };
  } catch {
    // Private mode or blocked storage: behave as if nothing was stored.
    return EMPTY;
  }
}

export function writeInstallState(storage: Storage, state: InstallState): void {
  try {
    storage.setItem(INSTALL_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // The banner still works for this session.
  }
}
