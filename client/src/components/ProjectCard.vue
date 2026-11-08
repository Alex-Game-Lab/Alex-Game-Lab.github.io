<script setup lang="ts">
import PageLink from "./PageLink.vue";
import type { Project } from "../lib/types";
import { covers, labels } from "../lib/content";
import StatusBadge from "./StatusBadge.vue";
import Icon from "./Icon.vue";
defineProps<{ project: Project; large?: boolean }>();
</script>
<template>
  <PageLink
    :to="'/projects/' + project.slug + '/'"
    class="project-card"
    :class="{ large }"
    ><div class="card-media">
      <img
        v-if="covers[project.cover]"
        :src="covers[project.cover]"
        :alt="project.title"
        loading="lazy"
        width="960"
        height="600"
      />
      <div v-else class="cover-placeholder">
        <Icon name="game" :size="72" />
      </div>
      <StatusBadge :status="project.status" dot /><span class="round-arrow"
        ><Icon name="out"
      /></span>
    </div>
    <div class="project-card-content">
      <span class="eyebrow">{{ labels[project.kind] || "Проект AGL" }}</span>
      <h3>{{ project.title }}</h3>
      <p>{{ project.summary }}</p>
      <span class="inline-link"
        >Открыть проект <Icon name="arrow" :size="17"
      /></span></div
  ></PageLink>
</template>
