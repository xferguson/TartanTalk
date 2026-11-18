import { describe, expect, it } from 'vitest';
import { INSTALL_STORAGE_KEY, readInstallState, writeInstallState } from '../../src/app/installState';

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, v),
  };
}

const throwing: Storage = new Proxy({} as Storage, {
  get() {
    throw new Error('blocked');
  },
});

describe('install state storage', () => {
  it('starts empty', () => {
    expect(readInstallState(memoryStorage())).toEqual({ dismissedAt: null, installed: false });
  });

  it('round-trips a dismissal and an install', () => {
    const s = memoryStorage();
    writeInstallState(s, { dismissedAt: 123, installed: true });
    expect(readInstallState(s)).toEqual({ dismissedAt: 123, installed: true });
  });

  it('ignores corrupt data', () => {
    expect(readInstallState(memoryStorage({ [INSTALL_STORAGE_KEY]: '{nope' }))).toEqual({ dismissedAt: null, installed: false });
    expect(readInstallState(memoryStorage({ [INSTALL_STORAGE_KEY]: '{"dismissedAt":"x","installed":1}' }))).toEqual({
      dismissedAt: null,
      installed: false,
    });
  });

  it('survives unavailable storage', () => {
    expect(readInstallState(throwing)).toEqual({ dismissedAt: null, installed: false });
    expect(() => writeInstallState(throwing, { dismissedAt: 1, installed: false })).not.toThrow();
  });
});
