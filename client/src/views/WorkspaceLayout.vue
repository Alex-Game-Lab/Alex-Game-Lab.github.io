<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import PageLink from "../components/PageLink.vue";
import { auth, accountName, login, hasWorkspace, canSome, can } from "../stores/auth";
import Icon from "../components/Icon.vue";
import EmptyState from "../components/EmptyState.vue";
const route = useRoute(),
  open = ref(false);
watch(
  () => route.fullPath,
  () => (open.value = false),
);
const groups = computed(() =>
  [
    {
      title: "Работа",
      items: [
        {
          path: "/workspace/",
          title: "Обзор",
          icon: "dashboard",
          allowed: true,
        },
        {
          path: "/workspace/articles/",
          title: "Публикации",
          icon: "article",
          allowed:
            canSome("articles.create") ||
            canSome("articles.edit") ||
            can("articles.edit_any"),
        },
        {
          path: "/workspace/content/",
          title: "Содержимое сайта",
          icon: "globe",
          allowed: auth.access?.owner,
        },
        {
          path: "/workspace/media/",
          title: "Медиа",
          icon: "image",
          allowed: auth.access?.owner,
        },
        {
          path: "/workspace/projects/",
          title: "Проекты",
          icon: "projects",
          allowed: ["projects.edit","projects.edit_any","projects.create","projects.publish","projects.publish_any","projects.assign","projects.assign_assigned","projects.delete","projects.delete_any"].some(p=>canSome(p)),
        },
        {
          path: "/workspace/reports/",
          title: "Тестирование",
          icon: "comment",
          allowed:
            canSome("reports.create") ||
            canSome("reports.read_all") ||
            canSome("reports.read_assigned"),
        },
      ],
    },
    {
      title: "Управление",
      items: [
        {
          path: "/workspace/users/",
          title: "Участники",
          icon: "users",
          allowed: can("users.read"),
        },
        {
          path: "/workspace/roles/",
          title: "Роли и права",
          icon: "shield",
          allowed: ["roles.create_basic","roles.edit_basic","roles.delete_basic","roles.assign_basic"].some(p=>can(p)),
        },
        {
          path: "/workspace/metrics/",
          title: "Показатели",
          icon: "metrics",
          allowed: canSome("metrics.read") || canSome("players.adjust"),
        },
        {
          path: "/workspace/audit/",
          title: "Журнал",
          icon: "clock",
          allowed: can("audit.read"),
        },
      ],
    },
  ]
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.allowed),
    }))
    .filter((group) => group.items.length),
);
</script>
<template>
  <div class="container workspace-page">
    <div v-if="auth.loading" class="loading-state">
      <Icon name="loading" class="spin" />Открываем пространство…
    </div>
    <EmptyState
      v-else-if="!auth.user"
      title="Войти в рабочее пространство"
      text="Открой доступные тебе инструменты с аккаунтом AGL ID."
      icon="dashboard"
      ><button class="button" @click="login()">Войти<Icon name="out" /></button
    ></EmptyState>
    <EmptyState
      v-else-if="!hasWorkspace"
      title="Твой профиль готов"
      text="Рабочие инструменты появятся после назначения роли или доступа к проекту."
      icon="shield"
      ><PageLink to="/profile/" class="button secondary"
        >Мой профиль<Icon name="user" /></PageLink
    ></EmptyState>
    <div v-else class="workspace-layout">
      <aside class="workspace-sidebar">
        <div class="workspace-brand">
          <span class="eyebrow">AGL STUDIO</span>
          <h2>Рабочее пространство</h2>
        </div>
        <button
          class="workspace-nav-toggle"
          :aria-expanded="open"
          aria-controls="workspace-navigation"
          @click="open = !open"
        >
          <Icon name="menu" /><span>{{
            route.meta.title || "Выбрать раздел"
          }}</span
          ><Icon :name="open ? 'close' : 'down'" />
        </button>
        <nav
          id="workspace-navigation"
          aria-label="Рабочие инструменты"
          :class="{ 'is-open': open }"
        >
          <div
            v-for="group in groups"
            :key="group.title"
            class="workspace-nav-group"
          >
            <span>{{ group.title }}</span
            ><PageLink
              v-for="item in group.items"
              :key="item.path"
              :to="item.path"
              :class="{
                active:
                  item.path === '/workspace/'
                    ? route.path === item.path
                    : route.path.startsWith(item.path),
              }"
              ><Icon :name="item.icon" />{{ item.title }}</PageLink
            >
          </div>
        </nav>
        <div class="workspace-identity">
          <span class="avatar small"
            ><Icon :name="auth.access?.owner ? 'crown' : 'user'"
          /></span>
          <div>
            <strong>{{ accountName }}</strong
            ><span>{{
              auth.access?.owner
                ? "Владелец"
                : auth.access?.roles.map((role) => role.title).join(", ") ||
                  "Участник"
            }}</span>
          </div>
        </div>
      </aside>
      <div class="workspace-main"><RouterView /></div>
    </div>
  </div>
</template>
