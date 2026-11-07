<script setup lang="ts">
import Icon from "./Icon.vue";
withDefaults(defineProps<{ title: string; text?: string; icon?: string }>(), {
  icon: "orbit",
});
</script>
<template>
  <section class="empty-state">
    <span class="empty-icon"><Icon :name="icon" :size="30" /></span>
    <h2>{{ title }}</h2>
    <p v-if="text">{{ text }}</p>
    <div v-if="$slots.default" class="button-row"><slot /></div>
  </section>
</template>
