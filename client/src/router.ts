import PrivacyView from "./views/PrivacyView.vue";
import HomeView from "./views/HomeView.vue";
import ProjectsView from "./views/ProjectsView.vue";
import ProjectView from "./views/ProjectView.vue";
import AboutView from "./views/AboutView.vue";
import NewsView from "./views/NewsView.vue";
import ArticleView from "./views/ArticleView.vue";
import { createRouter, createWebHistory } from "vue-router";
const query = new URLSearchParams(location.search),
  restored = query.get("agl_path");
if (
  restored &&
  /^\/(projects|news|workspace)\//.test(restored) &&
  !restored.includes("://")
)
  history.replaceState(null, "", restored);
if (location.pathname === "/portal/" && location.hash) {
  const [name, id] = location.hash.replace(/^#\/?/, "").split("/");
  const paths: Record<string, string> = {
    account: "/profile/",
    workspace: "/workspace/",
    articles: "/workspace/articles/",
    reports: "/workspace/reports/",
    administration: "/workspace/users/",
    metrics: "/workspace/metrics/",
    audit: "/workspace/audit/",
    news: "/news/",
    projects: "/projects/",
    article: "/news/" + encodeURIComponent(id || "") + "/",
    project: "/projects/" + encodeURIComponent(id || "") + "/",
  };
  if (paths[name]) history.replaceState(null, "", paths[name]);
}

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to, from, saved) {
    if (saved) return { ...saved, behavior: "instant" };
    if (to.hash)
      return {
        el: to.hash,
        top: 90,
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      };
    return { top: 0, left: 0, behavior: "instant" };
  },
  routes: [
    {
      path: "/",
      component: HomeView,
      meta: { title: "Игры, идеи, люди" },
    },
    {
      path: "/projects/",
      component: ProjectsView,
      meta: { title: "Проекты" },
    },
    {
      path: "/projects/:slug/",
      component: ProjectView,
      meta: { title: "Проект" },
    },
    {path:"/games/:slug/",component:ProjectView,meta:{title:"Рублемёт"}},
    {
      path: "/about/",
      component: AboutView,
      meta: { title: "О нас" },
    },
    {
      path: "/news/",
      component: NewsView,
      meta: { title: "Новости" },
    },
    {
      path: "/news/:slug/",
      component: ArticleView,
      meta: { title: "Статья" },
    },
    {
      path: "/profile/",
      component: () => import("./views/ProfileView.vue"),
      meta: { title: "Профиль", private: true },
    },
    {path:"/privacy/",component:PrivacyView,meta:{title:"Данные и конфиденциальность"}},
    { path: "/account/", redirect: "/profile/" },
    { path: "/portal/", redirect: "/news/" },
    {
      path: "/workspace/",
      component: () => import("./views/WorkspaceLayout.vue"),
      children: [
        {
          path: "",
          component: () => import("./views/WorkspaceHome.vue"),
          meta: { title: "Рабочее пространство" },
        },
        {
          path: "content/",
          component: () => import("./views/SiteContentView.vue"),
          meta: { title: "Содержимое сайта" },
        },
        {
          path: "media/",
          component: () => import("./views/MediaView.vue"),
          meta: { title: "Медиатека" },
        },
        {
          path: "articles/",
          component: () => import("./views/ArticlesView.vue"),
          meta: { title: "Публикации" },
        },
        {
          path: "articles/new/",
          component: () => import("./views/EditorView.vue"),
          meta: { title: "Новая публикация" },
        },
        {
          path: "articles/:id/",
          component: () => import("./views/EditorView.vue"),
          meta: { title: "Редактор" },
        },
        {
          path: "roles/",
          component: () => import("./views/RolesView.vue"),
          meta: { title: "Роли и права" },
        },
        {
          path: "users/",
          component: () => import("./views/UsersView.vue"),
          meta: { title: "Участники" },
        },
        {
          path: "projects/",
          component: () => import("./views/ManageProjectsView.vue"),
          meta: { title: "Управление проектами" },
        },
        {
          path: "reports/",
          component: () => import("./views/ReportsView.vue"),
          meta: { title: "Тестирование" },
        },
        {
          path: "metrics/",
          component: () => import("./views/MetricsView.vue"),
          meta: { title: "Игровые показатели" },
        },
        {
          path: "audit/",
          component: () => import("./views/AuditView.vue"),
          meta: { title: "Журнал действий" },
        },
      ],
    },
    {
      path: "/auth/callback/",
      component: () => import("./views/CallbackView.vue"),
      meta: { title: "Вход" },
    },
    {
      path: "/:pathMatch(.*)*",
      component: () => import("./views/NotFoundView.vue"),
      meta: { title: "Страница не найдена" },
    },
  ],
});
router.afterEach((to) => {
  document.title = (to.meta.title || "Alex Game Lab") + " · AGL";
  const meta = document.querySelector('meta[name="robots"]');
  meta?.setAttribute(
    "content",
    to.path.startsWith("/workspace") ||
      to.path.startsWith("/profile") ||
      to.path.startsWith("/auth")
      ? "noindex,follow"
      : "index,follow",
  );
});
