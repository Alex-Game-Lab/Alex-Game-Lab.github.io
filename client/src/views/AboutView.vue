<script setup lang="ts">
import Icon from "../components/Icon.vue";
</script>
<template>
  <div class="about-page">
    <section class="container page-container">
      <header class="page-heading">
        <span class="eyebrow">О КОМАНДЕ</span>
        <h1>Любопытство —<br />хорошее начало<span class="accent">.</span></h1>
        <p>
          Alex Game Lab — независимая команда разработки игр. Нас интересует,
          как идея превращается в механику, а набор механик — в живой игровой
          опыт.
        </p>
      </header>
      <div class="about-cover">
        <img
          src="/assets/agl-workshop-v2.webp"
          alt="Иллюстрация творческой мастерской: игровые миры, сцены и инструменты разработки"
          width="1672"
          height="941"
        /><span class="image-caption">ALEX GAME LAB / МАСТЕРСКАЯ ИДЕЙ</span>
      </div>
    </section>
    <section class="section container about-story">
      <span class="eyebrow">ЧЕМ ЗАНИМАЕМСЯ</span>
      <div>
        <h2>Собираем большие истории<br />из маленьких решений.</h2>
        <p>
          Работаем над собственными проектами, создаём игровые механики,
          продумываем сюжет и тексты. Текущий публичный игровой проект команды —
          «Рублемёт».
        </p>
        <p>
          В процессе соединяем разработку, геймдизайн и работу с обратной
          связью. Пробуем подходы, проверяем идеи и дорабатываем то, что
          получается.
        </p>
        <RouterLink to="/projects/" class="inline-link"
          >Посмотреть проекты<Icon name="out"
        /></RouterLink>
      </div>
    </section>
    <section class="section container">
      <div class="principles-grid">
        <article>
          <Icon name="game" :size="30" /><span>01</span>
          <h3>Интерес к игре</h3>
          <p>
            Стремимся делать решения, которые хочется исследовать, и механики, к
            которым хочется возвращаться.
          </p>
        </article>
        <article>
          <Icon name="code" :size="30" /><span>02</span>
          <h3>От идеи к прототипу</h3>
          <p>
            Воплощаем концепции в работающем коде. Разработка помогает увидеть,
            как замысел ощущается в действии.
          </p>
        </article>
        <article>
          <Icon name="comment" :size="30" /><span>03</span>
          <h3>Открытый диалог</h3>
          <p>
            Нам важны впечатления игроков. Отзывы и предложения помогают увидеть
            проект с другой стороны.
          </p>
        </article>
      </div>
    </section>
    <section id="team" class="section container founder-section">
      <div class="founder-portrait">
        <img
          src="/assets/alexey-portrait.webp"
          alt="Аниме-образ Алексея akaalexey"
          width="800"
          height="1000"
          loading="lazy"
        /><span class="portrait-label">akaalexey</span>
      </div>
      <div>
        <span class="eyebrow">ЗНАКОМСТВО С ОСНОВАТЕЛЕМ</span>
        <h2>Алексей<span class="accent">.</span><small>akaalexey</small></h2>
        <div class="badge-row">
          <span class="badge">Основатель AGL</span
          ><span class="badge">Руководитель проекта</span>
        </div>
        <p>
          Разрабатываю программное обеспечение и игры, участвую в продуктовом
          программировании как капитан команды. В «Рублемёте» работаю над
          игровыми механиками, сюжетом и текстами.
        </p>
        <p>
          У меня подтверждённый второй разряд по спортивному программированию,
          опыт участия и призовых мест в алгоритмических соревнованиях и CTF.
        </p>
        <div class="tech-tags">
          <span>Python</span><span>SQL</span><span>JavaScript</span
          ><span>C++ · базовый уровень</span>
        </div>
        <div class="button-row">
          <a href="/akaalexey/" class="button">Личный сайт<Icon name="out" /></a
          ><a
            href="https://t.me/akaAlexey"
            class="button secondary"
            target="_blank"
            rel="noopener"
            >Написать<Icon name="out"
          /></a>
        </div>
      </div>
    </section>
    <section class="container section">
      <div class="contact-banner compact">
        <div>
          <span class="eyebrow">ДЛЯ НОВЫХ ИДЕЙ</span>
          <h2>Поговорим о будущем проекте?</h2>
          <p>
            Предложение работы, сотрудничество или идея для игры — можно начать
            с одного сообщения.
          </p>
        </div>
        <a
          href="https://t.me/akaAlexey"
          class="button"
          target="_blank"
          rel="noopener"
          >Связаться<Icon name="out"
        /></a>
      </div>
    </section>
  </div>
</template>
