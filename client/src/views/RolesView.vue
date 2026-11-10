<script setup lang="ts">
import { ref, reactive, computed, watch } from "vue";
import { api } from "../lib/api";
import { resource } from "../lib/resource";
import { auth, can, refreshAccess } from "../stores/auth";
import { notify } from "../stores/notices";
import { errorMessage } from "../lib/errors";
import { permissionDiff, slugify, systemDescriptions } from "../lib/roles";
import { saveDraft, readDraft, removeDraft } from "../lib/drafts";
import type { Role, Permission, Page } from "../lib/types";
import Icon from "../components/Icon.vue";
import Modal from "../components/Modal.vue";
import TrashDialog from "../components/TrashDialog.vue";
import PermissionMatrix from "../components/PermissionMatrix.vue";
import LoadState from "../components/LoadState.vue";
const state = ref("active");
const { data, loading, error, reload } = resource(async () => {
  const [roles, permissions] = await Promise.all([
    api<Page<Role> & { delegable_permissions: string[] }>("/staff/roles?state=" + state.value, {
      private: true,
    }),
    api<Page<Permission>>("/staff/permissions", { private: true }),
  ]);
  return {
    roles: roles.items,
    permissions: permissions.items.filter(p => !p.legacy),
    delegable: roles.delegable_permissions,
  };
}, [state]);
const editorOpen = ref(false),
  editing = ref<Role | null>(null),
  removing = ref<Role | null>(null),
  busy = ref(false),
  search = ref(""),
  permissionSearch = ref(""),
  selectedOnly = ref(false),
  slugTouched = ref(false),
  restored = ref(false);
