import { useCallback, useEffect, useState } from 'react';
import { installPromptMode, type InstallMode } from '../domain/installPrompt';
import { readInstallState, writeInstallState, type InstallState } from './installState';

/** Chromium's install event; not in lib.dom because it is not yet a standard. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function detectStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

function detectTouch(): boolean {
  return window.matchMedia('(pointer: coarse)').matches;
}

function detectIos(): boolean {
  // iPadOS reports itself as a Mac, so tell it apart by touch support.
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export interface InstallPrompt {
  mode: InstallMode;
  /** Opens the browser's install dialog (native mode). */
  install: () => Promise<void>;
  /** "Not now": hide for two weeks. */
  dismiss: () => void;
}

export function useInstallPrompt(now: () => number = Date.now): InstallPrompt {
  const [saved, setSaved] = useState<InstallState>(() => {
    const storage = safeStorage();
    return storage ? readInstallState(storage) : { dismissedAt: null, installed: false };
  });
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(detectStandalone);

  const save = useCallback((next: InstallState) => {
    setSaved(next);
    const storage = safeStorage();
    if (storage) writeInstallState(storage, next);
  }, []);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault(); // keep the event so our own button can trigger it
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      save({ ...saved, installed: true });
    };
    const media = window.matchMedia('(display-mode: standalone)');
    const onDisplayMode = () => setStandalone(detectStandalone());
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    media.addEventListener('change', onDisplayMode);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      media.removeEventListener('change', onDisplayMode);
    };
  }, [save, saved]);

  const dismiss = useCallback(() => save({ ...saved, dismissedAt: now() }), [save, saved, now]);

  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null); // the event can only be used once
    if (outcome === 'accepted') save({ ...saved, installed: true });
    else save({ ...saved, dismissedAt: now() });
  }, [deferred, save, saved, now]);

  const mode = installPromptMode(
    {
      isTouchDevice: detectTouch(),
      isStandalone: standalone,
      isInstalled: saved.installed,
      isIos: detectIos(),
      hasNativePrompt: deferred !== null,
      dismissedAt: saved.dismissedAt,
    },
    now(),
  );
  return { mode, install, dismiss };
}
