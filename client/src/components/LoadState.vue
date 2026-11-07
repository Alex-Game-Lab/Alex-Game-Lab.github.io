<script setup lang="ts">
import Icon from "./Icon.vue";
defineProps<{ loading?: boolean; error?: string }>();
defineEmits<{ retry: [] }>();
</script>
<template>
  <div v-if="loading" class="loading-state" role="status">
    <Icon name="loading" class="spin" /> Загружаем…
  </div>
  <div v-else-if="error" class="notice notice-error" role="alert">
    <Icon name="warning" />
    <div>
      <strong>Не удалось загрузить данные</strong>
      <p>{{ error }}</p>
    </div>
    <button
      type="button"
      class="button small secondary"
      @click="$emit('retry')"
    >
      Повторить
    </button>
  </div>
  <slot v-else />
</template>
