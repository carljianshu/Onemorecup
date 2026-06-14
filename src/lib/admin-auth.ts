const ADMIN_SESSION_KEY = "onemorecup:adminAuthed";

export const ADMIN_PASSWORD = "Isi";

export function isAdminAuthed() {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === "1";
}

export function verifyAdminPassword(password: string) {
  return password === ADMIN_PASSWORD;
}

export function setAdminAuthed() {
  sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
}

export function clearAdminAuthed() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}
