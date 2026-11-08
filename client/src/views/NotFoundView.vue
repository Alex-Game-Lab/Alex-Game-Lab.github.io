<script setup lang="ts">
import PageLink from "../components/PageLink.vue";
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
    <PageLink to="/" class="button"
      >На главную<Icon name="arrow"
    /></PageLink>
  </div>
</template>
