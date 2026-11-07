<script setup lang="ts">
import Icon from "./Icon.vue";
defineProps<{ offset: number; limit: number; count: number; total?: number }>();
defineEmits<{ change: [offset: number] }>();
</script>
<template>
  <nav
    v-if="offset > 0 || count >= limit"
    class="pagination"
    aria-label="Страницы"
  >
    <button
      class="button secondary small"
      :disabled="offset === 0"
      @click="$emit('change', Math.max(0, offset - limit))"
    >
      <Icon name="left" />Назад</button
    ><span
      >{{ Math.floor(offset / limit) + 1
      }}<template v-if="total !== undefined">
        / {{ Math.max(1, Math.ceil(total / limit)) }}</template
      ></span
    ><button
      class="button secondary small"
      :disabled="total !== undefined ? offset + limit >= total : count < limit"
      @click="$emit('change', offset + limit)"
    >
      Дальше<Icon name="right" />
    </button>
  </nav>
</template>
