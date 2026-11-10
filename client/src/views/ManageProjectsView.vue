<script setup lang="ts">
import PageLink from "../components/PageLink.vue";
import { ref, reactive, watch } from "vue";
import { api } from "../lib/api";
import { resource } from "../lib/resource";
import { auth, can, canSome, refreshAccess } from "../stores/auth";
import { covers, coverLabels, labels } from "../lib/content";
import { slugify } from "../lib/roles";
import { notify } from "../stores/notices";
import { errorMessage } from "../lib/errors";
import { saveDraft, readDraft, removeDraft } from "../lib/drafts";
import type { Project, Page, UserSummary } from "../lib/types";
import Icon from "../components/Icon.vue";
import LoadState from "../components/LoadState.vue";
import EmptyState from "../components/EmptyState.vue";
import Modal from "../components/Modal.vue";
import StatusBadge from "../components/StatusBadge.vue";
import TrashDialog from "../components/TrashDialog.vue";
const state=ref("active"), removing=ref<Project|null>(null);
const capable=(p:Project,action:"edit"|"publish"|"delete"|"assign")=>p.capabilities?.[action]??!!auth.access?.owner;
const { data, loading, error, reload } = resource(() =>
  api<Page<Project>>("/workspace/projects?limit=50&state="+state.value, { private: true }),
[state]);
const editor = ref(false),
  editing = ref<Project | null>(null),
  busy = ref(false),
  slugTouched = ref(false),
  selected = ref<Project | null>(null),
  members = ref<{ account_id: string; kind: string }[]>([]),
  users = ref<UserSummary[]>([]),
  memberId = ref(""),
  memberKind = ref("developer");
