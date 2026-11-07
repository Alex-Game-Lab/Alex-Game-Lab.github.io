<script setup lang="ts">
import { ref } from "vue";
import { api } from "../lib/api";
import { resource } from "../lib/resource";
import { date } from "../lib/content";
import type { Page } from "../lib/types";
import Icon from "../components/Icon.vue";
import LoadState from "../components/LoadState.vue";
import Pagination from "../components/Pagination.vue";
const offset = ref(0),
  limit = 20;
const { data, loading, error, reload } = resource(
  () =>
    api<
      Page<{
        id: string;
        actor_id: string;
        action: string;
        target_kind: string;
        target_id: string;
        created_at: string;
        details: Record<string, unknown>;
      }>
    >("/staff/audit?limit=" + limit + "&offset=" + offset.value, {
      private: true,
    }),
  [offset],
);
const actions: Record<string, string> = {
  "article.create": "Создана статья",
  "article.update": "Изменена статья",
  "article.delete": "Удалена статья",
  "role.create": "Создана роль",
  "role.update": "Изменена роль",
  "role.delete": "Удалена роль",
  "account.roles": "Назначены роли",
  "permission.override.create": "Добавлено персональное правило",
  "permission.override.delete": "Удалено персональное правило",
  "account.ban": "Ограничен доступ",
  "account.ban.revoke": "Снято ограничение",
  "player.adjust": "Изменены игровые показатели",
  "project.create": "Создан проект",
  "project.update": "Обновлён проект",
  "project.member.assign": "Назначен участник проекта",
  "project.member.remove": "Удалён участник проекта",
  "project.release_protection": "Открыто редактирование проекта",
  "report.create": "Создан отчёт",
  "report.update": "Изменён отчёт",
  "report.delete": "Удалён отчёт",
  "report.triage": "Изменён статус отчёта",
  "review.create": "Добавлен отзыв",
  "review.update": "Изменён отзыв",
};
</script>
<template>
  <div>
    <header class="workspace-heading split">
      <div>
        <span class="eyebrow">ИСТОРИЯ ИЗМЕНЕНИЙ</span>
        <h1>Журнал действий<span class="accent">.</span></h1>
        <p>
          Назначения прав, публикации, ограничения и изменения игровых
          показателей.
        </p>
      </div>
      <button class="button secondary small" @click="reload">
        <Icon name="undo" :size="16" />Обновить
      </button>
    </header>
    <LoadState :loading="loading" :error="error" @retry="reload"
      ><div class="audit-list">
        <details v-for="item in data?.items" :key="item.id" class="audit-row">
          <summary>
            <span class="audit-event-icon"
              ><Icon
                :name="
                  item.action.startsWith('role') ||
                  item.action.startsWith('permission')
                    ? 'shield'
                    : item.action.startsWith('article')
                      ? 'article'
                      : 'clock'
                "
                :size="19" /></span
            ><span
              ><strong>{{ actions[item.action] || item.action }}</strong
              ><small
                >{{ date(item.created_at) }} · {{ item.target_kind }} ·
                {{ item.target_id.slice(0, 18) }}</small
              ></span
            ><Icon name="down" :size="16" />
          </summary>
          <div class="audit-details">
            <dl>
              <div>
                <dt>Участник</dt>
                <dd class="mono">{{ item.actor_id }}</dd>
              </div>
              <div>
                <dt>Объект</dt>
                <dd class="mono">{{ item.target_id }}</dd>
              </div>
              <div v-if="item.details.reason">
                <dt>Причина</dt>
                <dd>{{ item.details.reason }}</dd>
              </div>
            </dl>
            <pre>{{ JSON.stringify(item.details, null, 2) }}</pre>
          </div>
        </details>
      </div>
      <p v-if="!data?.items.length" class="quiet-state">Записей пока нет.</p>
      <Pagination
        :offset="offset"
        :limit="limit"
        :count="data?.items.length || 0"
        @change="offset = $event"
    /></LoadState>
  </div>
</template>
