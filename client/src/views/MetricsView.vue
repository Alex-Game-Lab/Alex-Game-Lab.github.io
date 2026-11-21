<script setup lang="ts">
import { ref, reactive, watch } from "vue";
import { api } from "../lib/api";
import { can } from "../stores/auth";
import { notify } from "../stores/notices";
import { errorMessage } from "../lib/errors";
import { saveDraft, readDraft, removeDraft } from "../lib/drafts";
import type { Game, Page, UserSummary, Stats } from "../lib/types";
import Icon from "../components/Icon.vue";
import LoadState from "../components/LoadState.vue";
import Modal from "../components/Modal.vue";
import PlayerSaves from "../components/PlayerSaves.vue";

interface TelemetrySummary {
  items: { event: string; events: number; accounts: number }[];
}

const games = ref<Game[]>([]),
  users = ref<UserSummary[]>([]),
  game = ref("rublemet"),
  days = ref(7),
  data = ref<TelemetrySummary | null>(null),
  loading = ref(false),
  error = ref(""),
  account = ref(""),
  saveAccount = ref(""),
  stats = ref<Stats | null>(null),
  adjustOpen = ref(false),
  busy = ref(false),
  operation = ref<string>(crypto.randomUUID());
const form = reactive({ balance_delta: 0, reason: "" }),
  metricRows = ref<{ key: string; value: number }[]>([]);
let telemetryRequest = 0;
let statsRequest = 0;
const eventNames: Record<string, string> = {
  session_started: "Начало сессии",
  session_ended: "Завершение сессии",
  level_completed: "Завершённый уровень",
  game_error: "Ошибка игры",
};
void Promise.all([
  api<Game[]>("/games"),
  can("users.read")
    ? api<Page<UserSummary>>("/staff/users?limit=50", { private: true })
    : Promise.resolve({ items: [] }),
])
  .then(([g, u]) => {
    games.value = g;
    users.value = u.items;
    if (g.length && !restored) game.value = g[0].slug;
  })
  .catch((e) => notify(errorMessage(e), true));
async function reload() {
  const request = ++telemetryRequest;
  data.value = null;
  error.value = "";
  loading.value = can("metrics.read", game.value);
  if (!loading.value) return;
  try {
    const result = await api<TelemetrySummary>(
      "/staff/metrics?project_slug=" + game.value + "&days=" + days.value,
      { private: true },
    );
    if (request === telemetryRequest) data.value = result;
  } catch (e) {
    if (request === telemetryRequest) error.value = errorMessage(e);
  } finally {
    if (request === telemetryRequest) loading.value = false;
  }
}
watch([game, days], reload, { immediate: true });
watch([account, game], () => {
  statsRequest++;
  stats.value = null;
  saveAccount.value = "";
}, { flush: "sync" });
async function readStats() {
  const id = account.value.trim();
  if (!id) return;
  if (game.value === "rublemet") {
    saveAccount.value = id;
    return;
  }
  const request = ++statsRequest;
  stats.value = null;
  try {
    const result = await api<Stats>(
      "/staff/users/" + encodeURIComponent(id) + "/games/" + game.value + "/stats",
      { private: true },
    );
    if (request === statsRequest) stats.value = result;
  } catch (e) {
    if (request === statsRequest) notify(errorMessage(e), true);
  }
}
async function adjust() {
  const id = account.value.trim();
  const slug = game.value;
  if (!id || slug === "rublemet") return;
  if (
    !Number.isSafeInteger(form.balance_delta) ||
    metricRows.value.some((r) => !r.key || !Number.isSafeInteger(r.value))
  ) {
    notify("Укажи целые числа и названия показателей.", true);
    return;
  }
  busy.value = true;
  try {
    const result = await api<{ stats: Stats }>(
      "/staff/users/" + encodeURIComponent(id) + "/games/" + slug + "/adjustments",
      {
        private: true,
        method: "POST",
        body: {
          ...form,
          operation_id: operation.value,
          metrics_delta: Object.fromEntries(
            metricRows.value.map((r) => [r.key, r.value]),
          ),
        },
      },
    );
    if (id === account.value.trim() && slug === game.value) stats.value = result.stats;
    removeDraft("adjustment");
    adjustOpen.value = false;
    operation.value = crypto.randomUUID();
    notify("Изменения применены и записаны в журнал");
    form.balance_delta = 0;
    form.reason = "";
    metricRows.value = [];
  } catch (e) {
    notify(errorMessage(e), true);
  } finally {
    busy.value = false;
  }
}
function openAdjust() {
  operation.value = crypto.randomUUID();
  adjustOpen.value = true;
}

