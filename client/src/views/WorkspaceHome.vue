<script setup lang="ts">
import PageLink from "../components/PageLink.vue";
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
        <PageLink
          v-if="canSome('articles.create')"
          to="/workspace/articles/new/?kind=news"
          class="button"
          ><Icon name="plus" :size="18" />Короткая новость</PageLink
        ><PageLink
          v-else-if="canSome('reports.create')"
          to="/workspace/reports/"
          class="button"
          >К отчётам<Icon name="arrow"
        /></PageLink>
      </div>
      <img src="/assets/agl-orbit-v2.webp" alt="" width="240" height="240" />
    </div>
    <div class="workspace-shortcuts">
      <PageLink v-if="auth.access?.owner" to="/workspace/content/"
        ><Icon name="globe" /><strong>Содержимое сайта</strong
        ><span>Главная и канал AGL</span><Icon name="out" /></PageLink
      ><PageLink v-if="auth.access?.owner" to="/workspace/media/"
        ><Icon name="image" /><strong>Медиатека</strong
        ><span>Собственные изображения и обложки</span><Icon name="out"
      /></PageLink>
      <PageLink
        v-if="canSome('articles.create') || can('articles.edit_any')"
        to="/workspace/articles/"
        ><Icon name="article" /><strong>Публикации</strong
        ><span>Новости, статьи и черновики</span><Icon name="out" /></PageLink
      ><PageLink
        v-if="['projects.edit','projects.edit_any','projects.create','projects.publish','projects.publish_any','projects.assign','projects.assign_assigned','projects.delete','projects.delete_any'].some(p=>canSome(p))"
        to="/workspace/projects/"
        ><Icon name="projects" /><strong>Проекты</strong
        ><span>Описание, обложка и участники</span><Icon name="out" /></PageLink
      ><PageLink v-if="['roles.create_basic','roles.edit_basic','roles.delete_basic','roles.assign_basic'].some(p=>can(p))" to="/workspace/roles/"
        ><Icon name="shield" /><strong>Роли и права</strong
        ><span>Понятные правила доступа</span><Icon name="out" /></PageLink
      ><PageLink
        v-if="
          canSome('reports.create') ||
          canSome('reports.read_all') ||
          canSome('reports.read_assigned')
        "
        to="/workspace/reports/"
        ><Icon name="comment" /><strong>Тестирование</strong
        ><span>Обратная связь о проектах</span><Icon name="out"
      /></PageLink>
    </div>
    <section v-if="articles" class="panel">
      <div class="panel-heading">
        <h2>Недавно в редакции</h2>
        <PageLink to="/workspace/articles/" class="inline-link small"
          >Все публикации<Icon name="out" :size="15"
        /></PageLink>
      </div>
      <PageLink
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
      /></PageLink>
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