const form = reactive({
  slug: "",
  title: "",
  description: "",
  color: "#B6A3F5",
  permissions: [] as string[],
  expected_revision: 1,
});
const palette = [
  "#B6A3F5",
  "#C2FD78",
  "#78C9FD",
  "#F5B57C",
  "#F58FA8",
  "#9FDFC4",
];
const diff = computed(() =>
  permissionDiff(editing.value?.permissions || [], form.permissions),
);
const roles = computed(
  () =>
    data.value?.roles.filter((r) =>
      (r.title + " " + r.description + " " + r.slug)
        .toLocaleLowerCase("ru")
        .includes(search.value.toLocaleLowerCase("ru")),
    ) || [],
);
function setRole(role?: Role, duplicate = false) {
  editing.value = role && !duplicate ? role : null;
  slugTouched.value = !!role && !duplicate;
  permissionSearch.value = "";
  selectedOnly.value = false;
  Object.assign(
    form,
    role
      ? {
          slug: duplicate ? role.slug + "-copy" : role.slug,
          title: role.title + (duplicate ? " · копия" : ""),
          description: role.description || systemDescriptions[role.slug] || "",
          color: role.color || "#B6A3F5",
          permissions: [...role.permissions],
          expected_revision: role.revision,
        }
      : {
          slug: "",
          title: "",
          description: "",
          color: "#B6A3F5",
          permissions: [],
          expected_revision: 1,
        },
  );
  editorOpen.value = true;
}
watch(
  () => form.title,
  (value) => {
    if (!editing.value && !slugTouched.value) form.slug = slugify(value);
  },
);
watch(data, (value) => {
  if (value && !restored.value) {
    restored.value = true;
    const draft = readDraft<any>("role-editor");
    if (draft) {
      editing.value = draft.editing
        ? value.roles.find((r) => r.slug === draft.editing) || null
        : null;
      Object.assign(form, draft.form);
      slugTouched.value = true;
      editorOpen.value = true;
      removeDraft("role-editor");
      notify("Изменения роли восстановлены");
    }
  }
});
function remember() {
  saveDraft("role-editor", {
    form: { ...form },
    editing: editing.value?.slug || null,
  });
}
async function save() {
  busy.value = true;
  try {
    const payload = {
      title: form.title,
      description: form.description,
      color: form.color,
      permissions: form.permissions,
      ...(editing.value
        ? { expected_revision: form.expected_revision }
        : { slug: form.slug }),
    };
    await api(
      "/staff/roles" + (editing.value ? "/" + editing.value.slug : ""),
      { method: editing.value ? "PUT" : "POST", body: payload, private: true },
    );
    notify(editing.value ? "Роль обновлена" : "Роль создана");
    editorOpen.value = false;
    removeDraft("role-editor");
    await Promise.all([reload(), refreshAccess()]);
  } catch (e) {
    notify(errorMessage(e), true);
  } finally {
    busy.value = false;
  }
}
async function remove(payload: {confirmation:string;expected_revision:number;reason:string}) {
  if (!removing.value) return;
  busy.value = true;
  try {
    const restoring = !!removing.value.deleted_at;
    await api("/staff/roles/" + removing.value.slug + (restoring ? "/restore" : ""), {
      method: restoring ? "POST" : "DELETE",
      body: payload,
      private: true,
    });
    removing.value = null;
    notify(restoring ? "Роль восстановлена без назначений" : "Роль перемещена в корзину, назначения сняты");
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
        <span class="eyebrow">ДОСТУП И ВОЗМОЖНОСТИ</span>
        <h1>Роли и права<span class="accent">.</span></h1>
        <p>Понятные зоны ответственности для каждого участника.</p>
      </div>
      <button
        v-if="can('roles.create_basic')"
        class="button"
        @click="setRole()"
      >
        <Icon name="plus" :size="18" />Создать роль
      </button>
    </header>
    
    <div class="filter-tabs"><button :class="{active:state==='active'}" @click="state='active'">Действующие</button><button v-if="can('roles.delete_basic')" :class="{active:state==='deleted'}" @click="state='deleted'">Корзина</button></div>
    <div class="catalog-tools">
      <span class="small muted"
        >Ролей в списке: {{ data?.roles.length ?? 0 }}</span
      ><label class="search-field compact"
        ><Icon name="search" :size="17" /><input
          v-model="search"
          type="search"
          placeholder="Найти роль"
          aria-label="Найти роль"
      /></label>
    </div>
    <LoadState :loading="loading" :error="error" @retry="reload"
      ><div class="roles-grid">
        <article
          v-if="state==='active' && (!search || 'owner'.includes(search.toLowerCase()))"
          class="role-card owner-role"
        >
          <div class="role-card-top">
            <span class="role-emblem"><Icon name="crown" :size="24" /></span
            ><span class="protected-label"
              ><Icon name="lock" :size="12" />Владелец</span
            >
          </div>
          <h2>Owner</h2>
          <p>
            Единственный владелец AGL. Полный доступ, защита материалов и
            управление всей системой.
          </p>
          <div class="role-card-bottom">
            <span>Закреплён за основателем</span
            ><Icon name="shield" :size="18" />
          </div>
        </article>
        <article
          v-for="role in roles"
          :key="role.slug"
          class="role-card"
          :style="{ '--role-color': role.color || '#B6A3F5' }"
        >
          <div class="role-card-top">
            <span class="role-emblem"
              ><Icon
                :name="
                  role.slug === 'admin'
                    ? 'shield'
                    : role.slug === 'developer'
                      ? 'code'
                      : 'users'
                "
                :size="24" /></span
            ><span v-if="role.system" class="badge muted">Системная</span
            ><span v-else class="badge muted">Своя роль</span>
          </div>
          <h2>{{ role.title }}</h2>
          <p>
            {{
              role.description ||
              systemDescriptions[role.slug] ||
              "Особый набор прав для задач команды."
            }}
          </p>
          <div class="role-permission-summary">
            <span>{{ role.permissions.length }} прав</span
            ><span>{{ role.assigned_count ?? 0 }} участников</span>
          </div>
          <div class="role-card-bottom">
            <span class="mono">{{ role.slug }}</span>
            <div class="row-actions">
              <button
                v-if="!role.deleted_at && can('roles.create_basic')"
                class="icon-button"
                :aria-label="'Копировать роль ' + role.title"
                title="Создать копию роли"
                @click="setRole(role, true)"
              >
                <Icon name="copy" :size="17" /></button
              ><button
                v-if="role.editable"
                class="icon-button"
                :aria-label="'Редактировать роль ' + role.title"
                title="Редактировать"
                @click="setRole(role)"
              >
                <Icon name="edit" :size="17" /></button
              ><button
                v-if="role.deletable"
                class="icon-button danger-text"
                :aria-label="(role.deleted_at?'Восстановить роль ':'Удалить роль ') + role.title"
                :title="role.deleted_at?'Восстановить':'В корзину'"
                @click="removing = role"
              >
                <Icon :name="role.deleted_at?'undo':'delete'" :size="17" /></button
              ><span v-if="!role.editable && !role.deletable && !can('roles.create_basic')" class="protected-label"
                ><Icon name="lock" :size="13" />Только Owner</span
              >
            </div>
          </div>
        </article>
      </div></LoadState
    >
    <div class="workspace-footnote">
      <Icon name="shield" :size="17" />
      <p>
        Admin управляет младшими ролями. Персональные запреты действуют поверх
        прав роли. Owner всегда остаётся единственным владельцем.
      </p>
    </div>
    <Modal
      v-model:open="editorOpen"
      :title="editing ? 'Редактирование роли' : 'Новая роль'"
      wide
      :busy="busy"
      ><form class="role-editor" @submit.prevent="save">
        
        <div class="role-basic-fields">
          <label
            >Название<input
              v-model="form.title"
              minlength="2"
              maxlength="80"
              placeholder="Например, редактор историй"
              required /></label
          ><label
            >Идентификатор<input
              v-model="form.slug"
              :disabled="!!editing"
              @input="slugTouched = true"
              pattern="[a-z][a-z0-9-]{1,63}"
              minlength="2"
              maxlength="64"
              placeholder="story-editor"
              required
            /><small
              >Латиница, цифры и дефисы. После создания не меняется.</small
            ></label
          >
        </div>
        <label
          >Описание<textarea
            v-model="form.description"
            rows="2"
            maxlength="300"
            placeholder="За какие задачи отвечает эта роль"
          />
        </label>
        <div class="role-color-field">
          <span>Цвет роли</span
          ><button
            v-for="color in palette"
            :key="color"
            type="button"
            :class="{ selected: form.color.toUpperCase() === color }"
            :style="{ '--swatch': color }"
            :aria-label="'Цвет ' + color"
            :aria-pressed="form.color.toUpperCase() === color"
            @click="form.color = color"
          >
            <Icon
              v-if="form.color.toUpperCase() === color"
              name="check"
              :size="14"
            /></button
          ><input
            v-model="form.color"
            type="color"
            aria-label="Выбрать свой цвет"
          />
        </div>
        <div class="permission-heading">
          <div>
            <h3>
              Матрица прав <span>{{ form.permissions.length }}</span>
            </h3>
            <p>Выбирай конкретные действия, доступные роли.</p>
          </div>
          <label class="checkbox-label small"
            ><input v-model="selectedOnly" type="checkbox" />Только
            выбранные</label
          >
        </div>
        <label class="search-field"
          ><Icon name="search" :size="17" /><input
            v-model="permissionSearch"
            type="search"
            placeholder="Найти действие или раздел"
            aria-label="Поиск прав"
        /></label>
        <PermissionMatrix v-model="form.permissions" :permissions="data?.permissions||[]" :delegable="data?.delegable||[]" :search="permissionSearch" :selected-only="selectedOnly"/>
        <div class="role-save-bar">
          <div>
            <strong>{{ form.permissions.length }} прав</strong
            ><span v-if="editing" class="small"
              ><b class="positive">+{{ diff.added.length }}</b> добавлено ·
              <b class="danger-text">−{{ diff.removed.length }}</b> убрано</span
            >
          </div>
          <button class="button" :disabled="busy">
            {{
              busy ? "Сохраняем…" : editing ? "Сохранить роль" : "Создать роль"
            }}<Icon name="check" :size="17" />
          </button>
        </div></form
    ></Modal>
    <TrashDialog :open="!!removing" :title="removing?.deleted_at?'Восстановить роль?':'Удалить роль?'" :target="removing?.slug||''" :revision="removing?.revision||1" :restore="!!removing?.deleted_at" :busy="busy" :description="removing?.deleted_at?'Роль вернётся без назначений. Выдать её участникам можно отдельно.':'Роль «'+(removing?.title||'')+'» будет перемещена в корзину. Все назначения ('+(removing?.assigned_count||0)+') будут сняты сразу. Системные роли защищены.'" @update:open="!$event&&(removing=null)" @confirm="remove"/>
  </div>
</template>
