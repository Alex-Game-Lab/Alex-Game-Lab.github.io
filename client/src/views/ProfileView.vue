<script setup lang="ts">
import PageLink from "../components/PageLink.vue";
import { ref, reactive, watch, computed } from "vue";
import {
  auth,
  accountName,
  login,
  logout,
  refreshAccess,
  hasWorkspace,
} from "../stores/auth";
import { api } from "../lib/api";
import { notify } from "../stores/notices";
import { errorMessage } from "../lib/errors";
import { date } from "../lib/content";
import type { Phone, Game, Stats } from "../lib/types";
import Icon from "../components/Icon.vue";
import LoadState from "../components/LoadState.vue";
import Modal from "../components/Modal.vue";
const form = reactive({
    display_name: "",
    bio: "",
    locale: "ru",
    avatar_key: "orbit",
  }),
  saving = ref(false),
  phone = ref<Phone | null>(null),
  games = ref<Game[]>([]),
  stats = ref<Record<string, Stats>>({}),
  savesOpen = ref(false),
  saves = ref<any[]>([]),
  savesTitle = ref(""),
  savesBusy = ref(false);
watch(
  () => auth.profile,
  (value) => {
    if (value)
      Object.assign(form, {
        display_name: value.display_name || "",
        bio: value.bio || "",
        locale: value.locale,
        avatar_key: value.avatar_key || "orbit",
      });
  },
  { immediate: true },
);
watch(
  () => auth.user,
  async (user) => {
    if (!user) return;
    try {
      const [p, g] = await Promise.all([
        api<Phone>("/me/phone", { private: true }),
        api<Game[]>("/games"),
      ]);
      phone.value = p;
      games.value = g;
      for (const game of g)
        stats.value[game.slug] = await api<Stats>(
          "/me/games/" + game.slug + "/stats",
          { private: true },
        );
    } catch {}
  },
  { immediate: true },
);
const name = computed(() => accountName.value);
async function save() {
  saving.value = true;
  try {
    await api("/me", { method: "PATCH", body: form, private: true });
    await refreshAccess();
    notify("Профиль обновлён");
  } catch (e) {
    notify(errorMessage(e), true);
  } finally {
    saving.value = false;
  }
}
async function showSaves(game: Game) {
  savesOpen.value = true;
  savesBusy.value = true;
  savesTitle.value = game.title;
  saves.value = [];
  try {
    const results = await Promise.all(
      [1, 2, 3].map(async (slot) => {
        try {
          return {
            slot,
            ...(await api<any>("/games/" + game.slug + "/saves/" + slot, {
              private: true,
            })),
          };
        } catch {
          return null;
        }
      }),
    );
    saves.value = results.filter(Boolean);
  } finally {
    savesBusy.value = false;
  }
}
</script>
<template>
  <div class="container page-container profile-page">
    <div v-if="auth.loading" class="loading-state">
      <Icon name="loading" class="spin" />Открываем профиль…
    </div>
    <template v-else-if="!auth.user"><section class="compact-auth" aria-labelledby="auth-title"><Icon name="shield" :size="32"/><h1 id="auth-title">AGL ID</h1><div class="button-row"><button class="button" @click="login()">Войти<Icon name="out"/></button><button class="button secondary" @click="login('register')">Регистрация<Icon name="plus"/></button></div><p>Для регистрации нужны ник и пароль. Почта необязательна.</p><a href="/privacy/" class="text-link">Данные и конфиденциальность<Icon name="shield" :size="16"/></a></section></template
    ><template v-else>
      <header class="profile-cover">
        <div class="profile-identity">
          <div class="avatar huge" :class="'avatar-' + form.avatar_key">
            <img
              v-if="form.avatar_key === 'orbit'"
              src="/assets/agl-orbit-v2.webp"
              alt=""
              width="100"
              height="100"
            /><Icon
              v-else
              :name="form.avatar_key === 'cube' ? 'projects' : 'spark'"
              :size="42"
            />
          </div>
          <div>
            <span class="eyebrow">ЛИЧНОЕ ПРОСТРАНСТВО</span>
            <h1>{{ name }}</h1>
            <div class="badge-row">
              <span v-if="auth.access?.owner" class="badge owner"
                ><Icon name="crown" :size="13" />Owner</span
              ><span
                v-for="role in auth.access?.roles.filter(r=>r.slug!=='owner')"
                :key="role.slug"
                class="badge role-badge"
                :style="{ '--role-color': role.color || '#B6A3F5' }"
                >{{ role.title }}</span
              ><span
                v-if="!auth.access?.owner && !auth.access?.roles.length"
                class="badge"
                >Игрок</span
              ><span class="small muted"
                >В AGL с {{ date(auth.profile?.created_at) }}</span
              >
            </div>
          </div>
        </div>
        <PageLink
          v-if="hasWorkspace"
          to="/workspace/"
          class="button secondary"
          >Рабочее пространство<Icon name="out"
        /></PageLink>
      </header>
      <div
        v-for="restriction in auth.access?.restrictions"
        class="notice notice-error"
      >
        <Icon name="warning" />
        <p>
          Ограничение
          {{
            restriction.project_slug
              ? "для проекта " + restriction.project_slug
              : "аккаунта"
          }}: {{ restriction.reason }}
        </p>
      </div>
      <div class="profile-grid">
        <section class="panel">
          <div class="panel-heading">
            <h2>О себе</h2>
            <Icon name="user" />
          </div>
          <form class="form-stack" @submit.prevent="save">
            <label
              >Имя в профиле<input
                v-model="form.display_name"
                minlength="1"
                maxlength="80"
                required
                placeholder="Как тебя подписать" /></label
            ><label
              >Пара слов о себе<textarea
                v-model="form.bio"
                rows="4"
                maxlength="500"
                placeholder="Чем занимаешься и что тебе интересно"
              /><small>{{ form.bio.length }} / 500</small></label
            >
            <fieldset class="avatar-picker">
              <legend>Аватар</legend>
              <button
                v-for="[key, label] in [
                  ['orbit', 'Орбита'],
                  ['cube', 'Создатель'],
                  ['spark', 'Исследователь'],
                ]"
                :key="key"
                type="button"
                :class="{ active: form.avatar_key === key }"
                :aria-pressed="form.avatar_key === key"
                @click="form.avatar_key = key"
              >
                <span class="avatar" :class="'avatar-' + key"
                  ><img
                    v-if="key === 'orbit'"
                    src="/assets/agl-orbit-v2.webp"
                    alt=""
                    width="45"
                    height="45" /><Icon
                    v-else
                    :name="key === 'cube' ? 'projects' : 'spark'" /></span
                >{{ label }}
              </button>
            </fieldset>
            <label
              >Язык профиля<select v-model="form.locale">
                <option value="ru">Русский</option>
                <option value="en">English</option>
              </select></label
            ><button class="button" :disabled="saving">
              <Icon name="save" :size="18" />{{
                saving ? "Сохраняем…" : "Сохранить профиль"
              }}
            </button>
          </form>
        </section>
        <div class="profile-side">
          <section class="panel">
            <div class="panel-heading">
              <h2>Вход в аккаунт</h2>
              <Icon name="shield" />
            </div>
            <p>Вход по нику или почте и паролю.</p>
            <button class="button secondary full" @click="login('password')">
              Изменить пароль<Icon name="out" :size="16" />
            </button>
            <div class="settings-divider"></div>
            <h3>Номер телефона</h3>
            <p v-if="phone?.linked">{{ phone.masked_phone }} · подтверждён</p>
            <p v-else-if="phone?.enabled">
              Привяжи номер для входа по SMS в этот же аккаунт.
            </p>
            <p v-else class="muted small">
              SMS-вход пока не подключён. Сейчас используй ник или почту и
              пароль.
            </p>
            <button
              v-if="phone?.enabled && !phone.linked"
              class="button secondary full"
              @click="login('phone')"
            >
              Привязать телефон<Icon name="plus" :size="16" />
            </button>
          </section>
          <section class="panel subtle">
            <span class="eyebrow">ТВОЙ AGL ID</span>
            <p class="mono account-id">{{ auth.access?.account_id }}</p>
            <p class="small muted">
              Этот идентификатор связывает данные сайта и подключённых игр.
            </p>
            <button class="text-button danger-text" @click="logout">
              <Icon name="logout" :size="16" />Выйти из аккаунта
            </button>
          </section>
        </div>
      </div>
      <section class="section profile-games">
        <div class="section-heading small">
          <div>
            <span class="eyebrow">ПРОГРЕСС И СОХРАНЕНИЯ</span>
            <h2>Подключённые игры</h2>
          </div>
        </div>
        <div class="game-account-card" v-for="game in games" :key="game.slug">
          <img
            :src="
              game.slug === 'rublemet'
                ? '/assets/rublemet-cover.webp'
                : '/assets/agl-worlds-v2.webp'
            "
            :alt="game.title"
            width="200"
            height="130"
          />
          <div>
            <h3>{{ game.title }}</h3>
            <p>Облачные сохранения аккаунта</p>
            <span v-if="stats[game.slug]?.source==='game_save'" class="small muted"
              >Баланс:
              {{ stats[game.slug].balance.toLocaleString("ru-RU") }} ₽</span
            >
          </div>
          <button class="button secondary small" @click="showSaves(game)">
            Мои сохранения<Icon name="arrow" :size="16" />
          </button>
        </div>
        <p v-if="!games.length" class="muted">
          Подключённые к аккаунту игры появятся здесь.
        </p>
      </section> </template
    ><Modal v-model:open="savesOpen" :title="'Сохранения · ' + savesTitle"
      ><LoadState :loading="savesBusy"
        ><div v-for="save in saves" class="save-slot">
          <Icon name="save" />
          <div>
            <h3>Слот {{ save.slot }}</h3>
            <p>
              Обновлён {{ date(save.updated_at) }} · версия {{ save.revision }}
            </p>
            <details>
              <summary>Данные сохранения</summary>
              <pre>{{ JSON.stringify(save.payload, null, 2) }}</pre>
            </details>
          </div>
        </div>
        <p v-if="!saves.length" class="muted">
          Сохранений ещё нет. Они появятся после подключения игры к облачному
          сохранению.
        </p></LoadState
      ></Modal
    >
  </div>
</template>
