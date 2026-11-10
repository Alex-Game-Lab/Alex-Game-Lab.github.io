<script setup lang="ts">
import { ref, reactive, watch, computed } from "vue";
import { api } from "../lib/api";
import { resource } from "../lib/resource";
import { auth, can, refreshAccess } from "../stores/auth";
import { notify } from "../stores/notices";
import { errorMessage } from "../lib/errors";
import { date } from "../lib/content";
import { saveDraft, readDraft, removeDraft } from "../lib/drafts";
import type {
  Page,
  UserSummary,
  UserDetail,
  Role,
  Permission,
  Project,
} from "../lib/types";
import Icon from "../components/Icon.vue";
import LoadState from "../components/LoadState.vue";
import Modal from "../components/Modal.vue";
import Pagination from "../components/Pagination.vue";
import AccountNotes from "../components/AccountNotes.vue";
import TrashDialog from "../components/TrashDialog.vue";
const state=ref("active"), trashOpen=ref(false);
const search = ref(""),
  query = ref(""),
  offset = ref(0),
  limit = 15,
  selected = ref<UserDetail | null>(null),
  selectedRole = ref("player"),
  busy = ref(false),
  tab = ref("overview"),
  roles = ref<Role[]>([]),
  permissions = ref<Permission[]>([]),
  projects = ref<Project[]>([]);
let timer: ReturnType<typeof setTimeout>;
const override = reactive({
    permission: "",
    effect: "allow",
    project_slug: "",
    expires_at: "",
    reason: "",
  }),
  ban = reactive({ project_slug: "", expires_at: "", reason: "" });
watch(search, (value) => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    query.value = value;
    offset.value = 0;
  }, 300);
});
const { data, loading, error, reload } = resource(
  () =>
    api<Page<UserSummary>>(
      "/staff/users?limit=" +
        limit +
        "&offset=" +
        offset.value +
        "&search=" +
        encodeURIComponent(query.value) + "&state=" + state.value,
      { private: true },
    ),
  [offset, query, state],
);
void Promise.all([
  api<Page<Role>>("/staff/roles", { private: true }),
  api<Page<Permission>>("/staff/permissions", { private: true }),
  api<Page<Project>>("/workspace/projects?limit=50", { private: true }),
])
  .then(([r, p, g]) => {
    roles.value = r.items;
    permissions.value = p.items.filter(x=>!x.legacy);
    projects.value = g.items;
  })
  .catch(() => {});
async function open(user: UserSummary) {
  try {
    selected.value = await api<UserDetail>("/staff/users/" + user.id, {
      private: true,
    });
    selectedRole.value = selected.value.roles?.[0] || "player";
    tab.value = "overview";
  } catch (e) {
    notify(errorMessage(e), true);
  }
}
async function refreshSelected() {
  if (selected.value)
    selected.value = await api<UserDetail>(
      "/staff/users/" + selected.value.id,
      { private: true },
    );
}
async function perform(work: () => Promise<unknown>, message: string) {
  busy.value = true;
  try {
    await work();
    removeDraft("user-edit");
    notify(message);
    await Promise.all([refreshSelected(), reload(), refreshAccess()]);
  } catch (e) {
    notify(errorMessage(e), true);
  } finally {
    busy.value = false;
  }
}
watch(state,()=>offset.value=0);
async function trashAccount(payload:{confirmation:string;expected_revision:number;reason:string}){if(!selected.value)return;const row=selected.value;await perform(async()=>{await api("/staff/users/"+row.id+(row.deleted_at?"/restore":""),{private:true,method:row.deleted_at?"POST":"DELETE",body:payload});trashOpen.value=false;},row.deleted_at?"Аккаунт восстановлен":"Аккаунт перемещён в корзину");}
const expiry = (value: string) =>
  value ? new Date(value).toISOString() : null;
async function saveRoles() {
  if (selected.value)
    await perform(
      () =>
        api("/staff/users/" + selected.value!.id + "/roles", {
          private: true,
          method: "PUT",
          body: { roles: [selectedRole.value] },
        }),
      "Роли обновлены",
    );
}
async function addOverride() {
  if (selected.value)
    await perform(
      () =>
        api("/staff/users/" + selected.value!.id + "/overrides", {
          private: true,
          method: "POST",
          body: {
            ...override,
            project_slug: override.project_slug || null,
            expires_at: expiry(override.expires_at),
          },
        }),
      "Персональное правило добавлено",
    );
}
async function addBan() {
  if (selected.value)
    await perform(
      () =>
        api("/staff/users/" + selected.value!.id + "/bans", {
          private: true,
          method: "POST",
          body: {
            ...ban,
            project_slug: ban.project_slug || null,
            expires_at: expiry(ban.expires_at),
          },
        }),
      "Ограничение добавлено",
    );
}

