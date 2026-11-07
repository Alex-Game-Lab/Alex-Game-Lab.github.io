<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onBeforeUnmount, useId } from "vue";
import Icon from "./Icon.vue";
const props = defineProps<{
  open: boolean;
  title: string;
  wide?: boolean;
  busy?: boolean;
}>();
const emit = defineEmits<{ "update:open": [value: boolean] }>();
const element = ref<HTMLDialogElement>();
const id = useId();
let previous: HTMLElement | null = null;
function close() {
  if (!props.busy) emit("update:open", false);
}
watch(
  () => props.open,
  async (value) => {
    await nextTick();
    if (value && !element.value?.open) {
      previous = document.activeElement as HTMLElement;
      element.value?.showModal();
    } else if (!value && element.value?.open) {
      element.value.close();
      previous?.focus();
    }
  },
  { immediate: true },
);
onBeforeUnmount(() => element.value?.close());
</script>
<template>
  <Teleport to="body"
    ><dialog
      ref="element"
      class="modal"
      :class="{ wide }"
      :aria-labelledby="id"
      @cancel.prevent="close"
      @click="
        (event) => {
          if (event.target === element) close();
        }
      "
    >
      <header>
        <h2 :id="id">{{ title }}</h2>
        <button
          type="button"
          class="icon-button"
          aria-label="Закрыть"
          :disabled="busy"
          @click="close"
        >
          <Icon name="close" />
        </button>
      </header>
      <div class="modal-content"><slot /></div></dialog
  ></Teleport>
</template>
