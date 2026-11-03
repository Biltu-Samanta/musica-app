import { useSyncExternalStore } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type DefaultRepeat = "NO_REPEAT" | "REPEAT_ONE" | "REPEAT_ALL" | "SHUFFLE";

export interface Settings {
  theme: ThemeMode;
  defaultSpeed: number;
  skipInterval: number;
  defaultRepeat: DefaultRepeat;
  sleepFade: boolean;
  sleepFadeSeconds: number;
  resumePlayback: boolean;
  autoplayNext: boolean;
  onboarded: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  defaultSpeed: 1,
  skipInterval: 10,
  defaultRepeat: "NO_REPEAT",
  sleepFade: true,
  sleepFadeSeconds: 15,
  resumePlayback: true,
  autoplayNext: true,
  onboarded: false,
};

const KEY = "her-voice:settings";
const listeners = new Set<() => void>();
let cache: Settings | null = null;

function read(): Settings {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = { ...DEFAULT_SETTINGS, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    cache = { ...DEFAULT_SETTINGS };
  }
  return cache!;
}

export function getSettings() {
  return typeof window === "undefined" ? DEFAULT_SETTINGS : read();
}

export function updateSettings(patch: Partial<Settings>) {
  cache = { ...read(), ...patch };
  localStorage.setItem(KEY, JSON.stringify(cache));
  listeners.forEach((l) => l());
}

export function replaceSettings(next: Partial<Settings>) {
  updateSettings({ ...DEFAULT_SETTINGS, ...next });
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => DEFAULT_SETTINGS,
  );
}
