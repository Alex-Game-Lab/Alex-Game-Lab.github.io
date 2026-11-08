<script setup lang="ts">
import PageLink from "../components/PageLink.vue";
import { auth, login, hasWorkspace, canSome, can } from "../stores/auth";
import Icon from "../components/Icon.vue";
import EmptyState from "../components/EmptyState.vue";
const items = () => [
  ["/workspace/", "Обзор", "dashboard", true],
  [
    "/workspace/articles/",
    "Публикации",
    "article",
    canSome("articles.create") ||
      canSome("articles.edit") ||
      can("articles.edit_any"),
  ],
  [
    "/workspace/projects/",
    "Проекты",
    "projects",
    canSome("projects.edit") || can("projects.manage"),
  ],
  [
    "/workspace/reports/",
    "Тестирование",
    "comment",
    canSome("reports.create") ||
      canSome("reports.read_all") ||
      canSome("reports.read_assigned"),
  ],
  ["/workspace/users/", "Участники", "users", can("users.read")],
  [
    "/workspace/roles/",
    "Роли и права",
    "shield",
    can("roles.manage_basic") || can("roles.manage"),
  ],
  [
    "/workspace/metrics/",
    "Показатели",
    "metrics",
    canSome("metrics.read") || canSome("players.adjust"),
  ],
  ["/workspace/audit/", "Журнал", "clock", can("audit.read")],
];
</script>
<template>
  <div class="container workspace-page">
    <div v-if="auth.loading" class="loading-state">
      <Icon name="loading" class="spin" />Открываем пространство…
    </div>
    <EmptyState
      v-else-if="!auth.user"
      title="Здесь работает команда"
      text="Войди в свой аккаунт, чтобы открыть доступные инструменты."
      icon="dashboard"
      ><button class="button" @click="login()">
        Войти<Icon name="out" /></button></EmptyState
    ><EmptyState
      v-else-if="!hasWorkspace"
      title="Твой профиль готов"
      text="Рабочие инструменты появятся, когда тебе назначат роль или доступ к проекту."
      icon="shield"
      ><PageLink to="/profile/" class="button secondary"
        >Мой профиль<Icon name="user" /></PageLink
    ></EmptyState>
    <div v-else class="workspace-layout">
      <aside class="workspace-sidebar">
        <div class="workspace-brand">
          <span class="eyebrow">AGL / ВНУТРИ</span>
          <h2>Рабочее<br />пространство</h2>
        </div>
        <nav aria-label="Рабочие инструменты">
          <template v-for="item in items()" :key="String(item[0])"
            ><PageLink
              v-if="item[3]"
              :to="String(item[0])"
              :exact-active-class="
                item[0] === '/workspace/' ? 'active' : 'exact'
              "
              :class="{
                active:
                  $route.path.startsWith(String(item[0])) &&
                  item[0] !== '/workspace/',
              }"
              ><Icon :name="String(item[2])" :size="18" />{{
                item[1]
              }}</PageLink
            ></template
          >
        </nav>
        <div class="workspace-identity">
          <span class="avatar small"
            ><Icon :name="auth.access?.owner ? 'crown' : 'user'" :size="17"
          /></span>
          <div>
            <strong>{{ auth.profile?.display_name || "Участник AGL" }}</strong
            ><span>{{
              auth.access?.owner
                ? "Owner"
                : auth.access?.roles.map((r) => r.title).join(", ") ||
                  "Участник"
            }}</span>
          </div>
        </div>
      </aside>
      <div class="workspace-main"><RouterView /></div>
    </div>
  </div>
</template>
