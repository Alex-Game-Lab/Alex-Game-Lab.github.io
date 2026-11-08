<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter, type RouteLocationRaw } from "vue-router";

const props = withDefaults(defineProps<{
  to: RouteLocationRaw;
  activeClass?: string;
  exactActiveClass?: string;
}>(), {
  activeClass: "router-link-active",
  exactActiveClass: "router-link-exact-active",
});
const router = useRouter();
const route = useRoute();
const target = computed(() => router.resolve(props.to));
const exact = computed(() => route.path === target.value.path);
const active = computed(() => exact.value ||
  (target.value.path !== "/" && route.path.startsWith(target.value.path)));
</script>

<template>
  <a :href="target.href"
    :class="{ [activeClass]: active, [exactActiveClass]: exact }"
    :aria-current="exact ? 'page' : undefined"><slot /></a>
</template>
