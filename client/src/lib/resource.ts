import { ref, shallowRef, watch, type WatchSource } from "vue";
import { errorMessage } from "./errors";
export function resource<T>(
  load: () => Promise<T>,
  sources: WatchSource[] = [],
  initial: T | null = null,
) {
  const data = shallowRef<T | null>(initial),
    loading = ref(true),
    error = ref("");
  let seq = 0;
  async function reload() {
    const n = ++seq;
    loading.value = true;
    error.value = "";
    try {
      const value = await load();
      if (n === seq) data.value = value;
    } catch (e) {
      if (n === seq) {error.value = errorMessage(e);if((e as any)?.status===404)data.value=null;}
    } finally {
      if (n === seq) loading.value = false;
    }
  }
  if (sources.length) watch(sources, reload, { immediate: true });
  else void reload();
  return { data, loading, error, reload };
}
