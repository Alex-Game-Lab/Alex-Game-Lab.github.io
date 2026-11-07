import { reactive } from "vue";
export const notices = reactive<{ id: number; text: string; error: boolean }[]>(
  [],
);
let next = 0;
export function notify(text: string, error = false) {
  const id = ++next;
  notices.push({ id, text, error });
  setTimeout(() => dismiss(id), error ? 9000 : 5000);
}
export function dismiss(id: number) {
  const index = notices.findIndex((n) => n.id === id);
  if (index >= 0) notices.splice(index, 1);
}