const form = reactive({
  slug: "",
  title: "",
  summary: "",
  description: "",
  kind: "game",
  status: "development",
  cover: "worlds",
  published: false,
  expected_revision: 1,
});
function open(project?: Project) {
  editing.value = project || null;
  slugTouched.value = !!project;
  Object.assign(
    form,
    project
      ? { ...project, expected_revision: project.revision }
      : {
          slug: "",
          title: "",
          summary: "",
          description: "",
          kind: "game",
          status: "development",
          cover: "worlds",
          published: false,
          expected_revision: 1,
        },
  );
  editor.value = true;
}
watch(
  () => form.title,
  (value) => {
    if (!editing.value && !slugTouched.value) form.slug = slugify(value);
  },
);
watch(data, (page) => {
  if (page) {
    const draft = readDraft<any>("project-editor");
    if (draft) {
      open(
        draft.slug ? page.items.find((p) => p.slug === draft.slug) : undefined,
      );
      Object.assign(form, draft.form);
      removeDraft("project-editor");
    }
  }
});
function remember() {
  saveDraft("project-editor", {
    slug: editing.value?.slug || null,
    form: { ...form },
  });
}
async function save() {
  busy.value = true;
  try {
    const { slug, kind, ...rest } = form;
    const payload = editing.value
      ? {
          title: rest.title,
          summary: rest.summary,
          description: rest.description,
          status: rest.status,
          cover: rest.cover,
          published: rest.published,
          expected_revision: rest.expected_revision,
        }
      : {
          slug,
          kind,
          title: rest.title,
          summary: rest.summary,
          description: rest.description,
          status: rest.status,
          cover: rest.cover,
          published: rest.published,
        };
    await api(
      "/workspace/projects" + (editing.value ? "/" + editing.value.slug : ""),
      { method: editing.value ? "PUT" : "POST", private: true, body: payload },
    );
    editor.value = false;
    removeDraft("project-editor");
    notify(editing.value ? "Проект обновлён" : "Проект создан");
    await reload();
  } catch (e) {
    notify(errorMessage(e), true);
  } finally {
    busy.value = false;
  }
}
async function openMembers(project: Project) {
  selected.value = project;
  try {
    const [m, u] = await Promise.all([
      api<Page<{ account_id: string; kind: string }>>(
        "/workspace/projects/" + project.slug + "/members",
        { private: true },
      ),
      api<Page<UserSummary>>("/staff/users?limit=50", { private: true }).catch(
        () => ({ items: [] }),
      ),
    ]);
    members.value = m.items;
    users.value = u.items;
  } catch (e) {
    notify(errorMessage(e), true);
  }
}
async function modifyMembers(removeId?: string) {
  if (!selected.value) return;
  busy.value = true;
  try {
    await api(
      "/workspace/projects/" +
        selected.value.slug +
        "/members" +
        (removeId ? "/" + removeId : ""),
      {
        private: true,
        method: removeId ? "DELETE" : "PUT",
        body: removeId
          ? undefined
          : { account_id: memberId.value, kind: memberKind.value },
      },
    );
    await openMembers(selected.value);
    memberId.value = "";
    notify("Участники проекта обновлены");
    await refreshAccess();
  } catch (e) {
    notify(errorMessage(e), true);
  } finally {
    busy.value = false;
  }
}
async function trashProject(payload:{confirmation:string;expected_revision:number;reason:string}){if(!removing.value)return;busy.value=true;try{const row=removing.value;await api('/workspace/projects/'+row.slug+(row.deleted_at?'/restore':''),{private:true,method:row.deleted_at?'POST':'DELETE',body:payload});notify(row.deleted_at?'Проект восстановлен как скрытый':'Проект перемещён в корзину');removing.value=null;await Promise.all([reload(),refreshAccess()]);}catch(e){notify(errorMessage(e),true)}finally{busy.value=false;}}
async function publishProject(project:Project){busy.value=true;try{await api('/workspace/projects/'+project.slug+'/publication',{private:true,method:'PATCH',body:{published:!project.published,expected_revision:project.revision}});notify(project.published?'Проект скрыт':'Проект опубликован');await reload();}catch(e){notify(errorMessage(e),true)}finally{busy.value=false;}}
async function release(project: Project) {
  if (
    !window.confirm(
      "Разрешить назначенным участникам изменять проект «" +
        project.title +
        "»?",
    )
  )
    return;
  try {
    await api("/workspace/projects/" + project.slug + "/release-protection", {
      private: true,
      method: "POST",
    });
    notify("Проект доступен назначенным участникам");
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
        <span class="eyebrow">КАТАЛОГ И КОМАНДА</span>
        <h1>Проекты<span class="accent">.</span></h1>
        <p>
          Поддерживай описания в актуальном состоянии и назначай участников.
        </p>
      </div>
      <button v-if="state==='active'&&can('projects.create')" class="button" @click="open()">
        <Icon name="plus" :size="17" />Новый проект
      </button>
    </header>
    <div class="filter-tabs"><button :class="{active:state==='active'}" @click="state='active'">Действующие</button><button v-if="canSome('projects.delete')||canSome('projects.delete_any')" :class="{active:state==='deleted'}" @click="state='deleted'">Корзина</button></div>
    <p class="field-note">Доверенный проект даёт область работы. Конкретные действия — редактирование, публикация, участники и удаление — определяются отдельно в роли.</p>
    <LoadState
      :loading="loading"
      :error="error"
      @retry="reload"
      ><div class="managed-projects">
        <article
          v-for="project in data?.items"
          :key="project.slug"
          class="managed-project panel"
        >
          <img
            v-if="covers[project.cover]"
            :src="covers[project.cover]"
            :alt="project.title"
            width="340"
            height="210"
          />
          <div class="managed-project-body">
            <div class="badge-row">
              <StatusBadge :status="project.status" /><span
                class="badge muted"
                >{{ project.published ? "На сайте" : "Скрытый" }}</span
              ><span v-if="project.owner_protected" class="protected-label"
                ><Icon name="shield" :size="12" />Защита Owner</span
              >
            </div>
            <h2>{{ project.title }}</h2>
            <p>{{ project.summary }}</p>
            <div class="button-row">
              <button
                v-if="!project.deleted_at&&capable(project,'edit')"
                class="button secondary small"
                @click="open(project)"
              >
                <Icon name="edit" :size="16" />Редактировать</button
              ><button
                v-if="!project.deleted_at&&capable(project,'assign')"
                class="button secondary small"
                @click="openMembers(project)"
              >
                <Icon name="users" :size="16" />Участники</button
              ><button v-if="!project.deleted_at&&capable(project,'publish')" class="button secondary small" :disabled="busy" @click="publishProject(project)"><Icon name="eye" :size="16"/>{{project.published?'Скрыть':'Опубликовать'}}</button><button v-if="capable(project,'delete')" class="button secondary small" :class="{'danger-text':!project.deleted_at}" :disabled="busy" @click="removing=project"><Icon :name="project.deleted_at?'undo':'delete'" :size="16"/>{{project.deleted_at?'Восстановить':'Удалить'}}</button><PageLink
                v-if="project.published"
                :to="'/projects/' + project.slug + '/'"
                class="icon-button"
                aria-label="Открыть проект"
                ><Icon name="out" :size="18"
              /></PageLink>
            </div>
            <button
              v-if="!project.deleted_at&&auth.access?.owner && project.owner_protected"
              class="text-button small"
              @click="release(project)"
            >
              Открыть редактирование для команды
            </button>
          </div>
        </article>
      </div>
      <EmptyState
        v-if="!data?.items.length"
        title="Новый проект начинается здесь"
        text="Назначенные тебе проекты появятся в этом разделе."
        icon="projects" /></LoadState
    ><Modal
      v-model:open="editor"
      :title="editing ? 'Редактировать проект' : 'Новый проект'"
      wide
      :busy="busy"
      ><form class="form-stack" @submit.prevent="save">
        
        <div class="form-columns">
          <label
            >Название<input
              v-model="form.title"
              required
              minlength="2"
              maxlength="120" /></label
          ><label
            >Адрес проекта<input
              v-model="form.slug"
              :disabled="!!editing"
              @input="slugTouched = true"
              pattern="[a-z][a-z0-9-]{1,63}"
              minlength="2"
              maxlength="64"
              required
            /><small>Латиница, цифры и дефисы.</small></label
          >
        </div>
        <label
          >Короткое описание<textarea
            v-model="form.summary"
            required
            rows="2"
            maxlength="500"
          /></label
        ><label
          >Подробное описание<textarea
            v-model="form.description"
            rows="8"
            maxlength="20000"
          />
        </label>
        <div class="form-columns">
          <label v-if="!editing"
            >Направление<select v-model="form.kind">
              <option value="game">Игра</option>
              <option value="software">Приложение</option>
              <option value="web">Веб-проект</option>
            </select></label
          ><label
            >Статус<select v-model="form.status">
              <option
                v-for="status in [
                  'development',
                  'testing',
                  'released',
                  'paused',
                ]"
                :value="status"
              >
                {{ labels[status] }}
              </option>
            </select></label
          ><label
            >Обложка<select v-model="form.cover">
              <option v-for="(label, key) in coverLabels" :value="key">
                {{ label }}
              </option>
            </select></label
          >
        </div>
        <label v-if="editing?capable(editing,'publish'):(can('projects.publish')||can('projects.publish_any'))" class="checkbox-label"
          ><input v-model="form.published" type="checkbox" />Показывать проект в
          публичном каталоге</label
        ><button
          class="button"
          :disabled="busy"
        >
          Сохранить проект<Icon name="check" :size="17" />
        </button></form></Modal
    ><Modal
      :open="!!selected"
      :title="'Участники · ' + (selected?.title || '')"
      wide
      :busy="busy"
      @update:open="!$event && (selected = null)"
      >
      <div
        v-for="member in members"
        :key="member.account_id"
        class="personal-rule"
      >
        <span class="avatar small"><Icon name="user" :size="17" /></span>
        <div>
          <strong>{{
            users.find((u) => u.id === member.account_id)?.display_name ||
            "Участник AGL"
          }}</strong>
          <p>
            {{ member.kind === "developer" ? "Разработчик" : "Тестировщик" }} ·
            {{ member.account_id.slice(0, 8) }}
          </p>
        </div>
        <button
          class="icon-button danger-text"
          aria-label="Удалить из проекта"
          :disabled="busy"
          @click="modifyMembers(member.account_id)"
        >
          <Icon name="delete" :size="16" />
        </button>
      </div>
      <form class="form-stack inset-form" @submit.prevent="modifyMembers()">
        <h3>Добавить участника</h3>
        <label v-if="users.length"
          >Аккаунт<select v-model="memberId" required>
            <option value="" disabled>Выбери участника</option>
            <option v-for="user in users" :key="user.id" :value="user.id">
              {{ user.display_name || "Без имени" }} · {{ user.id.slice(0, 8) }}
            </option>
          </select></label
        ><label v-else
          >ID аккаунта<input
            v-model="memberId"
            required
            placeholder="UUID из профиля участника" /></label
        ><label
          >Роль в проекте<select v-model="memberKind">
            <option value="developer">Разработчик</option>
            <option value="tester">Тестировщик</option>
          </select></label
        ><button class="button" :disabled="busy">
          Назначить на проект<Icon name="plus" :size="17" />
        </button></form
    ></Modal>
    <TrashDialog :open="!!removing" :title="removing?.deleted_at?'Восстановить проект?':'Удалить проект?'" :target="removing?.slug||''" :revision="removing?.revision||1" :restore="!!removing?.deleted_at" :busy="busy" :description="removing?.deleted_at?'Проект вернётся скрытым. Опубликовать его можно отдельным действием.':'Проект «'+(removing?.title||'')+'» исчезнет из публичного каталога, связанные новости будут скрыты. Материалы, участники и игровые сохранения сохраняются. Проект можно восстановить.'" @update:open="!$event&&(removing=null)" @confirm="trashProject"/>
  </div>
</template>
