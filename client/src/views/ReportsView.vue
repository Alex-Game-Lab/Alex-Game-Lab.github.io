<script setup lang="ts">
import { ref, reactive, computed } from "vue";
import { api } from "../lib/api";
import { resource } from "../lib/resource";
import { auth, can, canSome } from "../stores/auth";
import { labels, shortDate } from "../lib/content";
import { notify } from "../stores/notices";
import { errorMessage } from "../lib/errors";
import type { Page, Report, Project } from "../lib/types";
import Icon from "../components/Icon.vue";
import StatusBadge from "../components/StatusBadge.vue";
import Modal from "../components/Modal.vue";
import LoadState from "../components/LoadState.vue";
import EmptyState from "../components/EmptyState.vue";
import Pagination from "../components/Pagination.vue";
const offset = ref(0),
  filter = ref("all"),
  editor = ref(false),
  editing = ref<Report | null>(null),
  opened = ref<Report | null>(null),
  busy = ref(false),
  projects = ref<Project[]>([]),
  limit = 20;
const form = reactive({
  project_slug: "",
  title: "",
  build: "",
  severity: "normal",
  steps: "",
  expected: "",
  actual: "",
  environment: "",
});
const { data, loading, error, reload } = resource(
  () =>
    api<Page<Report>>(
      "/workspace/reports?limit=" + limit + "&offset=" + offset.value,
      { private: true },
    ),
  [offset],
);
const filtered = computed(
  () =>
    data.value?.items.filter(
      (r) => filter.value === "all" || r.status === filter.value,
    ) || [],
);
void Promise.all([
  api<Page<Project>>("/workspace/projects?limit=50", { private: true }),
  api<Page<Project>>("/projects?limit=50"),
])
  .then(
    ([a, b]) =>
      (projects.value = Array.from(
        new Map([...a.items, ...b.items].map((p) => [p.slug, p])).values(),
      )),
  )
  .catch(() => {});
