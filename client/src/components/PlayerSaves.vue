<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import { api } from "../lib/api";
import { errorMessage } from "../lib/errors";
import type { CloudSave } from "../lib/types";
import { notify } from "../stores/notices";
import LoadState from "./LoadState.vue";

interface Progress {
  cash: number;
  total: number;
  swipes: number;
}

const props = defineProps<{ accountId: string }>();
const saves = ref<CloudSave[]>([]);
const loading = ref(false);
const error = ref("");
const editable = ref(false);
const editing = ref<{ accountId: string; row: CloudSave } | null>(null);
const busy = ref(false);
const reason = ref("");
const raw = ref("");
const values = ref<Progress>({ cash: 0, total: 0, swipes: 0 });
const fields = {
  cash: "Баланс, ₽",
  total: "Всего заработано, ₽",
  swipes: "Взмахов",
};
const syncTime = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Moscow",
});
let loadingRequest: AbortController | null = null;

function saveUrl(accountId: string) {
  return "/staff/users/" + encodeURIComponent(accountId) + "/games/rublemet/saves";
}

function isAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function hasProgress(state: unknown): state is Progress {
  if (!state || typeof state !== "object") return false;
  const { cash, total, swipes } = state as Partial<Progress>;
  return isAmount(cash) && isAmount(total) && isAmount(swipes);
}

function supported(row: CloudSave) {
  return row.payload?.format === "rublemet/1" && hasProgress(row.payload.state);
}

function displayedNumber(value: unknown) {
  return isAmount(value) ? value.toLocaleString("ru-RU") : "—";
}

function purchased(values: unknown) {
  return Array.isArray(values)
    ? values.filter((value) => isAmount(value) && value > 0).length
    : 0;
}

async function load() {
  const accountId = props.accountId;
  loadingRequest?.abort();
  const request = new AbortController();
  const timeout = setTimeout(() => request.abort(), 12000);
  loadingRequest = request;
  loading.value = true;
  error.value = "";
  try {
    const result = await api<{ items: CloudSave[]; editable: boolean }>(
      saveUrl(accountId),
      {
        private: true,
        signal: request.signal,
      },
    );
    if (loadingRequest !== request || accountId !== props.accountId) return;
    saves.value = result.items;
    editable.value = result.editable;
  } catch (failure) {
    if (loadingRequest === request) error.value = errorMessage(failure);
  } finally {
    clearTimeout(timeout);
    if (loadingRequest === request) loading.value = false;
  }
}

watch(
  () => props.accountId,
  () => {
    editing.value = null;
    saves.value = [];
    editable.value = false;
    void load();
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  loadingRequest?.abort();
  loadingRequest = null;
  editing.value = null;
});

function edit(row: CloudSave) {
  if (!editable.value || busy.value || !supported(row)) return;
  const { cash, total, swipes } = row.payload.state;
  editing.value = { accountId: props.accountId, row };
  values.value = { cash, total, swipes };
  raw.value = JSON.stringify(row.payload.state, null, 2);
  reason.value = "";
}

async function save() {
  const draft = editing.value;
  if (!draft || busy.value || draft.accountId !== props.accountId) return;
  if (!hasProgress(values.value) || !Number.isInteger(values.value.swipes)) {
    notify("Проверь числа. Количество взмахов должно быть целым.", true);
    return;
  }
  if (values.value.total < values.value.cash) {
    notify("Баланс не может превышать общий заработок.", true);
    return;
  }

  busy.value = true;
  try {
    const json: unknown = JSON.parse(raw.value);
    if (!json || typeof json !== "object" || Array.isArray(json)) {
      notify("Данные сохранения должны быть JSON-объектом.", true);
      return;
    }
    const state = { ...json, ...values.value };
    const { accountId, row } = draft;
    await api(saveUrl(accountId) + "/" + row.slot, {
      private: true,
      method: "PUT",
      body: {
        reason: reason.value,
        save: {
          operation_id: crypto.randomUUID(),
          expected_revision: row.revision,
          schema_version: row.schema_version,
          payload: { ...row.payload, state },
        },
      },
    });
    if (editing.value !== draft) return;
    editing.value = null;
    notify("Сохранение обновлено. При синхронизации игра предложит выбрать версию, если прогресс различается.");
    await load();
  } catch (failure) {
    if (editing.value === draft) {
      notify(failure instanceof SyntaxError ? "В JSON есть ошибка." : errorMessage(failure), true);
    }
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="player-saves">
    <div class="section-title">
      <h3>Сохранения Рублемёта</h3>
      <button class="button secondary small" :disabled="loading || busy" @click="load">
        Обновить
      </button>
    </div>
    <p class="field-note">
      Слот 1 содержит последнюю синхронизированную версию. При игре офлайн прогресс на устройстве может быть новее.
    </p>
    <LoadState :loading="loading" :error="error" @retry="load">
      <p v-if="!saves.length" class="quiet-state">
        Игра ещё не передала сохранение. Нужны вход в AGL ID и сборка с синхронизацией.
      </p>
      <article v-for="row in saves" :key="row.slot" class="save-slot">
        <h4>Слот {{ row.slot }} · ревизия {{ row.revision }}</h4>
        <p>
          Обновлено <time :datetime="row.updated_at">{{ syncTime.format(new Date(row.updated_at)) }} МСК</time>
        </p>
        <template v-if="supported(row)">
          <dl class="account-facts">
            <div><dt>Баланс</dt><dd>{{ displayedNumber(row.payload.state.cash) }} ₽</dd></div>
            <div><dt>Всего заработано</dt><dd>{{ displayedNumber(row.payload.state.total) }} ₽</dd></div>
            <div><dt>Взмахов</dt><dd>{{ displayedNumber(row.payload.state.swipes) }}</dd></div>
            <div><dt>Вклад в сейфе</dt><dd>{{ displayedNumber(row.payload.state.safe?.principal ?? 0) }} ₽</dd></div>
            <div><dt>Куплено профессий</dt><dd>{{ purchased(row.payload.state.active) }}</dd></div>
            <div><dt>Куплено бизнесов</dt><dd>{{ purchased(row.payload.state.passive) }}</dd></div>
          </dl>
          <button v-if="editable && !editing" class="button secondary small" :disabled="busy" @click="edit(row)">
            Редактировать прогресс
          </button>
        </template>
        <p v-else class="muted">Формат этого сохранения не поддерживается.</p>
      </article>
    </LoadState>
    <form v-if="editing" class="form-stack inset-form" @submit.prevent="save">
      <h4>Изменение слота {{ editing.row.slot }}</h4>
      <label v-for="(label, key) in fields" :key="key">
        {{ label }}
        <input v-model.number="values[key]" type="number" min="0" :step="key === 'swipes' ? 1 : 'any'" required :disabled="busy" />
      </label>
      <details>
        <summary>Остальной прогресс</summary>
        <p class="field-note">JSON содержит профессии, бизнесы, сюжет и другие данные. Три поля выше сохраняются отдельно.</p>
        <textarea v-model="raw" rows="12" spellcheck="false" aria-label="Данные сохранения" class="mono" :disabled="busy" />
      </details>
      <label>
        Причина изменения
        <textarea v-model="reason" minlength="3" maxlength="500" required rows="2" :disabled="busy" />
      </label>
      <div class="button-row">
        <button class="button" :disabled="busy">Сохранить</button>
        <button type="button" class="button secondary" :disabled="busy" @click="editing = null">Отмена</button>
      </div>
      <p class="field-note">Если игра запишет новую версию, сначала потребуется обновить сохранение.</p>
    </form>
  </section>
</template>
