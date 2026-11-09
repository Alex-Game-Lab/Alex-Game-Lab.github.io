import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";
import { initializeAuth, makeManager } from "./stores/auth";
import "./style.css";
import "./workspace.css";
if (location.pathname === "/auth/silent/") {
  void makeManager()
    .signinSilentCallback()
    .catch(() => {});
} else {
  createApp(App).use(router).mount("#app");
  void initializeAuth().then((target) => {
    if (target) void router.replace(target);
  });
}
