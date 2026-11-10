<script setup lang="ts">
import projectSnapshot from "../content/projects.json";
import {usePage,usePageMeta} from "../lib/pages";
import ContentBlocks from "../components/ContentBlocks.vue";
import PublicHero from "../components/PublicHero.vue";
const page=usePage("agl","projects");usePageMeta(page);
import PageLink from "../components/PageLink.vue";
import { ref, computed } from "vue";
import { api } from "../lib/api";
import { resource } from "../lib/resource";
import type { Page, Project } from "../lib/types";
import ProjectCard from "../components/ProjectCard.vue";
import LoadState from "../components/LoadState.vue";
import EmptyState from "../components/EmptyState.vue";
import Icon from "../components/Icon.vue";
const { data, loading, error, reload } = resource(() =>
  api<Page<Project>>("/projects?limit=50"),[],projectSnapshot as unknown as Page<Project>,
);
const search = ref(""),
  filter = ref("all");
const filtered = computed(
  () =>
    data.value?.items.filter(
      (p) =>
        (filter.value === "all" || p.kind === filter.value) &&
        (p.title + " " + p.summary)
          .toLocaleLowerCase("ru")
          .includes(search.value.toLocaleLowerCase("ru")),
    ) || [],
);
</script>
<template>
  <div class="container page-container public-page">
    <PublicHero :page="page" compact/>
    <div class="catalog-tools">
      <div class="filter-tabs" aria-label="Тип проекта">
        <button
          v-for="[key, title] in [
            ['all', 'Все проекты'],
            ['game', 'Игры'],
            ['software', 'Приложения'],
            ['web', 'Веб'],
          ]"
          :key="key"
          :class="{ active: filter === key }"
          @click="filter = key"
        >
          {{ title }}
        </button>
      </div>
      <label class="search-field"
        ><Icon name="search" :size="18" /><input
          v-model="search"
          type="search"
          placeholder="Найти проект"
          aria-label="Найти проект"
      /></label>
    </div>
    <LoadState :stale="!!data" :loading="loading" :error="error" @retry="reload"
      ><div v-if="filtered.length" class="project-grid">
        <ProjectCard
          v-for="project in filtered"
          :key="project.slug"
          :project="project"
        />
      </div>
      <EmptyState
        v-else
        title="Здесь пока тихо"
        text="Попробуй другой запрос или посмотри все проекты."
        icon="projects"
        ><button
          class="button secondary"
          @click="
            filter = 'all';
            search = '';
          "
        >
          Сбросить фильтры
        </button></EmptyState
      >
      <p class="catalog-count">
        Показано {{ filtered.length }} из
        {{ data?.total ?? data?.items.length ?? 0 }}
      </p></LoadState
    >
    <ContentBlocks :blocks="page.sections"/>

  </div>
</template>
