import { reactive, computed } from "vue";
import {
  ErrorResponse,
  UserManager,
  User,
  InMemoryWebStorage,
  WebStorageStateStore,
} from "oidc-client-ts";
import { API, ISSUER } from "../lib/content";
import { ApiError, errorMessage } from "../lib/errors";
import { notify } from "./notices";
import type { Access, Profile } from "../lib/types";

export const auth = reactive<{
  user: User | null;
  profile: Profile | null;
  access: Access | null;
  loading: boolean;
  ready: boolean;
  loadError: string;
}>({ user: null, profile: null, access: null, loading: true, ready: false, loadError: "" });
export const accountName = computed(()=>{const nick=auth.user?.profile.preferred_username;return typeof nick==='string'&&nick&&!nick.toLowerCase().startsWith('tel_')&&!nick.toLowerCase().startsWith('phone_')&&!nick.includes('@')?nick:auth.profile?.display_name||'Профиль';});
let current: UserManager | null = null;
let renewing: Promise<void> | null = null;
const signInTimeoutSeconds = 12;
const signInErrors = new Set([
  "login_required",
  "interaction_required",
  "account_selection_required",
  "consent_required",
  "invalid_grant",
]);
function needsSignIn(error: unknown) {
  return error instanceof ErrorResponse && signInErrors.has(error.error ?? "");
}
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
    requestTimeoutInSeconds: signInTimeoutSeconds,
    silentRequestTimeoutInSeconds: signInTimeoutSeconds,
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
  "projects.create",
  "projects.edit_any",
  "projects.publish",
  "projects.publish_any",
  "projects.assign",
  "projects.assign_assigned",
  "projects.delete",
  "projects.delete_any",
  "reports.create",
  "reports.read_all",
  "reports.read_assigned",
  "roles.manage_basic",
  "roles.create_basic",
  "roles.edit_basic",
  "roles.delete_basic",
  "roles.assign_basic",
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
async function renewUser(manager: UserManager, previous: User) {
  let user: User | null = null;
  try {
    user = await manager.signinSilent({
      silentRequestTimeoutInSeconds: signInTimeoutSeconds,
    });
  } catch (error) {
    if (!needsSignIn(error)) {
      if ((previous.expires_in ?? 0) > 0) return;
      throw new ApiError("session_refresh_unavailable", 503);
    }
  }
  if (auth.user !== previous) return;
  if (user) auth.user = user;
  else await clearAuth();
}
export async function accessToken() {
  if (!auth.user || !current) throw new ApiError("authentication_required", 401);
  if ((auth.user.expires_in ?? 0) < 30) {
    await (renewing ??= renewUser(current, auth.user).finally(() => {
      renewing = null;
    }));
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
  if (!r.ok) {
    const detail=await r.json().catch(()=>null);
    throw new ApiError(typeof detail?.detail === "string" ? detail.detail : "authentication_required", r.status);
  }
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
  auth.loading = true;
  auth.loadError = "";
  const callback = location.pathname === "/auth/callback/";
  let target: string | null = null;
  try {
    if (callback) {
      const client = sessionStorage.getItem("agl.login.client");
      if (!["agl-web", "agl-console"].includes(client || ""))
        throw new Error("Unknown login request");
      current = makeManager(client!);
      auth.user = await current.signinRedirectCallback(location.href);
      sessionStorage.removeItem("agl.login.client");
      const returnTo = (auth.user.state as { returnTo?: string })?.returnTo;
      target = returnTo &&
        returnTo.startsWith("/") &&
        !returnTo.startsWith("//") &&
        !returnTo.startsWith("/auth/")
        ? returnTo
        : "/profile/";
    } else if (!auth.user) {
      current = makeManager();
      auth.user = await current.signinSilent();
    }
    await refreshAccess();
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.code === "account_deleted")) {
      await clearAuth();
      notify(errorMessage(error), true);
    } else if (callback && !auth.user) {
      sessionStorage.removeItem("agl.login.client");
      await clearAuth();
      notify("Вход не завершён. Попробуй войти снова.", true);
      target = "/profile/";
    } else if (!needsSignIn(error)) {
      auth.loadError = auth.user
        ? errorMessage(error)
        : "Не удалось проверить вход AGL ID. Проверь соединение.";
    }
  } finally {
    auth.loading = false;
    auth.ready = true;
  }
  return target;
}
