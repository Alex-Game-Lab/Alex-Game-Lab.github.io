<script setup lang="ts">
import Icon from "../components/Icon.vue";
</script>
<template>
  <div class="container not-found">
    <img src="/assets/agl-orbit-v2.webp" alt="" width="240" height="240" /><span
      class="eyebrow"
      >404 / НЕИЗВЕДАННАЯ ТЕРРИТОРИЯ</span
    >
    <h1>Здесь пока<br />нет этого мира.</h1>
    <p>Похоже, страница переместилась или ссылка оказалась неточной.</p>
    <RouterLink to="/" class="button"
      >На главную<Icon name="arrow"
    /></RouterLink>
  </div>
</template>