function openEditor(report?: Report) {
  editing.value = report || null;
  Object.assign(
    form,
    report
      ? {
          project_slug: report.project_slug,
          title: report.title,
          build: report.build,
          severity: report.severity,
          steps: report.steps,
          expected: report.expected,
          actual: report.actual,
          environment: report.environment,
        }
      : {
          project_slug: projects.value[0]?.slug || "",
          title: "",
          build: "",
          severity: "normal",
          steps: "",
          expected: "",
          actual: "",
          environment: "",
        },
  );
  editor.value = true;
}
async function save() {
  busy.value = true;
  try {
    await api(
      "/workspace/reports" + (editing.value ? "/" + editing.value.id : ""),
      {
        method: editing.value ? "PUT" : "POST",
        private: true,
        body: {
          ...form,
          ...(editing.value
            ? { expected_revision: editing.value.revision }
            : {}),
        },
      },
    );
    editor.value = false;
    notify("Отчёт сохранён");
    await reload();
  } catch (e) {
    notify(errorMessage(e), true);
  } finally {
    busy.value = false;
  }
}
async function changeStatus(report: Report, value: string) {
  try {
    const updated = await api<Report>(
      "/workspace/reports/" + report.id + "/status",
      {
        method: "PATCH",
        private: true,
        body: { status: value, expected_revision: report.revision },
      },
    );
    opened.value = updated;
    notify("Статус обновлён");
    await reload();
  } catch (e) {
    notify(errorMessage(e), true);
  }
}
async function remove(report: Report) {
  if (!window.confirm("Удалить отчёт «" + report.title + "»?")) return;
  try {
    await api(
      "/workspace/reports/" +
        report.id +
        "?expected_revision=" +
        report.revision,
      { method: "DELETE", private: true },
    );
    opened.value = null;
    notify("Отчёт удалён");
    await reload();
  } catch (e) {
    notify(errorMessage(e), true);
  }
}
</script>
<template>
  <div>
    <header class="workspace-heading split">
      <div>
        <span class="eyebrow">ОБРАТНАЯ СВЯЗЬ О ПРОЕКТАХ</span>
        <h1>Тестирование<span class="accent">.</span></h1>
        <p>
          Отчёты видны автору, руководителям и назначенным разработчикам
          проекта.
        </p>
      </div>
      <button
        v-if="canSome('reports.create')"
        class="button"
        @click="openEditor()"
      >
        <Icon name="plus" :size="17" />Новый отчёт
      </button>
    </header>
    <div class="filter-tabs report-filters">
      <button
        v-for="status in [
          'all',
          'open',
          'triaged',
          'in_progress',
          'resolved',
          'closed',
        ]"
        :key="status"
        :class="{ active: filter === status }"
        @click="filter = status"
      >
        {{ status === "all" ? "Все" : labels[status] }}
      </button>
    </div>
    <LoadState :loading="loading" :error="error" @retry="reload"
      ><div class="report-list">
        <button
          v-for="report in filtered"
          :key="report.id"
          class="report-row"
          @click="opened = report"
        >
          <span class="report-severity" :class="report.severity"
            ><Icon name="comment" :size="20"
          /></span>
          <div>
            <h3>{{ report.title }}</h3>
            <p>
              {{
                projects.find((p) => p.slug === report.project_slug)?.title ||
                report.project_slug
              }}
              · {{ report.build }} · {{ shortDate(report.created_at) }}
            </p>
          </div>
          <StatusBadge :status="report.status" /><Icon
            name="right"
            :size="17"
          />
        </button>
      </div>
      <EmptyState
        v-if="!filtered.length"
        title="Отчётов пока нет"
        text="Замечания о механиках, ошибках и впечатлениях помогут сделать проект лучше."
        icon="comment" /><Pagination
        :offset="offset"
        :limit="limit"
        :count="data?.items.length || 0"
        @change="offset = $event" /></LoadState
    ><Modal
      v-model:open="editor"
      :title="editing ? 'Редактировать отчёт' : 'Новый отчёт'"
      wide
      :busy="busy"
      ><form class="form-stack" @submit.prevent="save">
        <div class="form-columns">
          <label
            >Проект<select
              v-model="form.project_slug"
              :disabled="!!editing"
              required
            >
              <option v-for="project in projects" :value="project.slug">
                {{ project.title }}
              </option>
            </select></label
          ><label
            >Версия игры или сборка<input
              v-model="form.build"
              required
              maxlength="80"
              placeholder="Например, 0.2.1"
          /></label>
        </div>
        <label
          >Заголовок<input
            v-model="form.title"
            required
            minlength="3"
            maxlength="160"
            placeholder="Коротко: что произошло?" /></label
        ><label
          >Важность<select v-model="form.severity">
            <option
              v-for="severity in ['minor', 'normal', 'major', 'critical']"
              :value="severity"
            >
              {{ labels[severity] }}
            </option>
          </select></label
        ><label
          >Шаги воспроизведения<textarea
            v-model="form.steps"
            required
            rows="5"
            maxlength="10000"
            placeholder="1. Открыть…&#10;2. Нажать…"
          />
        </label>
        <div class="form-columns">
          <label
            >Ожидаемый результат<textarea
              v-model="form.expected"
              required
              rows="4"
              maxlength="5000"
            /></label
          ><label
            >Что получилось<textarea
              v-model="form.actual"
              required
              rows="4"
              maxlength="5000"
            />
          </label>
        </div>
        <label
          >Устройство и условия<textarea
            v-model="form.environment"
            rows="2"
            maxlength="500"
            placeholder="Модель, ОС и другие детали"
          /></label
        ><button class="button" :disabled="busy">
          Сохранить отчёт<Icon name="check" :size="17" />
        </button></form></Modal
    ><Modal
      :open="!!opened"
      :title="opened?.title || 'Отчёт'"
      wide
      @update:open="!$event && (opened = null)"
      ><template v-if="opened"
        ><div class="badge-row">
          <StatusBadge :status="opened.status" /><StatusBadge
            :status="opened.severity"
          /><span class="badge muted">{{ opened.build }}</span>
        </div>
        <div class="report-details">
          <section
            v-for="[key, title] in [
              ['steps', 'Шаги воспроизведения'],
              ['expected', 'Ожидалось'],
              ['actual', 'Получилось'],
              ['environment', 'Окружение'],
            ]"
            :key="key"
          >
            <h3>{{ title }}</h3>
            <p class="plain-text">{{ opened[key as keyof Report] }}</p>
          </section>
        </div>
        <div
          v-if="can('reports.triage', opened.project_slug)"
          class="form-stack"
        >
          <label
            >Состояние<select
              :value="opened.status"
              @change="
                changeStatus(
                  opened!,
                  ($event.target as HTMLSelectElement).value,
                )
              "
            >
              <option
                v-for="status in [
                  'open',
                  'triaged',
                  'in_progress',
                  'resolved',
                  'closed',
                ]"
                :value="status"
              >
                {{ labels[status] }}
              </option>
            </select></label
          >
        </div>
        <div class="button-row">
          <button
            v-if="
              (opened.author_id === auth.access?.account_id ||
                auth.access?.owner) &&
              can('reports.edit', opened.project_slug)
            "
            class="button secondary"
            @click="
              openEditor(opened);
              opened = null;
            "
          >
            <Icon name="edit" :size="17" />Редактировать</button
          ><button
            v-if="
              (opened.author_id === auth.access?.account_id ||
                auth.access?.owner) &&
              can('reports.delete', opened.project_slug)
            "
            class="button ghost danger-text"
            @click="remove(opened)"
          >
            <Icon name="delete" :size="17" />Удалить
          </button>
        </div></template
      ></Modal
    >
  </div>
</template>
