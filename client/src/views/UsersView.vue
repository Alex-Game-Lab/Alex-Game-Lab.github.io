<script setup lang="ts">
import { ref, reactive, watch, computed } from "vue";
import { api } from "../lib/api";
import { resource } from "../lib/resource";
import { auth, freshPassword } from "../stores/auth";
import { notify } from "../stores/notices";
import { errorMessage } from "../lib/errors";
import { date } from "../lib/content";
import { saveDraft, readDraft, removeDraft } from "../lib/drafts";
import type {
  Page,
  UserSummary,
  Role,
  Permission,
  Project,
} from "../lib/types";
import Icon from "../components/Icon.vue";
import LoadState from "../components/LoadState.vue";
import Modal from "../components/Modal.vue";
import Pagination from "../components/Pagination.vue";
import ConfirmationBanner from "../components/ConfirmationBanner.vue";
const search = ref(""),
  query = ref(""),
  offset = ref(0),
  limit = 15,
  selected = ref<UserSummary | null>(null),
  selectedRoles = ref<string[]>([]),
  busy = ref(false),
  tab = ref("roles"),
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
        encodeURIComponent(query.value),
      { private: true },
    ),
  [offset, query],
);
void Promise.all([
  api<Page<Role>>("/staff/roles", { private: true }),
  api<Page<Permission>>("/staff/permissions", { private: true }),
  api<Page<Project>>("/workspace/projects?limit=50", { private: true }),
])
  .then(([r, p, g]) => {
    roles.value = r.items;
    permissions.value = p.items;
    projects.value = g.items;
  })
  .catch(() => {});
async function open(user: UserSummary) {
  try {
    selected.value = await api<UserSummary>("/staff/users/" + user.id, {
      private: true,
    });
    selectedRoles.value = [...(selected.value.roles || [])];
    tab.value = "roles";
  } catch (e) {
    notify(errorMessage(e), true);
  }
}
async function refreshSelected() {
  if (selected.value)
    selected.value = await api<UserSummary>(
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
    await Promise.all([refreshSelected(), reload()]);
  } catch (e) {
    notify(errorMessage(e), true);
  } finally {
    busy.value = false;
  }
}
const expiry = (value: string) =>
  value ? new Date(value).toISOString() : null;
async function saveRoles() {
  if (selected.value)
    await perform(
      () =>
        api("/staff/users/" + selected.value!.id + "/roles", {
          private: true,
          method: "PUT",
          body: { roles: selectedRoles.value },
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
      roles: selectedRoles.value,
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
      selectedRoles.value = restored.roles;
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
    <ConfirmationBanner @prepare="preserveChanges" />
    <div class="catalog-tools">
      <span class="muted small">Ищи по имени в профиле</span
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
            <strong>{{ user.display_name || "Участник AGL" }}</strong
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
      :title="selected?.display_name || 'Профиль участника'"
      wide
      :busy="busy"
      @update:open="!$event && (selected = null)"
      ><template v-if="selected"
        ><p class="small muted mono">{{ selected.id }}</p>
        <ConfirmationBanner @prepare="preserveChanges" />
        <div class="filter-tabs modal-tabs">
          <button :class="{ active: tab === 'roles' }" @click="tab = 'roles'">
            Роли</button
          ><button
            v-if="auth.access?.owner"
            :class="{ active: tab === 'permissions' }"
            @click="tab = 'permissions'"
          >
            Личные права</button
          ><button :class="{ active: tab === 'bans' }" @click="tab = 'bans'">
            Ограничения
          </button>
        </div>
        <form
          v-if="tab === 'roles'"
          class="form-stack"
          @submit.prevent="saveRoles"
        >
          <label
            v-for="role in roles"
            :key="role.slug"
            class="role-assignment"
            :class="{ disabled: !role.editable }"
            ><input
              v-model="selectedRoles"
              type="checkbox"
              :value="role.slug"
              :disabled="!role.editable || !freshPassword"
            /><span class="role-dot" :style="{ background: role.color }"></span>
            <div>
              <strong>{{ role.title }}</strong
              ><small>{{ role.description || role.slug }}</small>
            </div>
            <span class="small muted"
              >{{ role.permissions.length }} прав</span
            ></label
          ><button class="button" :disabled="busy || !freshPassword">
            Сохранить назначения<Icon name="check" :size="17" />
          </button>
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
              class="icon-button danger-text"
              aria-label="Удалить персональное правило"
              :disabled="busy || !freshPassword"
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
          <form class="form-stack inset-form" @submit.prevent="addOverride">
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
            ><button class="button" :disabled="busy || !freshPassword">
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
              v-if="!item.revoked_at"
              class="button secondary small"
              :disabled="busy || !freshPassword"
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
          <form class="form-stack inset-form" @submit.prevent="addBan">
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
            ><button class="button danger" :disabled="busy || !freshPassword">
              Применить ограничение<Icon name="lock" :size="16" />
            </button>
          </form></div></template
    ></Modal>
  </div>
</template>
