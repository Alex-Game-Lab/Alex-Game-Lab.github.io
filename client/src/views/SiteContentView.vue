<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { api } from "../lib/api";
import { onBeforeRouteLeave } from "vue-router";
import { onBeforeUnmount } from "vue";
import { defaultHome, applyPublishedHome } from "../lib/site-home";
import type { HomeContent } from "../lib/site-home";
import type { MediaAsset } from "../lib/media";
import { mediaUrl } from "../lib/media";
import { auth } from "../stores/auth";
import { notify } from "../stores/notices";
import { errorMessage } from "../lib/errors";
import Icon from "../components/Icon.vue";
import PageLink from "../components/PageLink.vue";
import LoadState from "../components/LoadState.vue";
interface Edition {
  draft: HomeContent;
  published: HomeContent;
  revision: number;
  published_revision: number;
  history: { revision: number; content: HomeContent }[];
}
const path = "/workspace/site-content/agl/home",
  form = reactive<HomeContent>({ ...defaultHome });
const edition = ref<Edition | null>(null),
  media = ref<MediaAsset[]>([]),
  loading = ref(true),
  busy = ref(false),
  error = ref(""),
  actionError = ref(""),
  snapshot = ref("");
const dirty = computed(() => JSON.stringify(form) !== snapshot.value);
async function load() {
  loading.value = true;
  error.value = "";
  try {
    const result = await api<Edition>(path, { private: true });
    edition.value = result;
    Object.assign(form, result.draft);
    snapshot.value = JSON.stringify(form);
    media.value = (await api<{ items: MediaAsset[] }>("/media?limit=50")).items;
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}
async function save(publish = false) {
  if (busy.value || !edition.value) return;
  busy.value = true;
  actionError.value = "";
  try {
    if (dirty.value || edition.value.revision === 0) {
      const content = { ...form };
      edition.value = await api<Edition>(path, {
        method: "PUT",
        private: true,
        body: { expected_revision: edition.value.revision, content },
      });
      snapshot.value = JSON.stringify(content);
    }
    if (publish) {
      edition.value = await api<Edition>(path + "/publish", {
        method: "POST",
        private: true,
        body: { expected_revision: edition.value.revision },
      });
      applyPublishedHome(edition.value.published);
    }
    notify(
      publish
        ? "Главная обновлена на сайте"
        : "Черновик страницы сохранён на сервере",
    );
  } catch (e) {
    actionError.value = errorMessage(e);
  } finally {
    busy.value = false;
  }
}
function leaving(event: BeforeUnloadEvent) {
  if (edition.value && dirty.value) {
    event.preventDefault();
    event.returnValue = "";
  }
}
onMounted(() => {
  void load();
  window.addEventListener("beforeunload", leaving);
});
onBeforeUnmount(() => window.removeEventListener("beforeunload", leaving));
onBeforeRouteLeave(
  () =>
    !edition.value ||
    !dirty.value ||
    window.confirm(
      "Есть несохранённые изменения страницы. Выйти без сохранения?",
    ),
);
</script>
<template>
  <div v-if="auth.access?.owner">
    <header class="workspace-heading split">
      <div>
        <span class="eyebrow">УПРАВЛЕНИЕ САЙТОМ</span>
        <h1>Содержимое сайта</h1>
        <p>
          Главная AGL и канал студии. Изменения сначала сохраняются в черновик.
        </p>
      </div>
      <PageLink to="/" class="button secondary"
        >Открыть сайт<Icon name="out"
      /></PageLink>
    </header>
    <LoadState :loading="loading" :error="error" @retry="load">
      <form class="content-grid" @submit.prevent="save(true)">
        <section class="panel content-fields">
          <div class="panel-heading">
            <h2>Главная AGL</h2>
            <span class="badge">{{
              edition?.revision
                ? "Версия " + edition.revision
                : "Начальная версия"
            }}</span>
          </div>
          <label
            >Заголовок первого экрана<input
              v-model="form.title"
              minlength="3"
              maxlength="120"
              required
          /></label>
          <label
            >Короткое описание<textarea
              v-model="form.intro"
              rows="4"
              maxlength="500"
              required
            />
          </label>
          <div class="form-columns">
            <label
              >Подпись канала<input
                v-model="form.channel_label"
                maxlength="50"
                required /></label
            ><label
              >Ссылка канала<input
                v-model="form.channel_url"
                type="url"
                pattern="https://.*"
                maxlength="300"
                required
            /></label>
          </div>
          <label
            >Изображение первого экрана<select v-model="form.hero_media_id">
              <option :value="null">Исходный мир AGL</option>
              <option v-for="item in media" :key="item.id" :value="item.id">
                {{ item.title }}
              </option>
            </select></label
          >
          <PageLink to="/workspace/media/" class="inline-link"
            >Добавить своё изображение<Icon name="image"
          /></PageLink>
          <p v-if="actionError" role="alert" class="form-error">
            {{ actionError }} Изменения остаются в форме.
          </p>
          <div class="content-actions">
            <span role="status"
              >{{
                dirty
                  ? "Есть неопубликованные изменения"
                  : edition?.revision
                    ? "Черновик сохранён"
                    : "Начальная версия страницы"
              }}
              · опубликована версия {{ edition?.published_revision || 0 }}</span
            >
            <div class="button-row">
              <button
                type="button"
                class="button secondary"
                :disabled="busy"
                @click="save(false)"
              >
                Сохранить черновик</button
              ><button class="button" :disabled="busy">
                {{ busy ? "Сохраняем…" : "Опубликовать" }}
              </button>
            </div>
          </div>
        </section>
        <aside class="content-preview panel">
          <span class="eyebrow">ПРЕДПРОСМОТР</span
          ><img
            :src="
              form.hero_media_id
                ? mediaUrl(form.hero_media_id)
                : '/assets/agl-worlds-v2.webp'
            "
            alt="Иллюстрация первого экрана"
            width="720"
            height="420"
          />
          <h2>{{ form.title }}</h2>
          <p>{{ form.intro }}</p>
          <span class="button secondary">{{ form.channel_label }}</span>
          <p class="small muted">
            Публикация обновит заголовок, описание и ссылку канала на главной и
            в подвале.
          </p>
        </aside>
      </form>
      <section v-if="edition?.history.length" class="panel edition-history">
        <h2>Предыдущие публикации</h2>
        <div
          v-for="(entry, index) in edition.history"
          :key="index"
          class="recent-row"
        >
          <div>
            <strong>{{ entry.content.title }}</strong>
            <p>Опубликованная версия {{ entry.revision }}</p>
          </div>
          <button
            class="button secondary"
            :disabled="busy"
            @click="Object.assign(form, entry.content)"
          >
            Вернуть в черновик
          </button>
        </div>
      </section>
    </LoadState>
  </div>
  <p v-else class="notice">Управление содержимым доступно владельцу AGL.</p>
</template>
