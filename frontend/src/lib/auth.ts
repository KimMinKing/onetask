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

export function clearAuth() {
  localStorage.removeItem("onetask_token");
  localStorage.removeItem(USER_KEY);
  void fetch("/api/auth/logout", { method: "POST" });
}

export function isLoggedIn(): boolean {
  return !!getUser();
}