function preserveChanges() {
  if (selected.value)
    saveDraft("user-edit", {
      id: selected.value.id,
      roles: [selectedRole.value],
      tab: tab.value,
      override: { ...override },
      ban: { ...ban },
    });
}
const restored = readDraft<{
  id: string;
  roles: string[];
  tab: string;
  override: typeof override;
  ban: typeof ban;
}>("user-edit");
if (restored)
  void open({ id: restored.id } as UserSummary).then(() => {
    if (selected.value) {
      selectedRole.value = restored.roles?.[0] || "player";
      tab.value = restored.tab;
      Object.assign(override, restored.override);
      Object.assign(ban, restored.ban);
    }
    removeDraft("user-edit");
  });
</script>
<template>
  <div>
    <header class="workspace-heading">
      <span class="eyebrow">КОМАНДА И АККАУНТЫ</span>
      <h1>Участники<span class="accent">.</span></h1>
      <p>Профили, назначения ролей и персональные правила доступа.</p>
    </header>
    
    <div class="filter-tabs"><button :class="{active:state==='active'}" @click="state='active'">Действующие</button><button v-if="can('users.delete')" :class="{active:state==='deleted'}" @click="state='deleted'">Корзина</button></div>
    <div class="catalog-tools">
      <span class="muted small">По регистрационному нику, имени профиля или ID</span
      ><label class="search-field"
        ><Icon name="search" :size="17" /><input
          v-model="search"
          type="search"
          placeholder="Найти участника"
          aria-label="Найти участника"
      /></label>
    </div>
    <LoadState :loading="loading" :error="error" @retry="reload"
      ><div class="users-list">
        <button
          v-for="user in data?.items"
          :key="user.id"
          class="user-row"
          @click="open(user)"
        >
          <span class="avatar"><Icon name="user" /></span>
          <div>
            <strong>{{ user.username || user.display_name || "Аккаунт " + user.id.slice(0,8) }}</strong
            ><small>В AGL с {{ date(user.created_at) }}</small>
          </div>
          <span class="mono small user-id">{{ user.id.slice(0, 8) }}</span
          ><Icon name="right" :size="18" />
        </button>
      </div>
      <p v-if="!data?.items.length" class="quiet-state">
        Участники не найдены.
      </p>
      <Pagination
        :offset="offset"
        :limit="limit"
        :count="data?.items.length || 0"
        @change="offset = $event"
    /></LoadState>
    <Modal
      :open="!!selected"
      :title="selected?.username || selected?.display_name || 'Карточка аккаунта'"
      wide
      :busy="busy"
      @update:open="!$event && (selected = null)"
      ><template v-if="selected"
        ><p class="small muted mono break-word">{{ selected.id }}</p><div class="badge-row"><span v-if="selected.is_owner" class="badge">Owner</span><span class="badge" :class="{'badge-critical':selected.deleted_at}">{{selected.deleted_at?'В корзине':'Действующий аккаунт'}}</span></div>
        
        <div class="filter-tabs modal-tabs account-tabs">
          <button :class="{active:tab==='overview'}" @click="tab='overview'">Об аккаунте</button><button :class="{active:tab==='notes'}" @click="tab='notes'">Закрытые заметки</button>
          <button :class="{ active: tab === 'roles' }" @click="tab = 'roles'">
            Роли</button
          ><button
            :class="{ active: tab === 'permissions' }"
            @click="tab = 'permissions'"
          >
            Личные права</button
          ><button :class="{ active: tab === 'bans' }" @click="tab = 'bans'">
            Ограничения
          </button>
        </div>
        <section v-if="tab==='overview'" class="account-overview">
          <dl class="account-facts"><div><dt>Регистрационный ник</dt><dd>{{selected.username||'Не получен из AGL ID'}}</dd></div><div><dt>Имя профиля</dt><dd>{{selected.display_name||'Не указано'}}</dd></div><div><dt>Язык</dt><dd>{{selected.locale}}</dd></div><div><dt>Создан</dt><dd>{{date(selected.created_at)}}</dd></div><div><dt>Профиль обновлён</dt><dd>{{date(selected.updated_at)}}</dd></div><div><dt>Версия профиля</dt><dd>{{selected.revision}}</dd></div><div v-if="selected.deleted_at"><dt>В корзине с</dt><dd>{{date(selected.deleted_at)}}</dd></div></dl>
          <h3>Описание профиля</h3><p class="note-body">{{selected.bio||'Не заполнено'}}</p>
          <h3>Роли</h3><div class="badge-row"><span v-if="selected.is_owner" class="badge">Owner · полный доступ</span><span v-for="r in selected.is_owner?[]:selected.role_details" :key="r.slug" class="badge">{{r.title}}</span><span v-if="!selected.is_owner&&!selected.role_details.length" class="muted">Базовый аккаунт</span></div>
          <h3>Доверенные проекты</h3><ul v-if="selected.projects.length" class="account-memberships"><li v-for="p in selected.projects" :key="p.slug"><strong>{{p.title}}</strong><span>{{p.kind==='developer'?'Разработчик':'Тестировщик'}}{{p.deleted_at?' · проект в корзине':''}}</span></li></ul><p v-else class="muted">Назначений нет.</p>
          <h3>Материалы и игра</h3><dl class="account-facts"><div v-for="(label,key) in {publications:'Публикации',reports:'Отчёты',reviews:'Отзывы',save_slots:'Слоты сохранений'}" :key="key"><dt>{{label}}</dt><dd>{{selected.activity[key]||0}}</dd></div></dl>
          <details><summary>Действующие общие права · {{selected.effective_permissions.length}}</summary><ul class="account-permissions"><li v-for="id in selected.effective_permissions" :key="id">{{permissions.find(p=>p.id===id)?.title||id}}</li></ul><p class="field-note">Права на отдельные проекты и запреты показаны во вкладке «Личные права»; ограничения действуют поверх разрешений.</p></details>
          <p class="field-note">Здесь данные профиля и связанные записи API. Пароли, почта AGL ID и содержимое сохранений не выводятся. Дата обновления профиля не является датой последнего входа.</p>
          <button v-if="selected.capabilities.delete" class="button" :class="selected.deleted_at?'secondary':'danger'" @click="trashOpen=true"><Icon :name="selected.deleted_at?'undo':'delete'"/>{{selected.deleted_at?'Восстановить аккаунт':'Удалить аккаунт'}}</button>
        </section>
        <AccountNotes v-if="tab==='notes'" :key="selected.id" :account-id="selected.id" :can-create="selected.capabilities.notes_create"/>
        <form
          v-if="tab === 'roles'"
          class="form-stack"
          @submit.prevent="saveRoles"
        >
          <p class="field-note">У аккаунта одна роль. «Игрок» назначается по умолчанию. Изменение своих данных и работа со своими сохранениями доступны без дополнительных разрешений.</p>
          <label>Роль аккаунта<select v-model="selectedRole" required :disabled="!selected.capabilities.assign_roles||busy"><option v-if="selected.is_owner" value="owner">Owner · закреплён за владельцем</option><option v-for="role in roles" :key="role.slug" :value="role.slug" :disabled="!role.assignable&&role.slug!==selectedRole">{{role.title}}{{role.slug==='player'?' · по умолчанию':''}}</option></select></label><p class="field-note">{{roles.find(r=>r.slug===selectedRole)?.description}}</p><button v-if="selected.capabilities.assign_roles" class="button" :disabled="busy">Сохранить роль<Icon name="check" :size="17"/></button>
        </form>
        <div v-if="tab === 'permissions'">
          <div
            v-for="item in selected.overrides"
            :key="item.id"
            class="personal-rule"
          >
            <span
              class="badge"
              :class="
                item.effect === 'deny' ? 'badge-critical' : 'badge-development'
              "
              >{{ item.effect === "deny" ? "Запрет" : "Допуск" }}</span
            >
            <div>
              <strong>{{
                permissions.find((p) => p.id === item.permission)?.title ||
                item.permission
              }}</strong>
              <p>
                {{ item.reason }} · {{ item.project_slug || "Все проекты" }}
              </p>
            </div>
            <button
              v-if="auth.access?.owner&&!selected.deleted_at"
              class="icon-button danger-text"
              aria-label="Удалить персональное правило"
              :disabled="busy"
              @click="
                perform(
                  () =>
                    api(
                      '/staff/users/' + selected!.id + '/overrides/' + item.id,
                      { method: 'DELETE', private: true },
                    ),
                  'Правило удалено',
                )
              "
            >
              <Icon name="delete" :size="17" />
            </button>
          </div>
          <form v-if="auth.access?.owner&&!selected.deleted_at" class="form-stack inset-form" @submit.prevent="addOverride">
            <h3>Новое персональное правило</h3>
            <label
              >Действие<select v-model="override.permission" required>
                <option value="" disabled>Выбери право</option>
                <option v-for="p in permissions" :key="p.id" :value="p.id">
                  {{ p.title }}
                </option>
              </select></label
            >
            <div class="form-columns">
              <label
                >Правило<select v-model="override.effect">
                  <option value="allow">Дополнительный доступ</option>
                  <option value="deny">Ограничить право</option>
                </select></label
              ><label
                >Область<select v-model="override.project_slug">
                  <option value="">Все проекты</option>
                  <option v-for="p in projects" :value="p.slug">
                    {{ p.title }}
                  </option>
                </select></label
              >
            </div>
            <label
              >До даты (необязательно)<input
                v-model="override.expires_at"
                type="datetime-local" /></label
            ><label
              >Причина<textarea
                v-model="override.reason"
                required
                minlength="3"
                maxlength="500"
                rows="2"
              /></label
            ><button class="button" :disabled="busy">
              Добавить правило<Icon name="plus" :size="16" />
            </button>
          </form>
        </div>
        <div v-if="tab === 'bans'">
          <div
            v-for="item in selected.bans"
            :key="item.id"
            class="personal-rule"
          >
            <Icon name="lock" />
            <div>
              <strong>{{
                item.revoked_at
                  ? "Снято"
                  : item.project_slug
                    ? "Проект " + item.project_slug
                    : "Весь аккаунт"
              }}</strong>
              <p>
                {{ item.reason }} ·
                {{
                  item.expires_at ? "До " + date(item.expires_at) : "Без срока"
                }}
              </p>
            </div>
            <button
              v-if="!item.revoked_at&&selected.capabilities.moderate"
              class="button secondary small"
              :disabled="busy"
              @click="
                perform(
                  () =>
                    api(
                      '/staff/users/' +
                        selected!.id +
                        '/bans/' +
                        item.id +
                        '/revoke',
                      {
                        method: 'POST',
                        private: true,
                        body: { reason: 'Ограничение снято администратором' },
                      },
                    ),
                  'Ограничение снято',
                )
              "
            >
              Снять
            </button>
          </div>
          <form v-if="selected.capabilities.moderate" class="form-stack inset-form" @submit.prevent="addBan">
            <h3>Ограничить доступ</h3>
            <label
              >Область<select v-model="ban.project_slug">
                <option value="">Весь аккаунт</option>
                <option v-for="p in projects" :value="p.slug">
                  {{ p.title }}
                </option>
              </select></label
            ><label
              >До даты (необязательно)<input
                v-model="ban.expires_at"
                type="datetime-local" /></label
            ><label
              >Причина<textarea
                v-model="ban.reason"
                required
                minlength="3"
                maxlength="500"
                rows="2"
              /></label
            ><button class="button danger" :disabled="busy">
              Применить ограничение<Icon name="lock" :size="16" />
            </button>
          </form></div></template
    ></Modal>
    <TrashDialog :open="trashOpen" :title="selected?.deleted_at?'Восстановить аккаунт?':'Удалить аккаунт?'" :target="selected?.id||''" :revision="selected?.revision||1" :restore="!!selected?.deleted_at" :busy="busy" :description="selected?.deleted_at?'Доступ к API, сохранённые данные и назначения ролей будут восстановлены.':'Аккаунт будет перемещён в корзину. Доступ к сайту и игровому API закроется сразу, включая текущие сессии. Учётная запись входа AGL ID и пароли не стираются; данные и роли сохраняются для восстановления.'" @update:open="trashOpen=$event" @confirm="trashAccount"/>
  </div>
</template>
