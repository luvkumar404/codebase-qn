export interface StoredRepo {
  repoId: string;
  url: string;
  addedAt: string;
}

export interface ActiveRepo {
  repoId: string;
  url: string;
}

export const STORAGE_KEYS = {
  ACTIVE_REPO: "cqa.activeRepo",
  REPOS: "cqa.repos",
} as const;

export function getStoredItem<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") {
    return defaultValue;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

export function setStoredItem<T>(key: string, value: T): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeStoredItem(key: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
