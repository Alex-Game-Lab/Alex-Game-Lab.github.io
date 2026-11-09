<script setup lang="ts">
import PageLink from "../components/PageLink.vue";
import { coverUrl, mediaUrl } from "../lib/media";
import type { MediaAsset } from "../lib/media";
import {
  ref,
  reactive,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from "vue";
import { useRoute, useRouter, onBeforeRouteLeave } from "vue-router";
import { api } from "../lib/api";
import { auth, can, canSome } from "../stores/auth";
import { notify } from "../stores/notices";
import { errorMessage } from "../lib/errors";
import { covers, coverLabels, readingTime } from "../lib/content";
import { saveDraft, readDraft, removeDraft } from "../lib/drafts";
import type { Article, Project, Page } from "../lib/types";
import Icon from "../components/Icon.vue";
import MarkdownContent from "../components/MarkdownContent.vue";
import Modal from "../components/Modal.vue";
import LoadState from "../components/LoadState.vue";
import StatusBadge from "../components/StatusBadge.vue";
const route = useRoute(),
  router = useRouter();
const draftOwner = auth.access?.account_id || "";
let skipReloadId: string | null = null,
  disposed = false;
let autoTimer: ReturnType<typeof setTimeout>;
const remoteStatus = ref(""),
  hasPublishedDraft = ref(false),
  settingsOpen = ref(false);
const mediaOptions = ref<MediaAsset[]>([]);
const form = reactive({
  kind: "news" as "news" | "article",
  cover_media_id: null as string | null,
  title: "",
  excerpt: "",
  body: "",
  format: "markdown" as "plain" | "markdown",
  project_slug: null as string | null,
  cover: "worlds",
  status: "draft" as "draft" | "published" | "archived",
});
const id = computed(() =>
    typeof route.params.id === "string" ? route.params.id : null,
  ),
  loading = ref(true),
  error = ref(""),
  saving = ref(false),
  revision = ref(0),
  snapshot = ref(""),
  view = ref("write"),
  input = ref<HTMLTextAreaElement>(),
  projectOptions = ref<Project[]>([]),
  coverOpen = ref(false),
  coverMode = ref<"cover" | "body">("cover"),
  linkOpen = ref(false),
  linkText = ref(""),
  linkUrl = ref("https://"),
  recovered = ref<any>(null),
  savedAt = ref(""),
  conflict = ref(false),
  guard = ref(false);
let timer: ReturnType<typeof setTimeout>;
const author = ref(""),
  ownerProtected = ref(false);
const draftKey = computed(() => "article." + (id.value || "new")),
  dirty = computed(() => JSON.stringify(form) !== snapshot.value),
  wordCount = computed(() =>
    form.body.trim() ? form.body.trim().split(/\s+/u).length : 0,
  ),
  allowed = computed(
    () =>
      auth.access?.owner ||
      (!ownerProtected.value &&
        (id.value
          ? can("articles.edit_any", form.project_slug || undefined) ||
            (author.value === auth.access?.account_id &&
              can("articles.edit", form.project_slug || undefined))
          : can("articles.create", form.project_slug || undefined))),
  );
async function load() {
  clearTimeout(timer);
  loading.value = true;
  error.value = "";
  try {
    if (id.value) {
      const article = await api<Article>("/workspace/articles/" + id.value, {
        private: true,
      });
      hasPublishedDraft.value = !!article.has_draft;
      Object.assign(form, {
        kind: article.kind || "article",
        cover_media_id: article.cover_media_id || null,
        title: article.title,
        excerpt: article.excerpt,
        body: article.body,
        format: article.format || "plain",
        project_slug: article.project_slug,
        cover: article.cover,
        status: article.status,
      });
      revision.value = article.revision;
      author.value = article.author_id || "";
      ownerProtected.value = !!article.owner_protected;
    } else {
      hasPublishedDraft.value = false;
      Object.assign(form, {
        kind: route.query.kind === "article" ? "article" : "news",
        cover_media_id: null,
        title: "",
        excerpt: "",
        body: "",
        format: route.query.kind === "article" ? "markdown" : "plain",
        project_slug: null,
        cover: "none",
        status: "draft",
      });
      revision.value = 0;
      author.value = "";
      ownerProtected.value = false;
    }
    conflict.value = false;
    remoteStatus.value = "";
    snapshot.value = JSON.stringify(form);
    recovered.value = readDraft<any>(draftKey.value, draftOwner);
    mediaOptions.value = (
      await api<{ items: MediaAsset[] }>("/media?limit=50")
    ).items;
    const [own, published] = await Promise.all([
      api<Page<Project>>("/workspace/projects?limit=50", { private: true }),
      api<Page<Project>>("/projects?limit=50"),
    ]);
    projectOptions.value = Array.from(
      new Map(
        [...own.items, ...published.items].map((p) => [p.slug, p]),
      ).values(),
    );
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}
watch(
  id,
  (value) => {
    if (value && value === skipReloadId) {
      skipReloadId = null;
      return;
    }
    void load();
  },
  { immediate: true },
);
watch(
  form,
  () => {
    if (loading.value || !dirty.value) return;
    remoteStatus.value = "";
    clearTimeout(timer);
    clearTimeout(autoTimer);
    timer = setTimeout(() => {
      saveDraft(
        draftKey.value,
        {
          form: { ...form },
          revision: revision.value,
        },
        draftOwner,
      );
      savedAt.value = new Intl.DateTimeFormat("ru", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date());
    }, 600);
    if (!recovered.value && !conflict.value)
      autoTimer = setTimeout(() => {
        void save("draft", true);
      }, 1800);
  },
  { deep: true },
);
function restoreDraft() {
  if (!recovered.value) return;
  Object.assign(form, recovered.value.form);
  revision.value = recovered.value.revision;
  recovered.value = null;
  notify("Черновик восстановлен");
}
function discardDraft() {
  removeDraft(draftKey.value, draftOwner);
  recovered.value = null;
}
async function save(
  status: "draft" | "published" | "archived",
  automatic = false,
) {
  if (saving.value || loading.value || conflict.value) return;
  if (form.title.trim().length < 3 || !form.body.trim()) {
    if (!automatic)
      notify("Добавь заголовок от 3 символов и текст публикации.", true);
    return;
  }
  clearTimeout(timer);
  clearTimeout(autoTimer);
  saving.value = true;
  remoteStatus.value = "";
  const oldKey = draftKey.value;
  const submitted = { ...form };
  const drafting = status === "draft";
  const submittedStatus = drafting && id.value ? form.status : status;
  let succeeded = false;
  try {
    const article = await api<Article>(
      "/workspace/articles" +
        (id.value ? "/" + id.value + (drafting ? "/draft" : "") : ""),
      {
        method: id.value ? "PUT" : "POST",
        private: true,
        body: {
          ...submitted,
          status: submittedStatus,
          ...(id.value ? { expected_revision: revision.value } : {}),
        },
      },
    );
    revision.value = article.revision;
    hasPublishedDraft.value = !!article.has_draft;
    form.status = article.status;
    snapshot.value = JSON.stringify({ ...submitted, status: article.status });
    recovered.value = null;
    savedAt.value = "";
    remoteStatus.value = drafting
      ? "Черновик сохранён на сервере"
      : status === "published"
        ? "Опубликовано на сайте"
        : "В архиве";
    if (!id.value && !disposed) {
      skipReloadId = article.id;
      guard.value = true;
      await router.replace("/workspace/articles/" + article.id + "/");
      guard.value = false;
    }
    if (!dirty.value) removeDraft(oldKey, draftOwner);
    succeeded = true;
    if (!automatic) notify(remoteStatus.value);
  } catch (e) {
    conflict.value = (e as any)?.code === "revision_conflict";
    saveDraft(
      draftKey.value,
      { form: { ...form }, revision: revision.value },
      draftOwner,
    );
    remoteStatus.value = conflict.value
      ? "На сервере есть более новая версия"
      : "Не сохранено на сервере — копия в этой вкладке";
    if (!automatic || conflict.value) notify(errorMessage(e), true);
  } finally {
    saving.value = false;
    if (succeeded && dirty.value && !disposed && !conflict.value) {
      remoteStatus.value = "Есть новые изменения";
      autoTimer = setTimeout(() => {
        void save("draft", true);
      }, 1800);
    }
  }
}
function chooseMedia(item: MediaAsset) {
  if (coverMode.value === "cover") {
    form.cover_media_id = item.id;
    form.cover = "none";
  } else
    void insert(
      "\n![",
      item.alt || item.title,
      "](" + mediaUrl(item.id) + ")\n",
    );
  coverOpen.value = false;
}
async function insert(before: string, placeholder: string, after = "") {
  if (form.format === "plain") form.format = "markdown";
  const element = input.value;
  const start = element?.selectionStart ?? form.body.length,
    end = element?.selectionEnd ?? start;
  const selected = form.body.slice(start, end) || placeholder;
  form.body =
    form.body.slice(0, start) +
    before +
    selected +
    after +
    form.body.slice(end);
  view.value = "write";
  await nextTick();
  input.value?.focus();
  input.value?.setSelectionRange(
    start + before.length,
    start + before.length + selected.length,
  );
}
function insertImage(key: string) {
  if (coverMode.value === "cover") {
    form.cover = key;
    form.cover_media_id = null;
  } else if (covers[key])
    void insert("\n![", coverLabels[key], "](" + covers[key] + ")\n");
  coverOpen.value = false;
}
function addLink() {
  try {
    const url = new URL(linkUrl.value);
    if (!["https:", "http:"].includes(url.protocol)) throw new Error();
    void insert("[", linkText.value || "Текст ссылки", "](" + url.href + ")");
    linkOpen.value = false;
  } catch {
    notify("Укажи адрес, который начинается с https://", true);
  }
}
function beforeUnload(e: BeforeUnloadEvent) {
  if (dirty.value) {
    saveDraft(
      draftKey.value,
      { form: { ...form }, revision: revision.value },
      draftOwner,
    );
    e.preventDefault();
    e.returnValue = "";
  }
}
function shortcut(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
    e.preventDefault();
    if (!saving.value && !loading.value) void save("draft");
  }
}
onMounted(() => {
  window.addEventListener("beforeunload", beforeUnload);
  window.addEventListener("keydown", shortcut);
});
onBeforeUnmount(() => {
  disposed = true;
  clearTimeout(autoTimer);
  window.removeEventListener("beforeunload", beforeUnload);
  window.removeEventListener("keydown", shortcut);
  clearTimeout(timer);
});
onBeforeRouteLeave(
  () =>
    guard.value ||
    !dirty.value ||
    window.confirm(
      "Выйти из редактора? В публикации есть несохранённые изменения. Нажми «Отмена», чтобы остаться.",
    ),
);
</script>
<template>
  <div class="editor-page">
    <div class="editor-top">
      <PageLink to="/workspace/articles/" class="back-link"
        ><Icon name="back" :size="16" />Публикации</PageLink
      >
      <div class="editor-save-status">
        <span v-if="saving"
          ><Icon name="loading" class="spin" :size="14" />Сохраняем…</span
        ><span v-else-if="dirty"
          ><i class="warning-dot"></i
          >{{
            remoteStatus ||
            (savedAt
              ? "Черновик в этой вкладке · " + savedAt
              : "Есть изменения")
          }}</span
        ><span v-else
          ><Icon name="check" :size="14" />{{
            remoteStatus ||
            (hasPublishedDraft
              ? "Есть неопубликованный черновик"
              : id
                ? "Всё сохранено"
                : "Новая публикация")
          }}</span
        >
      </div>
    </div>
    <LoadState :loading="loading" :error="error" @retry="load"
      ><template v-if="allowed"
        ><header class="workspace-heading split">
          <div>
            <span class="eyebrow">{{
              form.kind === "news" ? "НОВОСТЬ AGL" : "СТАТЬЯ AGL"
            }}</span>
            <h1>
              {{
                id
                  ? "Редактор"
                  : form.kind === "news"
                    ? "Новая новость"
                    : "Новая статья"
              }}<span class="accent">.</span>
            </h1>
          </div>
          <div class="button-row editor-actions">
            <button
              class="button secondary small"
              :disabled="saving"
              @click="save('draft')"
            >
              <Icon name="save" :size="16" />Сохранить черновик</button
            ><button
              v-if="can('articles.publish', form.project_slug || undefined)"
              class="button small"
              :disabled="saving"
              @click="save('published')"
            >
              {{
                form.status === "published"
                  ? "Опубликовать изменения"
                  : "Опубликовать"
              }}<Icon name="out" :size="16" />
            </button>
          </div>
        </header>
        <div v-if="recovered" class="notice">
          <Icon name="undo" />
          <div>
            <strong>В этой вкладке есть несохранённый черновик</strong>
            <p>Можно продолжить с него или оставить версию на сервере.</p>
          </div>
          <button class="button small secondary" @click="restoreDraft">
            Восстановить</button
          ><button class="text-button small" @click="discardDraft">
            Удалить черновик
          </button>
        </div>
        <div v-if="conflict" class="notice notice-error">
          <Icon name="warning" />
          <div>
            <strong>Публикация уже изменена</strong>
            <p>
              Скопируй свой текст перед загрузкой серверной версии. Текущие
              изменения остаются в редакторе.
            </p>
          </div>
          <button class="button secondary small" @click="load">
            Загрузить версию
          </button>
        </div>
        <div class="publication-kind" role="group" aria-label="Тип публикации">
          <button
            type="button"
            :class="{ active: form.kind === 'news' }"
            :aria-pressed="form.kind === 'news'"
            @click="form.kind = 'news'"
          >
            Новость<span>Короткое обновление</span></button
          ><button
            type="button"
            :class="{ active: form.kind === 'article' }"
            :aria-pressed="form.kind === 'article'"
            @click="form.kind = 'article'"
          >
            Статья<span>Большой материал</span>
          </button>
        </div>
        <p v-if="hasPublishedDraft" class="notice">
          На сайте остаётся опубликованная версия. Этот черновик увидят читатели
          после публикации.
        </p>
        <div class="editor-layout">
          <div class="editor-main panel">
            <label class="article-title-field"
              ><span>Заголовок</span
              ><input
                v-model="form.title"
                maxlength="160"
                placeholder="О чём хочется рассказать?"
                required
              /><small>{{ form.title.length }} / 160</small></label
            ><label v-if="form.kind === 'article'" class="excerpt-field"
              ><span>Короткое описание · необязательно</span
              ><textarea
                v-model="form.excerpt"
                rows="2"
                maxlength="500"
                placeholder="Если нужно отдельное вступление"
              /><small
                >Появится в ленте новостей и под заголовком.</small
              ></label
            >
            <div class="editor-view-tabs">
              <button
                :class="{ active: view === 'write' }"
                @click="view = 'write'"
              >
                <Icon name="edit" :size="16" />Текст</button
              ><button
                :class="{ active: view === 'preview' }"
                @click="view = 'preview'"
              >
                <Icon name="eye" :size="16" />Предпросмотр</button
              ><span
                >{{ wordCount }} слов<span v-if="form.kind === 'article'">
                  · {{ readingTime(form.body) }} мин</span
                ></span
              >
            </div>
            <template v-if="view === 'write'"
              ><div class="editor-toolbar" aria-label="Форматирование">
                <button
                  type="button"
                  class="icon-button"
                  aria-label="Заголовок"
                  title="Заголовок"
                  @mousedown.prevent
                  @click="insert('\n## ', 'Заголовок', '\n')"
                >
                  <Icon name="heading" :size="18" /></button
                ><button
                  type="button"
                  class="icon-button"
                  aria-label="Полужирный"
                  title="Полужирный"
                  @mousedown.prevent
                  @click="insert('**', 'Важная мысль', '**')"
                >
                  <Icon name="bold" :size="18" /></button
                ><button
                  type="button"
                  class="icon-button"
                  aria-label="Курсив"
                  title="Курсив"
                  @mousedown.prevent
                  @click="insert('*', 'Выделение', '*')"
                >
                  <Icon name="italic" :size="18" /></button
                ><span class="toolbar-separator"></span
                ><button
                  class="icon-button"
                  type="button"
                  aria-label="Список"
                  title="Список"
                  @mousedown.prevent
                  @click="insert('\n- ', 'Пункт списка', '\n')"
                >
                  <Icon name="list" :size="18" /></button
                ><button
                  class="icon-button"
                  type="button"
                  aria-label="Цитата"
                  title="Цитата"
                  @mousedown.prevent
                  @click="insert('\n> ', 'Цитата', '\n')"
                >
                  <Icon name="quote" :size="18" /></button
                ><button
                  class="icon-button"
                  type="button"
                  aria-label="Код"
                  title="Код"
                  @mousedown.prevent
                  @click="
                    insert(
                      String.fromCharCode(96),
                      'код',
                      String.fromCharCode(96),
                    )
                  "
                >
                  <Icon name="code" :size="18" /></button
                ><span class="toolbar-separator"></span
                ><button
                  class="icon-button"
                  type="button"
                  aria-label="Добавить ссылку"
                  title="Ссылка"
                  @click="linkOpen = true"
                >
                  <Icon name="link" :size="18" /></button
                ><button
                  class="icon-button"
                  type="button"
                  aria-label="Добавить изображение"
                  title="Изображение из библиотеки"
                  @click="
                    coverMode = 'body';
                    coverOpen = true;
                  "
                >
                  <Icon name="image" :size="18" />
                </button>
              </div>
              <textarea
                ref="input"
                v-model="form.body"
                class="body-editor"
                maxlength="30000"
                placeholder="Что изменилось? Расскажи самое важное."
                aria-label="Текст публикации"
                spellcheck="true"
              />
              <div class="editor-bottom">
                <span>{{ form.format === 'plain' ? 'Обычный текст' : 'Markdown · заголовки, списки и ссылки' }}</span
                ><span
                  >{{ form.body.length.toLocaleString("ru-RU") }} / 30 000</span
                >
              </div></template
            >
            <div v-else class="editor-preview">
              <h2>{{ form.title || "Заголовок публикации" }}</h2>
              <p class="article-lead">{{ form.excerpt }}</p>
              <MarkdownContent
                v-if="form.body"
                :body="form.body"
                :format="form.format"
              />
              <p v-else class="muted">
                Предпросмотр появится, когда ты добавишь текст.
              </p>
            </div>
          </div>
          <aside class="editor-sidebar" :class="{ 'is-open': settingsOpen }">
            <button
              class="editor-settings-toggle button secondary"
              :aria-expanded="settingsOpen"
              @click="settingsOpen = !settingsOpen"
            >
              Параметры публикации<Icon
                :name="settingsOpen ? 'close' : 'down'"
              />
            </button>
            <section class="panel">
              <h3>Публикация</h3>
              <label v-if="form.kind === 'news'"
                >Короткое описание · необязательно<textarea
                  v-model="form.excerpt"
                  rows="3"
                  maxlength="500"
                  placeholder="Если нужно отдельное вступление"
                />
              </label>
              <StatusBadge :status="form.status" /><label
                >Проект<select
                  v-model="form.project_slug"
                  :disabled="!!id && !auth.access?.owner"
                >
                  <option :value="null">Без проекта</option>
                  <option
                    v-for="project in projectOptions"
                    :key="project.slug"
                    :value="project.slug"
                  >
                    {{ project.title }}
                  </option>
                </select></label
              ><label
                >Формат<select v-model="form.format">
                  <option value="markdown">С форматированием</option>
                  <option value="plain">Обычный текст</option>
                </select></label
              >
              <p class="small muted">
                Публикация появится на сайте после нажатия «Опубликовать».
              </p>
              <PageLink
                v-if="id && form.status === 'published'"
                :to="'/news/' + id + '/'"
                class="inline-link small"
                >Открыть на сайте<Icon name="out" :size="15" /></PageLink
              ><button
                v-if="id && form.status !== 'archived'"
                class="text-button small"
                :disabled="saving"
                @click="save('archived')"
              >
                Переместить в архив
              </button>
            </section>
            <section class="panel cover-settings">
              <h3>Обложка</h3>
              <button
                class="cover-preview"
                aria-label="Выбрать обложку"
                @click="
                  coverMode = 'cover';
                  coverOpen = true;
                "
              >
                <img
                  v-if="coverUrl(form)"
                  :src="coverUrl(form)"
                  alt=""
                  width="280"
                  height="170"
                /><span v-else><Icon name="image" :size="32" /></span></button
              ><button
                class="button secondary small full"
                @click="
                  coverMode = 'cover';
                  coverOpen = true;
                "
              >
                Выбрать иллюстрацию<Icon name="image" :size="16" /></button
              ><button
                v-if="form.cover !== 'none' || form.cover_media_id"
                class="text-button small"
                @click="
                  form.cover = 'none';
                  form.cover_media_id = null;
                "
              >
                Без обложки
              </button>
            </section>
            <div class="editor-tip">
              <Icon name="spark" :size="18" />
              <p>
                Хорошая история начинается с одной конкретной мысли. Остальное
                можно дописать в черновике.
              </p>
            </div>
          </aside>
        </div></template
      >
      <div v-else class="notice notice-error">
        Создавать публикации можно после назначения соответствующих прав.
      </div></LoadState
    >
    <Modal
      v-model:open="coverOpen"
      :title="
        coverMode === 'cover' ? 'Обложка публикации' : 'Добавить иллюстрацию'
      "
      wide
      ><div class="image-library">
        <button
          v-for="item in mediaOptions"
          :key="item.id"
          @click="chooseMedia(item)"
        >
          <img
            :src="mediaUrl(item.id)"
            :alt="item.alt || item.title"
            width="280"
            height="175"
          /><span>{{ item.title }}</span>
        </button>
        <button
          v-for="(src, key) in covers"
          :key="key"
          :class="{ selected: form.cover === key && coverMode === 'cover' }"
          @click="insertImage(String(key))"
        >
          <img
            :src="src"
            :alt="coverLabels[key]"
            width="280"
            height="175"
            loading="lazy"
          /><span
            >{{ coverLabels[key]
            }}<Icon v-if="form.cover === key" name="check" :size="16"
          /></span>
        </button></div></Modal
    ><Modal v-model:open="linkOpen" title="Добавить ссылку"
      ><form class="form-stack" @submit.prevent="addLink">
        <label
          >Текст ссылки<input
            v-model="linkText"
            placeholder="Открыть страницу" /></label
        ><label
          >Адрес<input
            v-model="linkUrl"
            type="url"
            required
            placeholder="https://" /></label
        ><button class="button">
          Добавить ссылку<Icon name="link" :size="17" />
        </button></form
    ></Modal>
  </div>
</template>
