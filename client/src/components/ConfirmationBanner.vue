<script setup lang="ts">
import { freshPassword, login } from "../stores/auth";
import Icon from "./Icon.vue";
const emit = defineEmits<{ prepare: [] }>();
function confirm() {
  emit("prepare");
  void login("confirm");
}
</script>
<template>
  <div v-if="!freshPassword" class="notice confirmation-banner">
    <Icon name="lock" />
    <div>
      <strong>Подтверди важные действия</strong>
      <p>Один вход с паролем откроет изменение прав и настроек на 5 минут.</p>
    </div>
    <button type="button" class="button small" @click="confirm">
      Подтвердить паролем<Icon name="out" :size="16" />
    </button>
  </div>
  <div v-else class="confirmation-ready">
    <Icon name="checks" :size="16" /> Изменение прав подтверждено паролем
  </div>
</template>
