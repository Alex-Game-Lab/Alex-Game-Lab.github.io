<script setup lang="ts">
import PageLink from "../components/PageLink.vue";
import { ref, watch } from "vue";
import { api } from "../lib/api";
import { resource } from "../lib/resource";
import { canSome } from "../stores/auth";
import type { Page, Article } from "../lib/types";
import ArticleCard from "../components/ArticleCard.vue";
import LoadState from "../components/LoadState.vue";
import EmptyState from "../components/EmptyState.vue";
import Pagination from "../components/Pagination.vue";
import Icon from "../components/Icon.vue";
const offset = ref(0),
  search = ref(""),
  query = ref(""),
  limit = 9;
let timer: ReturnType<typeof setTimeout>;
watch(search, (value) => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    offset.value = 0;
    query.value = value;
  }, 350);
});
const { data, loading, error, reload } = resource(
  () =>
    api<Page<Article>>(
      "/news?limit=" +
        limit +
        "&offset=" +
        offset.value +
        "&search=" +
        encodeURIComponent(query.value),
    ),
  [offset, query],
);
</script>
<template>
  <div class="container page-container">
    <header class="page-heading split">
      <div>
        <span class="eyebrow">ДНЕВНИК ALEX GAME LAB</span>
        <h1>За кулисами<br />новых миров<span class="accent">.</span></h1>
        <p>
          Новости проектов, заметки о разработке и идеи, которыми хочется
          поделиться.
        </p>
      </div>
      <PageLink
        v-if="canSome('articles.create')"
        to="/workspace/articles/new/"
        class="button secondary"
        ><Icon name="plus" :size="17" />Написать статью</PageLink
      >
    </header>
    <div class="catalog-tools">
      <span class="muted"
        >{{ data?.total ?? "Публикации команды"
        }}<template v-if="data?.total !== undefined">
          публикаций</template
        ></span
      ><label class="search-field"
        ><Icon name="search" :size="18" /><input
          v-model="search"
          placeholder="Найти публикацию"
          type="search"
          aria-label="Найти публикацию"
      /></label>
    </div>
    <LoadState :loading="loading" :error="error" @retry="reload"
      ><div v-if="data?.items.length" class="news-grid">
        <ArticleCard
          v-for="article in data.items"
          :key="article.id"
          :article="article"
        />
      </div>
      <EmptyState
        v-else
        :title="query ? 'Ничего не нашлось' : 'У каждой идеи есть история'"
        :text="
          query
            ? 'Попробуй изменить запрос.'
            : 'Первые записи ещё впереди. Пока можно познакомиться с проектами и командой.'
        "
        icon="news"
        ><PageLink to="/projects/" class="button secondary"
          >Исследовать проекты<Icon name="arrow" /></PageLink></EmptyState
      ><Pagination
        :offset="offset"
        :limit="limit"
        :count="data?.items.length || 0"
        :total="data?.total"
        @change="offset = $event"
    /></LoadState>
  </div>
</template>
