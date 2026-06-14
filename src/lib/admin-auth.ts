const ADMIN_TOKEN_KEY = "onemorecup:adminToken";
const ADMIN_EXPIRES_KEY = "onemorecup:adminExpiresAt";

export function isAdminAuthed() {
  if (typeof window === "undefined") return false;
  const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  const expiresAt = sessionStorage.getItem(ADMIN_EXPIRES_KEY);
  if (!token || !expiresAt) return false;
  return Date.now() < new Date(expiresAt).getTime();
}

export function getAdminToken() {
  if (!isAdminAuthed()) return null;
  return sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminSession(token: string, expiresAt: string) {
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  sessionStorage.setItem(ADMIN_EXPIRES_KEY, expiresAt);
}

export function clearAdminAuthed() {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  sessionStorage.removeItem(ADMIN_EXPIRES_KEY);
}
