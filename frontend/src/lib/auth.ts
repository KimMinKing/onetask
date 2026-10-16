import { unsubscribePush } from "./push";

const USER_KEY = "onetask_user";

export interface AuthUser {
  username: string;
  is_master: boolean;
}

export function setAuth(user: AuthUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function clearAuth() {
  try {
    await unsubscribePush();
  } catch {
    // Logging out must still work if the push service is unavailable.
  }
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    // Clear local UI state even when offline.
  } finally {
    localStorage.removeItem("onetask_token");
    localStorage.removeItem(USER_KEY);
  }
}

export function isLoggedIn(): boolean {
  return !!getUser();
}

function userStorageKey(key: string): string {
  const username = getUser()?.username ?? "signed-out";
  return `${key}:user:${encodeURIComponent(username)}`;
}

export function readUserStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  const scoped = userStorageKey(key);
  const value = localStorage.getItem(scoped);
  if (value !== null) return value;
  // The earlier single-account local progress belongs to the master account.
  if (getUser()?.is_master) {
    const legacy = localStorage.getItem(key);
    if (legacy !== null) {
      localStorage.setItem(scoped, legacy);
      localStorage.removeItem(key);
      return legacy;
    }
  }
  return null;
}

export function writeUserStorage(key: string, value: string): void {
  localStorage.setItem(userStorageKey(key), value);
}

export function removeUserStorage(key: string): void {
  localStorage.removeItem(userStorageKey(key));
}
