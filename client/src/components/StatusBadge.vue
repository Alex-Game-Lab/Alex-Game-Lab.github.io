<script setup lang="ts">
import { labels } from "../lib/content";
defineProps<{ status: string; dot?: boolean }>();
</script>
<template>
  <span class="badge" :class="'badge-' + status"
    ><i v-if="dot" aria-hidden="true"></i>{{ labels[status] || status }}</span
  >
</template>
