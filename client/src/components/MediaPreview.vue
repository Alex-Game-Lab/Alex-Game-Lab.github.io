<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from "vue";
import { accessToken } from "../stores/auth";
import { API } from "../lib/content";
import { mediaUrl } from "../lib/media";
import type { MediaAsset } from "../lib/media";
const props = defineProps<{ asset: MediaAsset }>(),
  src = ref("");
let blob = "",
  request = 0;
const release = () => {
  if (blob) URL.revokeObjectURL(blob);
  blob = "";
};
watch(
  () => [props.asset.id, props.asset.published],
  async () => {
    const current = ++request;
    release();
    src.value = "";
    if (props.asset.published) {
      src.value = mediaUrl(props.asset.id);
      return;
    }
    try {
      const token = await accessToken();
      const response = await fetch(
        API + "/v1/workspace/media/" + props.asset.id,
        {
          headers: { Authorization: "Bearer " + token },
          credentials: "omit",
          cache: "no-store",
        },
      );
      if (!response.ok) return;
      const data = await response.blob();
      if (current !== request) return;
      blob = URL.createObjectURL(data);
      src.value = blob;
    } catch {}
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  ++request;
  release();
});
</script>
<template>
  <img
    v-if="src"
    :src="src"
    :alt="asset.alt || asset.title"
    :width="asset.width"
    :height="asset.height"
    loading="lazy"
  /><span v-else class="muted">{{ asset.title }}</span>
</template>
