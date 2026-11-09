import { auth } from "../stores/auth";
const key = (id: string, owner = auth.access?.account_id || "") =>
  "agl.draft." + owner + "." + id;
export function saveDraft(id: string, value: unknown, owner?: string) {
  try {
    sessionStorage.setItem(
      key(id, owner),
      JSON.stringify({ at: Date.now(), value }),
    );
  } catch {}
}
export function readDraft<T>(id: string, owner?: string): T | null {
  try {
    const record = JSON.parse(sessionStorage.getItem(key(id, owner)) || "null");
    return record && Date.now() - record.at < 86400000
      ? (record.value as T)
      : null;
  } catch {
    return null;
  }
}
export function removeDraft(id: string, owner?: string) {
  try {
    sessionStorage.removeItem(key(id, owner));
  } catch {}
}
