<script setup lang="ts">
import projectSnapshot from "../content/projects.json";
import {usePage,usePageMeta} from "../lib/pages";
import PublicHero from "../components/PublicHero.vue";import ContentBlocks from "../components/ContentBlocks.vue";
const page=usePage("agl","project-rublemet");usePageMeta(page);
import PageLink from "../components/PageLink.vue";
import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import { api } from "../lib/api";
import { resource } from "../lib/resource";
import { covers, labels, date } from "../lib/content";
import { auth, can } from "../stores/auth";
import { notify } from "../stores/notices";
import { errorMessage } from "../lib/errors";
import type { Project, Page, Article } from "../lib/types";
import Icon from "../components/Icon.vue";
import StatusBadge from "../components/StatusBadge.vue";
import LoadState from "../components/LoadState.vue";
import ArticleCard from "../components/ArticleCard.vue";
import Modal from "../components/Modal.vue";
const route = useRoute(),
  tab = ref("about"),
  reviewOpen = ref(false),
  rating = ref(5),
  body = ref(""),
  revision = ref(0),
  saving = ref(false);
const { data, loading, error, reload } = resource(
  () =>
    api<Project>("/projects/" + encodeURIComponent(String(route.params.slug))),
  [() => route.params.slug],
  (projectSnapshot.items.find(p=>p.slug===String(route.params.slug))||null) as unknown as Project|null,
);
const news = resource(
  () =>
    api<Page<Article>>(
      "/news?limit=3&project_slug=" +
        encodeURIComponent(String(route.params.slug)),
    ),
  [() => route.params.slug],
);
const reviews = resource(
  () =>
    api<
      Page<{
        id: string;
        author: string;
        rating: number;
        body: string;
        updated_at: string;
      }>
    >(
      "/projects/" + encodeURIComponent(String(route.params.slug)) + "/reviews",
    ),
  [() => route.params.slug],
);
watch(data, (value) => {
  if (value && value.slug!=="rublemet") document.title = value.title + " · AGL";
});
async function openReview() {
  try {
    const own = await api<any>(
      "/workspace/projects/" + route.params.slug + "/review",
      { private: true },
    );
    rating.value = own.rating;
    body.value = own.body;
    revision.value = own.revision;
  } catch (e) {
    if ((e as any)?.status !== 404) {
      notify(errorMessage(e), true);
      return;
    }
    rating.value = 5;
    body.value = "";
    revision.value = 0;
  }
  reviewOpen.value = true;
}
async function saveReview() {
  saving.value = true;
  try {
    await api("/workspace/projects/" + route.params.slug + "/review", {
      private: true,
      method: "PUT",
      body: {
        rating: rating.value,
        body: body.value,
        expected_revision: revision.value,
      },
    });
    reviewOpen.value = false;
    notify("Отзыв сохранён");
    await reviews.reload();
  } catch (e) {
    notify(errorMessage(e), true);
  } finally {
    saving.value = false;
  }
}
</script>
<template>
  <div class="container page-container public-page game-page">
    <PageLink to="/projects/" class="back-link"
      ><Icon name="back" :size="17" />Все проекты</PageLink
    ><LoadState :stale="!!data" :loading="loading" :error="error" @retry="reload"
      ><template v-if="data"
        ><PublicHero v-if="data.slug==='rublemet'" :page="page"/><section v-else class="project-heading"><div><p class="eyebrow">ПРОЕКТ AGL</p><h1>{{data.title}}</h1><p>{{data.summary}}</p></div></section>
        <div class="game-meta"><StatusBadge :status="data.status" dot/><span>Android</span><span>Кликер / история</span><button v-if="can('reviews.create',data.slug)" class="text-link" @click="openReview">Написать отзыв ↗</button></div>
        <div class="detail-tabs" aria-label="Разделы проекта">
          <button
            v-for="[key, title] in [
              ['about', 'О проекте'],
              ['news', 'Публикации'],
              ['reviews', 'Отзывы'],
            ]"
            :key="key"
            :class="{ active: tab === key }"
            @click="tab = key"
          >
            {{ title
            }}<span v-if="key === 'news' && news.data.value?.total">{{
              news.data.value.total
            }}</span>
          </button>
        </div>
        <section v-if="tab === 'about'"><ContentBlocks v-if="data.slug==='rublemet'" :blocks="page.sections"/><p v-else class="plain-text">{{data.description||data.summary}}</p></section>
        <section v-else-if="tab === 'news'" class="tab-content">
          <div v-if="news.data.value?.items.length" class="news-grid">
            <ArticleCard
              v-for="article in news.data.value.items"
              :key="article.id"
              :article="article"
            />
          </div>
          <div v-else class="quiet-state">
            <Icon name="news" :size="28" />
            <h3>Дневник проекта ещё впереди</h3>
            <p>Публикации о разработке появятся здесь.</p>
          </div>
        </section>
        <section v-else class="tab-content reviews-section">
          <div class="section-heading small">
            <h2>Впечатления игроков</h2>
            <button
              v-if="can('reviews.create', data.slug)"
              class="button secondary small"
              @click="openReview"
            >
              Написать отзыв
            </button>
          </div>
          <article
            v-for="review in reviews.data.value?.items"
            :key="review.id"
            class="review-card"
          >
            <div class="review-meta">
              <strong>{{ review.author }}</strong
              ><span class="stars"
                >{{ "★".repeat(review.rating)
                }}<span>{{ "★".repeat(5 - review.rating) }}</span></span
              ><time>{{ date(review.updated_at) }}</time>
            </div>
            <p class="plain-text">{{ review.body }}</p>
          </article>
          <div v-if="!reviews.data.value?.items.length" class="quiet-state">
            <Icon name="comment" :size="28" />
            <h3>Отзывы ещё не появились</h3>
            <p>Тестировщики смогут поделиться впечатлениями о проекте.</p>
          </div>
        </section></template
      ></LoadState
    ><Modal v-model:open="reviewOpen" title="Твой отзыв" :busy="saving"
      ><form class="form-stack" @submit.prevent="saveReview">
        <label
          >Оценка<select v-model.number="rating">
            <option v-for="value in 5" :value="value">{{ value }} из 5</option>
          </select></label
        ><label
          >Впечатления<textarea
            v-model="body"
            rows="7"
            minlength="3"
            maxlength="4000"
            required
            placeholder="Что понравилось? Что стоит улучшить?"
          /></label
        ><button class="button" :disabled="saving">
          Сохранить отзыв<Icon name="check" />
        </button></form
    ></Modal>
  </div>
</template>
