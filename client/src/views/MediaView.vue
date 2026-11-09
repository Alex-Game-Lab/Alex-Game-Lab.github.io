<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../lib/api";
import { prepareImage, mediaUrl } from "../lib/media";
import type { MediaAsset } from "../lib/media";
import { auth } from "../stores/auth";
import { errorMessage } from "../lib/errors";
import { notify } from "../stores/notices";
import MediaPreview from "../components/MediaPreview.vue";
import Icon from "../components/Icon.vue";
import LoadState from "../components/LoadState.vue";
const items = ref<MediaAsset[]>([]),
  loading = ref(true),
  error = ref(""),
  busy = ref(false),
  message = ref("");
const title = ref(""),
  alt = ref(""),
  file = ref<File | null>(null),
  offset = ref(0),
  total = ref(0),
  fileInput = ref<HTMLInputElement>();
async function load() {
  loading.value = true;
  error.value = "";
  try {
    const result = await api<{ items: MediaAsset[]; total: number }>(
      "/workspace/media?limit=24&offset=" + offset.value,
      { private: true },
    );
    items.value = result.items;
    total.value = result.total;
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}
function choose(event: Event) {
  file.value = (event.target as HTMLInputElement).files?.[0] || null;
  if (file.value && !title.value)
    title.value = file.value.name.replace(/\.[^.]+$/, "");
}
async function upload() {
  if (!file.value || busy.value) return;
  busy.value = true;
  message.value = "";
  try {
    const data_base64 = await prepareImage(file.value);
    await api("/workspace/media", {
      method: "POST",
      private: true,
      body: { title: title.value, alt: alt.value, data_base64 },
    });
    file.value = null;
    title.value = "";
    alt.value = "";
    if (fileInput.value) fileInput.value.value = "";
    offset.value = 0;
    await load();
    notify("Изображение загружено в закрытую медиатеку");
  } catch (e) {
    message.value =
      e instanceof Error && !("status" in e) ? e.message : errorMessage(e);
  } finally {
    busy.value = false;
  }
}
async function publish(item: MediaAsset) {
  if (busy.value) return;
  busy.value = true;
  message.value = "";
  try {
    Object.assign(
      item,
      await api<MediaAsset>("/workspace/media/" + item.id + "/publish", {
        method: "POST",
        private: true,
        body: { expected_revision: item.revision },
      }),
    );
    notify("Изображение доступно для публикаций и страниц");
  } catch (e) {
    message.value = errorMessage(e);
  } finally {
    busy.value = false;
  }
}
onMounted(load);
</script>
<template>
  <div v-if="auth.access?.owner">
    <header class="workspace-heading">
      <span class="eyebrow">МАТЕРИАЛЫ AGL</span>
      <h1>Медиатека</h1>
      <p>Собственные изображения для новостей, статей и страниц сайта.</p>
    </header>
    <form class="panel content-fields media-upload" @submit.prevent="upload">
      <h2>Добавить изображение</h2>
      <p class="muted">
        PNG, JPG или WebP до 12 МБ. Подготовим WebP до 350 КБ и 1920 px без
        метаданных исходного файла. Загрузка сначала закрытая.
      </p>
      <label
        >Изображение<input
          ref="fileInput"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          required
          @change="choose"
      /></label>
      <div class="form-columns">
        <label>Название<input v-model="title" maxlength="160" required /></label
        ><label
          >Описание для доступности<input
            v-model="alt"
            maxlength="300"
            placeholder="Что изображено?"
        /></label>
      </div>
      <button class="button" :disabled="busy || !file">
        {{ busy ? "Подготавливаем…" : "Загрузить изображение"
        }}<Icon name="plus" />
      </button>
    </form>
    <p v-if="message" role="alert" class="notice notice-error">{{ message }}</p>
    <LoadState :loading="loading" :error="error" @retry="load"
      ><div v-if="items.length" class="media-library-grid">
        <article v-for="item in items" :key="item.id" class="panel media-asset">
          <div class="media-asset-image"><MediaPreview :asset="item" /></div>
          <div>
            <span class="badge">{{
              item.published ? "Доступно на сайте" : "Только владелец"
            }}</span>
            <h2>{{ item.title }}</h2>
            <p>
              {{ item.width }} × {{ item.height }} ·
              {{ item.alt || "Описание не указано" }}
            </p>
            <a
              v-if="item.published"
              :href="mediaUrl(item.id)"
              class="inline-link"
              target="_blank"
              rel="noopener"
              >Открыть файл<Icon name="out" /></a
            ><button
              v-else
              class="button secondary"
              :disabled="busy"
              @click="publish(item)"
            >
              Сделать доступным на сайте
            </button>
          </div>
        </article>
      </div>
      <div v-else class="panel">
        <h2>Пока нет загруженных изображений</h2>
        <p>
          Добавь первый материал. Публичный доступ включается отдельной кнопкой.
        </p>
      </div>
      <div class="button-row">
        <button
          v-if="offset > 0"
          class="button secondary"
          @click="
            offset -= 24;
            load();
          "
        >
          Назад</button
        ><button
          v-if="offset + 24 < total"
          class="button secondary"
          @click="
            offset += 24;
            load();
          "
        >
          Следующие изображения
        </button>
      </div></LoadState
    >
  </div>
  <p v-else class="notice">Медиатека доступна владельцу AGL.</p>
</template>
