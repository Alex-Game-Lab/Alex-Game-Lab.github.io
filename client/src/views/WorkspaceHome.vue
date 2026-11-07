<script setup lang="ts">
import { auth, canSome, can } from "../stores/auth";
import { api } from "../lib/api";
import { resource } from "../lib/resource";
import { shortDate, labels } from "../lib/content";
import type { Page, Article, Project } from "../lib/types";
import Icon from "../components/Icon.vue";
const articles =
  canSome("articles.create") || can("articles.edit_any")
    ? resource(() =>
        api<Page<Article>>("/workspace/articles?limit=5", { private: true }),
      )
    : null;
const projects = resource(() =>
  api<Page<Project>>("/workspace/projects?limit=50", { private: true }),
);
</script>
<template>
  <div>
    <header class="workspace-heading">
      <span class="eyebrow">ОБЗОР</span>
      <h1>
        Привет{{
          auth.profile?.display_name ? ", " + auth.profile.display_name : ""
        }}<span class="accent">.</span>
      </h1>
      <p>Идеи, проекты и работа команды — в одном месте.</p>
    </header>
    <div class="workspace-welcome">
      <div>
        <span class="badge">{{
          auth.access?.owner
            ? "Owner"
            : auth.access?.roles[0]?.title || "Участник AGL"
        }}</span>
        <h2>Что создадим сегодня?</h2>
        <p>
          Напиши о ходе разработки, обнови проект или поделись результатами
          тестирования.
        </p>
        <RouterLink
          v-if="canSome('articles.create')"
          to="/workspace/articles/new/"
          class="button"
          ><Icon name="plus" :size="18" />Новая статья</RouterLink
        ><RouterLink
          v-else-if="canSome('reports.create')"
          to="/workspace/reports/"
          class="button"
          >К отчётам<Icon name="arrow"
        /></RouterLink>
      </div>
      <img src="/assets/agl-orbit-v2.webp" alt="" width="240" height="240" />
    </div>
    <div class="workspace-shortcuts">
      <RouterLink
        v-if="canSome('articles.create') || can('articles.edit_any')"
        to="/workspace/articles/"
        ><Icon name="article" /><strong>Публикации</strong
        ><span>Черновики и статьи команды</span><Icon name="out" /></RouterLink
      ><RouterLink
        v-if="canSome('projects.edit') || can('projects.manage')"
        to="/workspace/projects/"
        ><Icon name="projects" /><strong>Проекты</strong
        ><span>Описание, обложка и участники</span
        ><Icon name="out" /></RouterLink
      ><RouterLink v-if="can('roles.manage_basic')" to="/workspace/roles/"
        ><Icon name="shield" /><strong>Роли и права</strong
        ><span>Понятные правила доступа</span><Icon name="out" /></RouterLink
      ><RouterLink
        v-if="
          canSome('reports.create') ||
          canSome('reports.read_all') ||
          canSome('reports.read_assigned')
        "
        to="/workspace/reports/"
        ><Icon name="comment" /><strong>Тестирование</strong
        ><span>Обратная связь о проектах</span><Icon name="out"
      /></RouterLink>
    </div>
    <section v-if="articles" class="panel">
      <div class="panel-heading">
        <h2>Недавно в редакции</h2>
        <RouterLink to="/workspace/articles/" class="inline-link small"
          >Все статьи<Icon name="out" :size="15"
        /></RouterLink>
      </div>
      <RouterLink
        v-for="article in articles.data.value?.items"
        :key="article.id"
        :to="'/workspace/articles/' + article.id + '/'"
        class="recent-row"
        ><span class="document-icon"><Icon name="article" /></span>
        <div>
          <strong>{{ article.title }}</strong>
          <p>
            {{ labels[article.status] }} · {{ shortDate(article.updated_at) }}
          </p>
        </div>
        <Icon name="right" :size="18"
      /></RouterLink>
      <p v-if="!articles.data.value?.items.length" class="muted small">
        Первая публикация начинается с черновика.
      </p>
    </section>
    <div class="workspace-footnote">
      <Icon name="shield" :size="17" />
      <p>
        Доступные инструменты зависят от твоей роли и назначения на проекты.
      </p>
    </div>
  </div>
</template>
