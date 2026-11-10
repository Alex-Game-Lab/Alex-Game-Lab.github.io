<script setup lang="ts">
import Icon from "./Icon.vue";
defineProps<{ loading?: boolean; error?: string; stale?: boolean }>();
defineEmits<{ retry: [] }>();
</script>
<template>
  <div v-if="loading&&!stale" class="loading-state" role="status">
    <Icon name="loading" class="spin" /> Загружаем…
  </div>
  <div v-else-if="error&&!stale" class="notice notice-error" role="alert">
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
  <template v-else><div v-if="error&&stale" class="notice" role="status"><Icon name="warning"/><p>Не удалось обновить данные. Показана последняя опубликованная редакция.</p><button class="button secondary" @click="$emit('retry')">Повторить</button></div><slot/></template>
</template>
