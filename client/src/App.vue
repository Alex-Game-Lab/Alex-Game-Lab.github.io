<script setup lang="ts">
import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import { auth, hasWorkspace, login, logout } from "./stores/auth";
import { notices, dismiss } from "./stores/notices";
import Icon from "./components/Icon.vue";
const route = useRoute(),
  menu = ref(false),
  theme = ref("dark");
try {
  theme.value = localStorage.getItem("agl.theme") || "dark";
} catch {}
function applyTheme() {
  document.documentElement.dataset.theme = theme.value;
  try {
    localStorage.setItem("agl.theme", theme.value);
  } catch {}
}
applyTheme();
watch(
  () => route.fullPath,
  () => (menu.value = false),
);
const links = [
  ["/projects/", "Проекты"],
  ["/about/", "О нас"],
  ["/news/", "Новости"],
];
</script>
<template>
  <a class="skip-link" href="#main">К содержимому</a>
  <header class="site-header">
    <div class="container header-inner">
      <RouterLink to="/" class="wordmark" aria-label="Alex Game Lab — главная"
        ><img src="/assets/logo.svg" alt="" width="39" height="39" /><span
          >ALEX GAME LAB<small>ИГРЫ. ИДЕИ. ЛЮДИ.</small></span
        ></RouterLink
      >
      <nav class="desktop-nav" aria-label="Главная навигация">
        <RouterLink v-for="[path, label] in links" :key="path" :to="path">{{
          label
        }}</RouterLink
        ><RouterLink v-if="hasWorkspace" to="/workspace/"
          >Пространство<Icon name="out" :size="13"
        /></RouterLink>
      </nav>
      <div class="header-actions">
        <button
          class="icon-button theme-toggle"
          :aria-label="
            theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'
          "
          @click="
            theme = theme === 'dark' ? 'light' : 'dark';
            applyTheme();
          "
        >
          <Icon :name="theme === 'dark' ? 'sun' : 'moon'" :size="18" /></button
        ><RouterLink v-if="auth.user" to="/profile/" class="profile-link"
          ><span class="avatar tiny"><Icon name="user" :size="17" /></span
          ><span>{{
            auth.profile?.display_name || "Профиль"
          }}</span></RouterLink
        ><button v-else class="header-login" @click="login()">
          Войти<Icon name="out" :size="16" /></button
        ><button
          class="icon-button menu-toggle"
          :aria-expanded="menu"
          aria-controls="mobile-menu"
          :aria-label="menu ? 'Закрыть меню' : 'Открыть меню'"
          @click="menu = !menu"
        >
          <Icon :name="menu ? 'close' : 'menu'" />
        </button>
      </div>
    </div>
    <nav
      v-if="menu"
      id="mobile-menu"
      class="mobile-nav container"
      aria-label="Мобильная навигация"
    >
      <RouterLink v-for="[path, label] in links" :key="path" :to="path"
        >{{ label }}<Icon name="out" /></RouterLink
      ><RouterLink to="/profile/">Профиль<Icon name="user" /></RouterLink
      ><RouterLink v-if="hasWorkspace" to="/workspace/"
        >Рабочее пространство<Icon name="dashboard"
      /></RouterLink>
    </nav>
  </header>
  <main id="main" tabindex="-1">
    <RouterView v-slot="{ Component }"
      ><Transition name="page" mode="out-in"
        ><component :is="Component" /></Transition
    ></RouterView>
  </main>
  <footer class="site-footer">
    <div class="container">
      <div class="footer-top">
        <div>
          <RouterLink to="/" class="footer-brand"
            >ALEX GAME LAB<span aria-hidden="true">✳</span></RouterLink
          >
          <p>Любопытство превращается в идеи.<br />Идеи — в игры.</p>
        </div>
        <div class="footer-column">
          <span>Исследовать</span
          ><RouterLink to="/projects/">Проекты</RouterLink
          ><RouterLink to="/news/">Новости</RouterLink
          ><RouterLink to="/about/">О команде</RouterLink>
        </div>
        <div class="footer-column">
          <span>На связи</span
          ><a href="https://t.me/akaAlexey" target="_blank" rel="noopener"
            >Telegram<Icon name="out" :size="14" /></a
          ><a
            href="https://github.com/Alex-Game-Lab"
            target="_blank"
            rel="noopener"
            >GitHub<Icon name="out" :size="14" /></a
          ><a href="/akaalexey/"
            >Алексей · akaalexey<Icon name="out" :size="14"
          /></a>
        </div>
        <div class="footer-column">
          <span>Твоё пространство</span
          ><RouterLink to="/profile/">Аккаунт AGL ID</RouterLink
          ><RouterLink v-if="hasWorkspace" to="/workspace/"
            >Рабочее пространство</RouterLink
          ><a href="/privacy/">Конфиденциальность</a
          ><button v-if="auth.user" class="text-button" @click="logout">
            Выйти из аккаунта
          </button>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© {{ new Date().getFullYear() }} Alex Game Lab</span
        ><span>Независимая команда разработки</span
        ><a href="#top" aria-label="Наверх"><Icon name="out" :size="18" /></a>
      </div>
    </div>
  </footer>
  <div class="toast-stack" aria-live="polite">
    <div
      v-for="notice in notices"
      :key="notice.id"
      class="toast"
      :class="{ error: notice.error }"
      :role="notice.error ? 'alert' : 'status'"
    >
      <Icon :name="notice.error ? 'warning' : 'check'" :size="18" /><span>{{
        notice.text
      }}</span
      ><button
        class="icon-button"
        aria-label="Закрыть уведомление"
        @click="dismiss(notice.id)"
      >
        <Icon name="close" :size="16" />
      </button>
    </div>
  </div>
</template>
