<script setup lang="ts">
import PageLink from "./components/PageLink.vue";
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { auth, hasWorkspace, login, logout } from "./stores/auth";
import { notices, dismiss } from "./stores/notices";
import Icon from "./components/Icon.vue";
import { siteHome, loadSiteHome } from "./lib/site-home";
void loadSiteHome();
const inWorkspace = computed(() => route.path.startsWith("/workspace/"));
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
  <div :class="{ 'workspace-mode': inWorkspace }">
    <a class="skip-link" href="#main">К содержимому</a>
    <header v-if="!inWorkspace" class="site-header">
      <div class="container header-inner">
        <PageLink to="/" class="wordmark" aria-label="Alex Game Lab — главная"
          ><img src="/assets/logo.svg" alt="" width="39" height="39" /><span
            >ALEX GAME LAB<small>ИГРЫ. ИДЕИ. ЛЮДИ.</small></span
          ></PageLink
        >
        <nav class="desktop-nav" aria-label="Главная навигация">
          <PageLink v-for="[path, label] in links" :key="path" :to="path">{{
            label
          }}</PageLink
          ><PageLink v-if="hasWorkspace" to="/workspace/"
            >Пространство<Icon name="out" :size="13"
          /></PageLink>
        </nav>
        <div class="header-actions">
          <button
            class="icon-button theme-toggle"
            :aria-label="
              theme === 'dark'
                ? 'Включить светлую тему'
                : 'Включить тёмную тему'
            "
            @click="
              theme = theme === 'dark' ? 'light' : 'dark';
              applyTheme();
            "
          >
            <Icon
              :name="theme === 'dark' ? 'sun' : 'moon'"
              :size="18"
            /></button
          ><PageLink v-if="auth.user" to="/profile/" class="profile-link"
            ><span class="avatar tiny"><Icon name="user" :size="17" /></span
            ><span>{{
              auth.profile?.display_name || "Профиль"
            }}</span></PageLink
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
        <PageLink v-for="[path, label] in links" :key="path" :to="path"
          >{{ label }}<Icon name="out" /></PageLink
        ><PageLink to="/profile/">Профиль<Icon name="user" /></PageLink
        ><PageLink v-if="hasWorkspace" to="/workspace/"
          >Рабочее пространство<Icon name="dashboard"
        /></PageLink>
      </nav>
    </header>
    <header v-else class="workspace-topbar">
      <PageLink to="/" class="workspace-wordmark"
        ><img src="/assets/logo.svg" width="32" height="32" alt="" /><strong
          >AGL</strong
        ><span>Рабочее пространство</span></PageLink
      >
      <div class="button-row">
        <button
          class="icon-button"
          :aria-label="
            theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'
          "
          @click="
            theme = theme === 'dark' ? 'light' : 'dark';
            applyTheme();
          "
        >
          <Icon :name="theme === 'dark' ? 'sun' : 'moon'" /></button
        ><PageLink to="/profile/" class="workspace-account"
          ><Icon name="user" /><span>{{
            auth.profile?.display_name || "Профиль"
          }}</span></PageLink
        >
      </div>
    </header>
    <main id="main" tabindex="-1">
      <RouterView />
    </main>
    <footer v-if="!inWorkspace" class="site-footer">
      <div class="container">
        <div class="footer-top">
          <div>
            <PageLink to="/" class="footer-brand"
              >ALEX GAME LAB<span aria-hidden="true">✳</span></PageLink
            >
            <p>Любопытство превращается в идеи.<br />Идеи — в игры.</p>
          </div>
          <div class="footer-column">
            <span>Исследовать</span><PageLink to="/projects/">Проекты</PageLink
            ><PageLink to="/news/">Новости</PageLink
            ><PageLink to="/about/">О команде</PageLink>
          </div>
          <div class="footer-column">
            <span>На связи</span
            ><a :href="siteHome.channel_url" target="_blank" rel="noopener"
              >{{ siteHome.channel_label }}<Icon name="out" :size="14" /></a
            ><a href="https://t.me/akaAlexey" target="_blank" rel="noopener"
              >Написать Алексею</a
            ><a
              href="https://github.com/Alex-Game-Lab"
              target="_blank"
              rel="noopener"
              >GitHub<Icon name="out" :size="14" /></a
            ><a href="https://akaalexey.ru/"
              >Алексей · akaalexey<Icon name="out" :size="14"
            /></a>
          </div>
          <div class="footer-column">
            <span>Твоё пространство</span
            ><PageLink to="/profile/">Аккаунт AGL ID</PageLink
            ><PageLink v-if="hasWorkspace" to="/workspace/"
              >Рабочее пространство</PageLink
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
  </div>
</template>
