<script setup lang="ts">
import PageLink from "../components/PageLink.vue";
import { useRoute } from "vue-router";
import { watch } from "vue";
import { api } from "../lib/api";
import { resource } from "../lib/resource";
import { covers, date, readingTime } from "../lib/content";
import type { Article } from "../lib/types";
import MarkdownContent from "../components/MarkdownContent.vue";
import LoadState from "../components/LoadState.vue";
import Icon from "../components/Icon.vue";
import { auth, can } from "../stores/auth";
const route = useRoute();
const { data, loading, error, reload } = resource(
  () => api<Article>("/news/" + encodeURIComponent(String(route.params.slug))),
  [() => route.params.slug],
);
watch(data, (value) => {
  if (value) document.title = value.title + " · AGL";
});
async function share() {
  try {
    await navigator.clipboard.writeText(location.href);
    (await import("../stores/notices")).notify("Ссылка скопирована");
  } catch {}
}
</script>
<template>
  <div class="container page-container">
    <PageLink to="/news/" class="back-link"
      ><Icon name="back" :size="17" />Все публикации</PageLink
    ><LoadState :loading="loading" :error="error" @retry="reload"
      ><article v-if="data" class="article-page">
        <header>
          <span class="eyebrow">ДНЕВНИК КОМАНДЫ</span>
          <h1>{{ data.title }}</h1>
          <p class="article-lead">{{ data.excerpt }}</p>
          <div class="article-byline">
            <span class="avatar small"><Icon name="user" :size="18" /></span
            ><strong>{{ data.author }}</strong
            ><span>{{ date(data.published_at) }}</span
            ><span>{{ readingTime(data.body) }} мин чтения</span
            ><button
              class="icon-button"
              aria-label="Скопировать ссылку на статью"
              @click="share"
            >
              <Icon name="link" :size="18" />
            </button>
          </div>
        </header>
        <img
          v-if="covers[data.cover]"
          class="article-cover"
          :src="covers[data.cover]"
          alt=""
          width="1280"
          height="720"
        /><MarkdownContent :body="data.body" :format="data.format || 'plain'" />
        <div class="article-end">
          <PageLink
            v-if="data.project_slug"
            :to="'/projects/' + data.project_slug + '/'"
            class="button secondary"
            >О проекте<Icon name="out" /></PageLink
          ><PageLink
            v-if="auth.user && (auth.access?.owner || can('articles.edit_any'))"
            :to="'/workspace/articles/' + data.id + '/'"
            class="inline-link"
            ><Icon name="edit" :size="17" />Редактировать</PageLink
          ><button class="inline-link" @click="share">
            <Icon name="copy" :size="17" />Поделиться
          </button>
        </div>
      </article></LoadState
    >
  </div>
</template>
