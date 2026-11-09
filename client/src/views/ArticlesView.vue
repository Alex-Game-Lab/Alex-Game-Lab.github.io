<script setup lang="ts">
import PageLink from "../components/PageLink.vue";
import { ref, watch } from "vue";
import { api } from "../lib/api";
import { resource } from "../lib/resource";
import { auth, can, canSome } from "../stores/auth";
import { covers, shortDate } from "../lib/content";
import { notify } from "../stores/notices";
import { errorMessage } from "../lib/errors";
import type { Article, Page } from "../lib/types";
import Icon from "../components/Icon.vue";
import StatusBadge from "../components/StatusBadge.vue";
import LoadState from "../components/LoadState.vue";
import EmptyState from "../components/EmptyState.vue";
import Pagination from "../components/Pagination.vue";
import Modal from "../components/Modal.vue";
const offset = ref(0),
  status = ref("all"),
  search = ref(""),
  query = ref(""),
  limit = 15,
  removing = ref<Article | null>(null),
  busy = ref(false);
let timer: ReturnType<typeof setTimeout>;
watch(search, (value) => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    query.value = value;
    offset.value = 0;
  }, 300);
});
watch(status, () => (offset.value = 0));
const { data, loading, error, reload } = resource(
  () =>
    api<Page<Article>>(
      "/workspace/articles?limit=" +
        limit +
        "&offset=" +
        offset.value +
        (status.value !== "all" ? "&status=" + status.value : "") +
        "&search=" +
        encodeURIComponent(query.value),
      { private: true },
    ),
  [offset, status, query],
);
function editable(article: Article) {
  return (
    !(article.owner_protected && !auth.access?.owner) &&
    (article.author_id === auth.access?.account_id
      ? can("articles.edit", article.project_slug || undefined)
      : can("articles.edit_any", article.project_slug || undefined))
  );
}
function deletable(article: Article) {
  return (
    !(article.owner_protected && !auth.access?.owner) &&
    (article.author_id === auth.access?.account_id
      ? can("articles.delete", article.project_slug || undefined)
      : can("articles.delete_any", article.project_slug || undefined))
  );
}
async function remove() {
  if (!removing.value) return;
  busy.value = true;
  try {
    await api(
      "/workspace/articles/" +
        removing.value.id +
        "?expected_revision=" +
        removing.value.revision,
      { method: "DELETE", private: true },
    );
    removing.value = null;
    notify("Публикация удалена");
    await reload();
  } catch (e) {
    notify(errorMessage(e), true);
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <div>
    <header class="workspace-heading split">
      <div>
        <span class="eyebrow">РЕДАКЦИЯ</span>
        <h1>Публикации<span class="accent">.</span></h1>
        <p>От первой мысли в черновике до истории на сайте.</p>
      </div>
      <PageLink
        v-if="canSome('articles.create')"
        to="/workspace/articles/new/"
        class="button"
        ><Icon name="plus" :size="17" />Создать публикацию</PageLink
      >
    </header>
    <div class="catalog-tools">
      <div class="filter-tabs compact">
        <button
          v-for="[key, title] in [
            ['all', 'Все'],
            ['draft', 'Черновики'],
            ['published', 'Опубликованные'],
            ['archived', 'Архив'],
          ]"
          :key="key"
          :class="{ active: status === key }"
          @click="status = key"
        >
          {{ title }}
        </button>
      </div>
      <label class="search-field compact"
        ><Icon name="search" :size="17" /><input
          v-model="search"
          type="search"
          placeholder="Поиск по заголовку"
          aria-label="Поиск статей"
      /></label>
    </div>
    <LoadState :loading="loading" :error="error" @retry="reload"
      ><div v-if="data?.items.length" class="editorial-list">
        <article
          v-for="article in data.items"
          :key="article.id"
          class="editorial-row"
        >
          <img
            v-if="covers[article.cover]"
            :src="covers[article.cover]"
            alt=""
            width="140"
            height="100"
          />
          <div v-else class="editorial-row-icon"><Icon name="article" /></div>
          <div class="editorial-main">
            <div class="badge-row">
              <StatusBadge :status="article.status" /><span
                v-if="article.owner_protected"
                class="protected-label"
                ><Icon name="shield" :size="12" />Owner</span
              >
            </div>
            <h3>
              <PageLink
                v-if="editable(article)"
                :to="'/workspace/articles/' + article.id + '/'"
                >{{ article.title }}</PageLink
              ><span v-else>{{ article.title }}</span>
            </h3>
            <p>
              {{ article.author }} · {{ shortDate(article.updated_at) }} ·
              версия {{ article.revision }}
            </p>
          </div>
          <div class="row-actions">
            <PageLink
              v-if="article.status === 'published'"
              :to="'/news/' + article.slug + '/'"
              class="icon-button"
              :aria-label="'Открыть статью ' + article.title"
              ><Icon name="out" :size="18" /></PageLink
            ><PageLink
              v-if="editable(article)"
              :to="'/workspace/articles/' + article.id + '/'"
              class="icon-button"
              :aria-label="'Редактировать ' + article.title"
              ><Icon name="edit" :size="18" /></PageLink
            ><button
              v-if="deletable(article)"
              class="icon-button danger-text"
              :aria-label="'Удалить ' + article.title"
              @click="removing = article"
            >
              <Icon name="delete" :size="18" />
            </button>
          </div>
        </article>
      </div>
      <EmptyState
        v-else
        :title="
          search || status !== 'all'
            ? 'Публикации не найдены'
            : 'Есть о чём рассказать?'
        "
        :text="
          search || status !== 'all'
            ? 'Измени фильтры или поисковый запрос.'
            : 'Начни с черновика. Добавь заголовок, историю и иллюстрацию — остальное подхватит редактор.'
        "
        icon="article"
        ><PageLink
          v-if="canSome('articles.create')"
          to="/workspace/articles/new/"
          class="button"
          ><Icon name="plus" :size="17" />Создать публикацию</PageLink
        ></EmptyState
      ><Pagination
        :offset="offset"
        :limit="limit"
        :count="data?.items.length || 0"
        :total="data?.total"
        @change="offset = $event" /></LoadState
    ><Modal
      :open="!!removing"
      title="Удалить публикацию?"
      :busy="busy"
      @update:open="!$event && (removing = null)"
      ><p>«{{ removing?.title }}» исчезнет из редакции и с сайта.</p>
      <div class="button-row">
        <button class="button danger" :disabled="busy" @click="remove">
          Удалить публикацию</button
        ><button
          class="button secondary"
          :disabled="busy"
          @click="removing = null"
        >
          Отмена
        </button>
      </div></Modal
    >
  </div>
</template>
