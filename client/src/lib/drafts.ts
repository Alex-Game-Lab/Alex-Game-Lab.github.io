import { auth } from "../stores/auth";
const key = (id: string) =>
  "agl.draft." + (auth.access?.account_id || "") + "." + id;
export function saveDraft(id: string, value: unknown) {
  try {
    sessionStorage.setItem(key(id), JSON.stringify({ at: Date.now(), value }));
  } catch {}
}
export function readDraft<T>(id: string): T | null {
  try {
    const record = JSON.parse(sessionStorage.getItem(key(id)) || "null");
    return record && Date.now() - record.at < 86400000
      ? (record.value as T)
      : null;
  } catch {
    return null;
  }
}
export function removeDraft(id: string) {
  try {
    sessionStorage.removeItem(key(id));
  } catch {}
}