function preserveAdjustment() {
  saveDraft("adjustment", {
    account: account.value,
    game: game.value,
    operation: operation.value,
    form: { ...form },
    rows: metricRows.value,
  });
}
const restored = readDraft<{
  account: string;
  game: string;
  operation: string;
  form: typeof form;
  rows: typeof metricRows.value;
}>("adjustment");
if (restored && restored.game !== "rublemet") {
  account.value = restored.account;
  game.value = restored.game;
  operation.value = restored.operation;
  Object.assign(form, restored.form);
  metricRows.value = restored.rows;
  adjustOpen.value = true;
}
if (restored) removeDraft("adjustment");
</script>
<template>
  <div>
    <header class="workspace-heading">
      <span class="eyebrow">ИГРЫ И ПОКАЗАТЕЛИ</span>
      <h1>Пульс проектов<span class="accent">.</span></h1>
      <p>События игр, прогресс аккаунтов и разрешённые корректировки.</p>
    </header>
    <div class="metrics-controls">
      <label
        >Игра<select v-model="game">
          <option v-for="item in games" :value="item.slug">
            {{ item.title }}
          </option>
        </select></label
      ><label v-if="can('metrics.read', game)"
        >Период<select v-model.number="days">
          <option :value="1">За сутки</option>
          <option :value="7">За 7 дней</option>
          <option :value="30">За 30 дней</option>
        </select></label
      >
    </div>
    <LoadState
      v-if="can('metrics.read', game)"
      :loading="loading"
      :error="error"
      @retry="reload"
      ><div class="metric-cards">
        <article
          v-for="event in data?.items"
          :key="event.event"
          class="panel metric-card"
        >
          <Icon
            :name="event.event === 'game_error' ? 'warning' : 'metrics'"
          /><strong>{{ event.events.toLocaleString("ru-RU") }}</strong>
          <h3>{{ eventNames[event.event] || event.event }}</h3>
          <p>{{ event.accounts }} аккаунтов</p>
        </article>
        <div v-if="!data?.items.length" class="panel quiet-state">
          <Icon name="metrics" :size="30" />
          <h3>Событий пока нет</h3>
          <p>Они появятся после подключения игровой телеметрии.</p>
        </div>
      </div>
      <p class="small muted metric-source">
        События присылает игровой клиент. Они помогают анализировать работу
        игры.
      </p></LoadState
    >
    <section class="panel stats-panel">
      <div class="panel-heading">
        <h2>Показатели аккаунта</h2>
        <Icon name="user" />
      </div>
      <div class="stats-account-controls">
        <label
          >Участник<select v-if="users.length" v-model="account">
            <option value="" disabled>Выбери аккаунт</option>
            <option v-for="user in users" :value="user.id">
              {{ user.username || user.display_name || "Аккаунт" }} ·
              {{ user.id.slice(0, 8) }}
            </option></select
          ><input v-else v-model="account" placeholder="ID аккаунта" /></label
        ><button
          v-if="can('metrics.read', game)"
          class="button secondary"
          :disabled="!account.trim() || saveAccount === account.trim()"
          @click="readStats"
        >
          Посмотреть<Icon name="arrow" :size="17" /></button
        ><button
          v-if="game !== 'rublemet' && can('players.adjust', game)"
          class="button"
          :disabled="!account.trim()"
          @click="openAdjust"
        >
          Изменить показатели<Icon name="edit" :size="17" />
        </button>
      </div>
      <PlayerSaves
        v-if="saveAccount && can('metrics.read', game)"
        :key="saveAccount"
        :account-id="saveAccount"
      />
      <div v-else-if="stats" class="stats-values">
        <article>
          <span>Баланс</span
          ><strong>{{ stats.balance.toLocaleString("ru-RU") }}</strong>
        </article>
        <article v-for="(value, key) in stats.metrics" :key="key">
          <span>{{ key }}</span
          ><strong>{{ value.toLocaleString("ru-RU") }}</strong>
        </article>
      </div>
      <p v-if="!can('players.adjust', game)" class="small muted">
        Изменение показателей доступно только с отдельным разрешением Owner.
      </p>
    </section>
    <Modal
      v-model:open="adjustOpen"
      title="Изменить игровые показатели"
      wide
      :busy="busy"
      >
      <form class="form-stack" @submit.prevent="adjust">
        <div class="notice">
          <Icon name="user" />
          <p>
            Аккаунт
            {{ users.find((u) => u.id === account)?.display_name || account }} ·
            {{ games.find((g) => g.slug === game)?.title || game }}
          </p>
        </div>
        <label
          >Изменение баланса<input
            v-model.number="form.balance_delta"
            type="number"
            step="1"
            required
          /><small
            >Положительное число начисляет, отрицательное списывает.</small
          ></label
        >
        <div class="metric-rows">
          <div v-for="(row, index) in metricRows" :key="index">
            <label
              >Показатель<input
                v-model="row.key"
                placeholder="например, experience"
                pattern="[a-z][a-z0-9_]{0,39}"
                required /></label
            ><label
              >Изменение<input
                v-model.number="row.value"
                type="number"
                step="1"
                required /></label
            ><button
              type="button"
              class="icon-button danger-text"
              aria-label="Убрать показатель"
              @click="metricRows.splice(index, 1)"
            >
              <Icon name="close" :size="17" />
            </button>
          </div>
          <button
            type="button"
            class="text-button"
            @click="metricRows.push({ key: '', value: 0 })"
          >
            <Icon name="plus" :size="16" />Добавить показатель
          </button>
        </div>
        <label
          >Причина<textarea
            v-model="form.reason"
            minlength="3"
            maxlength="500"
            rows="3"
            required
            placeholder="Зачем нужно это изменение?"
          />
        </label>
        <p class="small muted">
          Операция и причина сохранятся в журнале действий.
        </p>
        <button class="button" :disabled="busy">
          Применить изменения<Icon name="check" :size="17" />
        </button></form
    ></Modal>
  </div>
</template>
