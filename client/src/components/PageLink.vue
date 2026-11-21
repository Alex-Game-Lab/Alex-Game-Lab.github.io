<script setup lang="ts">
import { RouterLink, useRoute, type RouteLocationRaw } from "vue-router";

withDefaults(defineProps<{
  to: RouteLocationRaw;
  activeClass?: string;
  exactActiveClass?: string;
}>(), {
  activeClass: "router-link-active",
  exactActiveClass: "router-link-exact-active",
});
const route = useRoute();
function isActive(path: string) {
  return route.path === path || (path !== "/" && route.path.startsWith(path));
}
function staysInWorkspace(path: string) {
  return route.path.startsWith("/workspace/") && path.startsWith("/workspace/");
}
</script>

<template>
  <RouterLink :to="to" custom v-slot="{ href, route: target, navigate }">
    <a
      :href="href"
      :class="{ [activeClass]: isActive(target.path), [exactActiveClass]: route.path === target.path }"
      :aria-current="route.path === target.path ? 'page' : undefined"
      @click="staysInWorkspace(target.path) && navigate($event)"
    ><slot /></a>
  </RouterLink>
</template>
