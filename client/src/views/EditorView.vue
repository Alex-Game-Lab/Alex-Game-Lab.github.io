<script setup lang="ts">
import PageLink from "../components/PageLink.vue";
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
const form = reactive({
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
      Object.assign(form, {
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
      Object.assign(form, {
        title: "",
        excerpt: "",
        body: "",
        format: "markdown",
        project_slug: null,
        cover: "worlds",
        status: "draft",
      });
      revision.value = 0;
      author.value = "";
      ownerProtected.value = false;
    }
    snapshot.value = JSON.stringify(form);
    recovered.value = readDraft<any>(draftKey.value);
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
watch(id, load, { immediate: true });
watch(
  form,
  () => {
    if (loading.value || !dirty.value) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      saveDraft(draftKey.value, {
        form: { ...form },
        revision: revision.value,
      });
      savedAt.value = new Intl.DateTimeFormat("ru", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date());
    }, 600);
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
  removeDraft(draftKey.value);
  recovered.value = null;
}
async function save(status: "draft" | "published" | "archived") {
  if (!form.title.trim() || !form.body.trim()) {
    notify("Добавь заголовок и текст статьи.", true);
    return;
  }
  clearTimeout(timer);
  saving.value = true;
  conflict.value = false;
  const oldKey = draftKey.value;
  try {
    const article = await api<Article>(
      "/workspace/articles" + (id.value ? "/" + id.value : ""),
      {
        method: id.value ? "PUT" : "POST",
        private: true,
        body: {
          ...form,
          status,
          ...(id.value ? { expected_revision: revision.value } : {}),
        },
      },
    );
    Object.assign(form, { status: article.status });
    revision.value = article.revision;
    snapshot.value = JSON.stringify(form);
    removeDraft(oldKey);
    recovered.value = null;
    savedAt.value = "";
    notify(
      status === "published"
        ? "Статья опубликована"
        : status === "archived"
          ? "Статья перемещена в архив"
          : "Черновик сохранён",
    );
    if (!id.value) {
      guard.value = true;
      await router.replace("/workspace/articles/" + article.id + "/");
      guard.value = false;
    }
  } catch (e) {
    conflict.value = (e as any)?.code === "revision_conflict";
    notify(errorMessage(e), true);
  } finally {
    saving.value = false;
  }
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
    saveDraft(draftKey.value, { form: { ...form }, revision: revision.value });
    e.preventDefault();
    e.returnValue = "";
  }
}
function shortcut(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
    e.preventDefault();
    if (!saving.value && !loading.value) void save(form.status);
  }
}
onMounted(() => {
  window.addEventListener("beforeunload", beforeUnload);
  window.addEventListener("keydown", shortcut);
});
onBeforeUnmount(() => {
  window.removeEventListener("beforeunload", beforeUnload);
  window.removeEventListener("keydown", shortcut);
  clearTimeout(timer);
});
onBeforeRouteLeave(
  () =>
    guard.value ||
    !dirty.value ||
    window.confirm(
      "Выйти из редактора? В статье есть несохранённые изменения. Нажми «Отмена», чтобы остаться.",
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
            savedAt ? "Черновик в этой вкладке · " + savedAt : "Есть изменения"
          }}</span
        ><span v-else
          ><Icon name="check" :size="14" />{{
            id ? "Всё сохранено" : "Новая статья"
          }}</span
        >
      </div>
    </div>
    <LoadState :loading="loading" :error="error" @retry="load"
      ><template v-if="allowed"
        ><header class="workspace-heading split">
          <div>
            <span class="eyebrow">СТАТЬЯ AGL</span>
            <h1>
              {{ id ? "Редактор" : "Новая история"
              }}<span class="accent">.</span>
            </h1>
          </div>
          <div class="button-row">
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
                  ? "Сохранить на сайте"
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
            <strong>Статья уже изменена</strong>
            <p>
              Скопируй свой текст перед загрузкой серверной версии. Текущие
              изменения остаются в редакторе.
            </p>
          </div>
          <button class="button secondary small" @click="load">
            Загрузить версию
          </button>
        </div>
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
            ><label class="excerpt-field"
              ><span>Короткое описание</span
              ><textarea
                v-model="form.excerpt"
                rows="2"
                maxlength="500"
                placeholder="Пара предложений для карточки статьи"
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
                >{{ wordCount }} слов · {{ readingTime(form.body) }} мин</span
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
                placeholder="Начни историю здесь…&#10;&#10;Например: почему появилась эта идея, как работает механика и что получилось."
                aria-label="Текст статьи"
                spellcheck="true"
              />
              <div class="editor-bottom">
                <span>Markdown · заголовки, списки, ссылки и код</span
                ><span
                  >{{ form.body.length.toLocaleString("ru-RU") }} / 30 000</span
                >
              </div></template
            >
            <div v-else class="editor-preview">
              <h2>{{ form.title || "Заголовок статьи" }}</h2>
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
          <aside class="editor-sidebar">
            <section class="panel">
              <h3>Публикация</h3>
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
                Статья публикуется сразу после нажатия «Опубликовать».
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
                  v-if="covers[form.cover]"
                  :src="covers[form.cover]"
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
                v-if="form.cover !== 'none'"
                class="text-button small"
                @click="form.cover = 'none'"
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
        Писать статьи можно после назначения соответствующих прав.
      </div></LoadState
    >
    <Modal
      v-model:open="coverOpen"
      :title="coverMode === 'cover' ? 'Обложка статьи' : 'Добавить иллюстрацию'"
      wide
      ><div class="image-library">
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
