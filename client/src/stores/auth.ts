import { reactive, computed } from "vue";
import {
  UserManager,
  User,
  InMemoryWebStorage,
  WebStorageStateStore,
} from "oidc-client-ts";
import { API, ISSUER } from "../lib/content";
import { ApiError } from "../lib/errors";
import { notify } from "./notices";
import type { Access, Profile } from "../lib/types";

export const auth = reactive<{
  user: User | null;
  profile: Profile | null;
  access: Access | null;
  loading: boolean;
  ready: boolean;
}>({ user: null, profile: null, access: null, loading: true, ready: false });
let current: UserManager | null = null;
let renewing: Promise<User | null> | null = null;
export function makeManager(client = "agl-web") {
  return new UserManager({
    authority: ISSUER,
    client_id: client,
    redirect_uri: location.origin + "/auth/callback/",
    silent_redirect_uri: location.origin + "/auth/silent/",
    post_logout_redirect_uri: location.origin + "/",
    response_type: "code",
    scope: "openid profile email agl-api",
    ui_locales: "ru",
    userStore: new WebStorageStateStore({ store: new InMemoryWebStorage() }),
    stateStore: new WebStorageStateStore({ store: sessionStorage }),
    automaticSilentRenew: false,
    monitorSession: false,
    loadUserInfo: true,
    revokeTokensOnSignout: true,
    silentRequestTimeoutInSeconds: 4,
  });
}
export function can(permission: string, project?: string) {
  return (
    !!auth.access &&
    (auth.access.owner ||
      (project
        ? (
            auth.access.projects.find((p) => p.slug === project)?.permissions ??
            auth.access.permissions
          ).includes(permission)
        : auth.access.permissions.includes(permission)))
  );
}
export function canSome(permission: string) {
  return (
    can(permission) ||
    !!auth.access?.projects.some((p) => p.permissions.includes(permission))
  );
}
const teamPermissions = [
  "articles.create",
  "articles.edit",
  "articles.edit_any",
  "projects.edit",
  "projects.manage",
  "reports.create",
  "reports.read_all",
  "reports.read_assigned",
  "roles.manage_basic",
  "roles.manage",
  "permissions.manage",
  "users.read",
  "metrics.read",
  "audit.read",
];
export const hasWorkspace = computed(
  () =>
    !!auth.user &&
    (auth.access?.owner || teamPermissions.some((p) => canSome(p))),
);
export async function accessToken() {
  if (!auth.user) throw new ApiError("authentication_required", 401);
  if (auth.user.expired || (auth.user.expires_in ?? 0) < 30) {
    try {
      if (!renewing)
        renewing = current!.signinSilent().finally(() => (renewing = null));
      auth.user = await renewing;
    } catch {
      await clearAuth();
      throw new ApiError("authentication_required", 401);
    }
  }
  if (!auth.user) throw new ApiError("authentication_required", 401);
  return auth.user.access_token;
}
async function readMe(path: string) {
  const token = await accessToken();
  const r = await fetch(API + "/v1" + path, {
    headers: { Authorization: "Bearer " + token },
    cache: "no-store",
    credentials: "omit",
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new ApiError("authentication_required", r.status);
  return r.json();
}
export async function refreshAccess() {
  if (!auth.user) return;
  const [access, profile] = await Promise.all([
    readMe("/me/access"),
    readMe("/me"),
  ]);
  auth.access = access;
  auth.profile = profile;
}
export async function login(
  mode: "login" | "register" | "password" | "phone" = "login",
) {
  try {
    const client = "agl-web";
    sessionStorage.setItem("agl.login.client", client);
    const m = makeManager(client);
    await m.signinRedirect({
      state: { returnTo: location.pathname + location.search + location.hash },
      ...(mode === "register" ? { prompt: "create" } : {}),
      ...(["password", "phone"].includes(mode)
        ? { prompt: "login", max_age: 0 }
        : {}),
      ...(mode === "password"
        ? { extraQueryParams: { kc_action: "UPDATE_PASSWORD" } }
        : {}),
      ...(mode === "phone"
        ? { extraQueryParams: { kc_action: "agl-link-phone" } }
        : {}),
    });
  } catch {
    notify("Не удалось открыть вход. Попробуй ещё раз.", true);
  }
}
export async function clearAuth() {
  await current?.removeUser();
  auth.user = null;
  auth.profile = null;
  auth.access = null;
  for (let i = sessionStorage.length - 1; i >= 0; i--) {
    const key = sessionStorage.key(i);
    if (key?.startsWith("agl.draft.")) sessionStorage.removeItem(key);
  }
}
export async function logout() {
  try {
    await current?.signoutRedirect();
  } catch {
    await clearAuth();
    location.assign("/");
  }
}
export async function initializeAuth(): Promise<string | null> {
  try {
    if (location.pathname === "/auth/callback/") {
      const client = sessionStorage.getItem("agl.login.client");
      if (!["agl-web", "agl-console"].includes(client || ""))
        throw new Error("Unknown login request");
      current = makeManager(client!);
      auth.user = await current.signinRedirectCallback(location.href);
      sessionStorage.removeItem("agl.login.client");
      await refreshAccess();
      const target = (auth.user.state as { returnTo?: string })?.returnTo;
      return target &&
        target.startsWith("/") &&
        !target.startsWith("//") &&
        !target.startsWith("/auth/")
        ? target
        : "/profile/";
    }
    current = makeManager();
    try {
      auth.user = await current.signinSilent();
      if (auth.user) await refreshAccess();
    } catch {
      auth.user = null;
      auth.access = null;
      auth.profile = null;
    }
  } catch {
    await clearAuth();
    notify("Вход не завершён. Попробуй войти снова.", true);
    return "/profile/";
  } finally {
    auth.loading = false;
    auth.ready = true;
  }
  return null;
}
