<script setup lang="ts">
import { api } from "../lib/api";
import { resource } from "../lib/resource";
import type { Page, Project, Article } from "../lib/types";
import ProjectCard from "../components/ProjectCard.vue";
import ArticleCard from "../components/ArticleCard.vue";
import Icon from "../components/Icon.vue";
const projects = resource(() => api<Page<Project>>("/projects?limit=3"));
const news = resource(() => api<Page<Article>>("/news?limit=3"));
</script>
<template>
  <div class="home-page">
    <section class="home-hero container">
      <div class="hero-copy">
        <div class="eyebrow">
          <span class="live-dot"></span> НЕЗАВИСИМАЯ КОМАНДА РАЗРАБОТКИ
        </div>
        <h1>Из любопытства.<br />В целые <em>миры.</em></h1>
        <p>
          Создаём игры, исследуем механики и собираем идеи в истории, в которых
          хочется остаться.
        </p>
        <div class="button-row">
          <RouterLink to="/projects/" class="button"
            >Исследовать проекты<Icon name="out" /></RouterLink
          ><RouterLink to="/about/" class="button ghost"
            >Знакомство с AGL<Icon name="arrow" :size="17"
          /></RouterLink>
        </div>
        <div class="hero-bottom">
          <span class="hero-index">01 / ALEX GAME LAB</span
          ><a href="#games" class="scroll-link"
            >Листай дальше<Icon name="down" :size="16"
          /></a>
        </div>
      </div>
      <div class="hero-visual">
        <img
          src="/assets/agl-worlds-v2.webp"
          alt="Миниатюрный игровой мир с порталами, тропинками и инструментами создателя"
          width="1672"
          height="941"
          fetchpriority="high"
        /><span class="image-caption"
          ><span class="live-dot"></span> МЕСТО ДЛЯ НОВЫХ ИСТОРИЙ</span
        >
        <div class="hero-orbit" aria-hidden="true">
          <img
            src="/assets/agl-orbit-v2.webp"
            alt=""
            width="250"
            height="250"
          />
        </div>
      </div>
    </section>
    <div class="discipline-strip" aria-hidden="true">
      <div>
        ГЕЙМДИЗАЙН <b>✳</b> КОД <b>✳</b> ИСТОРИИ <b>✳</b> ЛЮБОПЫТСТВО
        <b>✳</b> ГЕЙМДИЗАЙН <b>✳</b> КОД <b>✳</b> ИСТОРИИ
        <b>✳</b> ЛЮБОПЫТСТВО <b>✳</b>
      </div>
    </div>
    <section id="games" class="section container">
      <div class="section-heading">
        <div>
          <span class="eyebrow">01 / ПРОЕКТЫ</span>
          <h2>Идеи, которым<br />мы даём жизнь<span class="accent">.</span></h2>
        </div>
        <RouterLink to="/projects/" class="inline-link"
          >Все проекты<Icon name="out"
        /></RouterLink>
      </div>
      <div
        v-if="projects.data.value?.items.length"
        class="project-grid"
        :class="{ 'single-project': projects.data.value.items.length === 1 }"
      >
        <ProjectCard
          v-for="project in projects.data.value.items"
          :key="project.slug"
          :project="project"
          large
        />
      </div>
      <div v-else class="project-feature">
        <img
          src="/assets/rublemet-cover.webp"
          alt="Иллюстрация проекта «Рублемёт»"
          width="960"
          height="600"
          loading="lazy"
        />
        <div>
          <span class="badge badge-development"><i></i>В разработке</span>
          <h3>Рублемёт</h3>
          <p>
            Игра о работе, деньгах и переменах. Механики развития, маленькие
            истории и персонажи складываются в один игровой путь.
          </p>
          <a href="/games/rublemet/" class="inline-link"
            >О проекте<Icon name="out"
          /></a>
        </div>
      </div>
    </section>
    <section id="studio" class="studio-section section">
      <div class="container studio-layout">
        <div>
          <span class="eyebrow">02 / ПОДХОД</span>
          <h2>Сначала —<br />«а что, если?»</h2>
          <p class="lead">
            Дальше — прототип, код, история и десятки маленьких решений, из
            которых складывается игра.
          </p>
          <RouterLink to="/about/" class="button secondary"
            >Как мы работаем<Icon name="out"
          /></RouterLink>
        </div>
        <div class="approach-list">
          <article>
            <span>01</span>
            <div>
              <h3>Механика с характером</h3>
              <p>
                Ищем действия и решения, которые интересно пробовать, сочетать и
                исследовать.
              </p>
            </div>
            <Icon name="game" />
          </article>
          <article>
            <span>02</span>
            <div>
              <h3>История в деталях</h3>
              <p>
                Продумываем персонажей, тексты и небольшие события, которые
                делают мир ближе.
              </p>
            </div>
            <Icon name="article" />
          </article>
          <article>
            <span>03</span>
            <div>
              <h3>Диалог с игроками</h3>
              <p>
                Собираем впечатления, обсуждаем идеи и возвращаемся к тому, что
                можно улучшить.
              </p>
            </div>
            <Icon name="comment" />
          </article>
        </div>
      </div>
    </section>
    <section class="section container">
      <div class="section-heading">
        <div>
          <span class="eyebrow">03 / ДНЕВНИК КОМАНДЫ</span>
          <h2>Что происходит<br />за кулисами<span class="accent">.</span></h2>
        </div>
        <RouterLink to="/news/" class="inline-link"
          >Все публикации<Icon name="out"
        /></RouterLink>
      </div>
      <div v-if="news.data.value?.items.length" class="news-grid">
        <ArticleCard
          v-for="article in news.data.value.items"
          :key="article.id"
          :article="article"
        />
      </div>
      <div v-else class="news-invitation">
        <span class="soft-icon"><Icon name="news" :size="32" /></span>
        <div>
          <h3>Истории разработки — здесь</h3>
          <p>
            Новости, заметки о механиках и решения команды появятся в нашем
            дневнике.
          </p>
        </div>
        <RouterLink to="/news/" class="round-arrow"
          ><Icon name="out"
        /></RouterLink>
      </div>
    </section>
    <section id="team" class="founder-teaser container">
      <div class="founder-avatar">
        <img
          src="/assets/alexey-portrait.webp"
          alt="Аниме-образ Алексея akaalexey"
          loading="lazy"
          width="120"
          height="120"
        />
      </div>
      <div>
        <span class="eyebrow">ЛЮДИ ЗА ПРОЕКТАМИ</span>
        <h2>Привет, я Алексей.</h2>
        <p>Основатель Alex Game Lab, разработчик и руководитель проектов.</p>
      </div>
      <a href="/akaalexey/" class="inline-link"
        >Личное знакомство<Icon name="out"
      /></a>
    </section>
    <section id="contact" class="section container">
      <div class="contact-banner">
        <div>
          <span class="eyebrow">ЕСТЬ МЫСЛЬ?</span>
          <h2>Хорошей идее<br />нужно продолжение.</h2>
          <p>
            Сотрудничество, впечатления от проектов или просто интересный вопрос
            — давай поговорим.
          </p>
          <a
            href="https://t.me/akaAlexey"
            class="button"
            target="_blank"
            rel="noopener"
            >Написать Алексею<Icon name="out"
          /></a>
        </div>
        <img
          src="/assets/agl-orbit-v2.webp"
          alt=""
          width="360"
          height="360"
          loading="lazy"
        />
      </div>
    </section>
  </div>
</template>
