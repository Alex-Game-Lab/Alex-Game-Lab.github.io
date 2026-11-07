import {
  UserManager,
  WebStorageStateStore,
  InMemoryWebStorage,
} from "oidc-client-ts";
import {
  API,
  ISSUER,
  COVERS,
  route,
  configIsTrusted,
  errorText,
} from "./safety.js";
import "./portal.css";

const root = document.querySelector("#app");
const shell = document.querySelector("#portal-nav");
const status = document.querySelector("#connection");
const loginButton = document.querySelector("#login");
const state = {
  user: null,
  access: null,
  profile: null,
  manager: null,
  config: null,
  seq: 0,
  online: null,
  renewing: null,
};
const titles = {
  news: "Новости",
  projects: "Проекты",
  account: "Мой аккаунт",
  workspace: "Рабочее пространство",
  articles: "Редакция",
  reports: "Тестирование",
  administration: "Пользователи и права",
  metrics: "Игровые показатели",
  audit: "Журнал действий",
};
const statusNames = {
  development: "В разработке",
  testing: "Тестирование",
  released: "Выпущен",
  paused: "Приостановлен",
  draft: "Черновик",
  published: "Опубликовано",
  archived: "В архиве",
  open: "Открыт",
  triaged: "Принят",
  in_progress: "В работе",
  resolved: "Исправлен",
  closed: "Закрыт",
};
const can = (p) =>
  state.access?.owner ||
  state.access?.permissions?.includes(p) ||
  state.access?.projects?.some((x) => x.permissions.includes(p));
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith("on"))
      node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value !== null && value !== false)
      node.setAttribute(key, value === true ? "" : value);
  }
  for (const child of children.flat(Infinity))
    if (child !== null && child !== undefined && child !== false)
      node.append(
        child instanceof Node ? child : document.createTextNode(String(child)),
      );
  return node;
}
const a = (label, href, cls = "") => el("a", { href, class: cls }, label);
const button = (label, fn, cls = "button") =>
  el("button", { type: "button", class: cls, onClick: fn }, label);
const chip = (text, cls = "") => el("span", { class: "chip " + cls }, text);
function date(value) {
  return value
    ? new Intl.DateTimeFormat("ru", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(value))
    : "Дата не указана";
}
function toast(message, bad = false) {
  const n = el(
    "div",
    { class: "toast " + (bad ? "bad" : ""), role: "status" },
    message,
  );
  document.querySelector("#notices").replaceChildren(n);
  setTimeout(() => n.remove(), 9000);
}
function empty(title, text, action) {
  return el(
    "section",
    { class: "empty" },
    el("span", { class: "empty-mark", "aria-hidden": "true" }, "↗"),
    el("h2", {}, title),
    el("p", {}, text),
    action,
  );
}
function heading(label, title, text, action) {
  return el(
    "div",
    { class: "page-heading" },
    el(
      "div",
      {},
      el("p", { class: "eyebrow" }, label),
      el("h1", {}, title),
      text && el("p", { class: "lead" }, text),
    ),
    action,
  );
}
function image(cover, alt = "") {
  return COVERS[cover]
    ? el("img", {
        src: COVERS[cover],
        alt,
        loading: "lazy",
        width: 720,
        height: 450,
      })
    : null;
}
async function api(
  path,
  { method = "GET", body, private: privateRequest = false } = {},
) {
  let user = state.user;
  if (privateRequest) {
    if (!user)
      throw Object.assign(new Error("authentication_required"), {
        code: "authentication_required",
      });
    if (
      user.expired ||
      (typeof user.expires_in === "number" && user.expires_in < 30)
    ) {
      try {
        if (!state.renewing) {
          state.renewing = state.manager
            .signinSilent()
            .then((value) => {
              state.user = value;
              return value;
            })
            .finally(() => {
              state.renewing = null;
            });
        }
        user = await state.renewing;
      } catch {
        throw Object.assign(new Error("authentication_required"), {
          code: "authentication_required",
        });
      }
    }
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(API + "/v1" + path, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(privateRequest
          ? { Authorization: "Bearer " + user.access_token }
          : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: "omit",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      let value;
      try {
        value = await response.json();
      } catch {}
      const code =
        typeof value?.detail === "string" ? value.detail : "unavailable";
      throw Object.assign(new Error(code), {
        code,
        status: response.status,
        requestId: value?.request_id,
      });
    }
    state.online = true;
    return response.status === 204 ? {} : await response.json();
  } finally {
    clearTimeout(timeout);
  }
}
async function action(work, done) {
  try {
    await work();
    toast(done || "Сохранено");
    await refreshAccess();
    await render();
  } catch (error) {
    toast(
      errorText(error.code) +
        (error.requestId ? " Код обращения: " + error.requestId : ""),
      true,
    );
  }
}
function navigation() {
  const links = [
    ["news", "Новости"],
    ["projects", "Проекты"],
    ["account", "Аккаунт"],
  ];
  if (state.user) {
    links.push(["workspace", "Рабочее пространство"]);
    if (can("articles.create") || can("articles.edit_any"))
      links.push(["articles", "Редакция"]);
    if (
      can("reports.create") ||
      can("reports.read_all") ||
      can("reports.read_assigned")
    )
      links.push(["reports", "Тестирование"]);
    if (can("users.read")) links.push(["administration", "Пользователи"]);
    if (can("metrics.read") || can("players.adjust"))
      links.push(["metrics", "Показатели"]);
    if (can("audit.read")) links.push(["audit", "Журнал"]);
  }
  const current = route(location.hash, location.pathname).name;
  shell.replaceChildren(
    ...links.map(([name, label]) =>
      a(label, "#" + name, current === name ? "active" : ""),
    ),
  );
  loginButton.textContent = state.user ? "Выйти" : "Войти";
}
function manager(clientId) {
  return new UserManager({
    authority: ISSUER,
    client_id: clientId,
    redirect_uri: location.origin + "/auth/callback/",
    post_logout_redirect_uri: location.origin + "/portal/",
    response_type: "code",
    scope: "openid profile email agl-api",
    ui_locales: "ru",
    userStore: new WebStorageStateStore({ store: new InMemoryWebStorage() }),
    stateStore: new WebStorageStateStore({ store: sessionStorage }),
    automaticSilentRenew: false,
    loadUserInfo: true,
    monitorSession: false,
    revokeTokensOnSignout: true,
  });
}
async function signIn(staff = false, mode = "login") {
  try {
    if (!state.config) {
      const value = await api("/auth/config");
      if (!configIsTrusted(value))
        throw new Error("Invalid identity configuration");
      state.config = value;
    }
    const client = staff ? "agl-console" : "agl-web";
    sessionStorage.setItem("agl.login.client", client);
    const m = manager(client);
    await m.signinRedirect({
      state: { route: location.hash || "#account" },
      ...(staff ? { prompt: "login", max_age: 0 } : {}),
      ...(mode === "register" ? { prompt: "create" } : {}),
      ...(["agl-link-phone", "UPDATE_PASSWORD"].includes(mode)
        ? { prompt: "login", max_age: 0, extraQueryParams: { kc_action: mode } }
        : {}),
    });
  } catch {
    toast(
      "Сервис входа пока недоступен. Попробуй позже или напиши @akaAlexey.",
      true,
    );
  }
}
loginButton.addEventListener("click", async () => {
  if (!state.user) {
    await signIn();
    return;
  }
  try {
    await state.manager.signoutRedirect();
  } catch {
    await state.manager?.removeUser();
    state.user = null;
    state.access = null;
    navigation();
    await render();
  }
});
async function refreshAccess() {
  if (!state.user) return;
  try {
    [state.access, state.profile] = await Promise.all([
      api("/me/access", { private: true }),
      api("/me", { private: true }),
    ]);
    navigation();
  } catch (error) {
    if (error.status === 401) {
      state.user = null;
      state.access = null;
      navigation();
    } else throw error;
  }
}
function staffConfirm() {
  return el(
    "div",
    { class: "security-note" },
    el(
      "div",
      {},
      el("strong", {}, "Подтверждение важных действий"),
      el(
        "p",
        {},
        "Роли, блокировки и игровые показатели требуют входа с паролем и кодом приложения. Подтверждение действует пять минут.",
      ),
    ),
    button("Подтвердить вход ↗", () => signIn(true), "button secondary"),
  );
}
function field(
  label,
  name,
  {
    type = "text",
    value = "",
    required = true,
    options = null,
    maxLength = 10000,
    min,
    max,
    help,
  } = {},
) {
  let input;
  if (options) {
    input = el(
      "select",
      { name, id: "f-" + name, required },
      ...options.map((x) =>
        el(
          "option",
          {
            value: Array.isArray(x) ? x[0] : x,
            selected: (Array.isArray(x) ? x[0] : x) === String(value),
          },
          Array.isArray(x) ? x[1] : x,
        ),
      ),
    );
  } else if (type === "textarea") {
    input = el(
      "textarea",
      { name, id: "f-" + name, required, rows: 5, maxlength: maxLength },
      value,
    );
  } else
    input = el("input", {
      type,
      name,
      id: "f-" + name,
      value,
      required,
      maxlength: maxLength,
      min,
      max,
      autocomplete: type === "email" ? "email" : "off",
    });
  return el(
    "label",
    { class: "field" },
    el("span", {}, label),
    input,
    help && el("small", {}, help),
  );
}
function form(fields, onSubmit, label = "Сохранить") {
  const result = el(
    "form",
    { class: "editor" },
    ...fields,
    el(
      "div",
      { class: "form-end" },
      el("p", { class: "muted" }, "Проверь данные перед сохранением."),
      el("button", { type: "submit", class: "button" }, label),
    ),
  );
  result.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = result.querySelector("[type=submit]");
    submit.disabled = true;
    try {
      await onSubmit(Object.fromEntries(new FormData(result)));
    } catch (error) {
      toast(errorText(error.code), true);
    } finally {
      submit.disabled = false;
    }
  });
  return result;
}
function openEditor(title, content) {
  const dialog = el(
    "dialog",
    { class: "dialog", "aria-label": title },
    el(
      "div",
      { class: "dialog-heading" },
      el("h2", {}, title),
      button("Закрыть ×", () => dialog.close(), "text-button"),
    ),
    content,
  );
  document.body.append(dialog);
  dialog.addEventListener("close", () => dialog.remove());
  dialog.showModal();
  return dialog;
}
async function change(title, fields, work, label) {
  let dialog;
  dialog = openEditor(
    title,
    form(
      fields,
      async (values) => {
        try {
          await work(values);
          dialog.close();
          toast("Сохранено");
          await refreshAccess();
          await render();
        } catch (error) {
          toast(errorText(error.code), true);
        }
      },
      label,
    ),
  );
}
function pagination(items, offset, limit, path) {
  return el(
    "div",
    { class: "pagination" },
    offset > 0 &&
      button(
        "← Предыдущие",
        () => navigatePage(path, Math.max(0, offset - limit)),
        "button secondary",
      ),
    items.length === limit &&
      button(
        "Следующие →",
        () => navigatePage(path, offset + limit),
        "button secondary",
      ),
  );
}
let pageOffset = 0;
function navigatePage(path, offset) {
  pageOffset = offset;
  render();
}

async function newsView(seq) {
  const data = await api("/news?limit=12&offset=" + pageOffset);
  if (seq !== state.seq) return;
  const cards = data.items.map((row) =>
    a("", "#article/" + row.slug, "article-card"),
  );
  data.items.forEach((row, i) =>
    cards[i].append(
      image(row.cover),
      el(
        "div",
        { class: "card-body" },
        el(
          "p",
          { class: "card-meta" },
          date(row.published_at) + " · " + row.author,
        ),
        el("h2", {}, row.title),
        el("p", {}, row.excerpt),
        el("span", { class: "card-link" }, "Читать материал ↗"),
      ),
    ),
  );
  return [
    heading(
      "ИЗ ЛАБОРАТОРИИ",
      "То, над чем мы работаем.",
      "Новости команды, заметки о разработке и истории проектов.",
    ),
    data.items.length
      ? el("div", { class: "cards" }, cards)
      : empty(
          "Первая история ещё впереди.",
          "Здесь появятся опубликованные заметки команды. Следить за проектами можно уже сейчас.",
          a("Посмотреть проекты ↗", "#projects", "button"),
        ),
    pagination(data.items, pageOffset, 12, "news"),
  ];
}
async function projectsView() {
  const data = await api("/projects?limit=50");
  return [
    heading(
      "ALEX GAME LAB",
      "Идеи обретают форму.",
      "Игры и программные продукты команды. У каждого проекта — своя история.",
    ),
    el(
      "div",
      { class: "cards project-cards" },
      ...data.items.map(
        (row) =>
          a("", "#project/" + row.slug, "article-card").appendChild(
            el(
              "div",
              {},
              image(row.cover),
              el(
                "div",
                { class: "card-body" },
                chip(statusNames[row.status] || row.status),
                el("h2", {}, row.title),
                el("p", {}, row.summary),
                el("span", { class: "card-link" }, "О проекте ↗"),
              ),
            ),
          ).parentElement,
      ),
    ),
  ];
}
async function projectView(id) {
  const row = await api("/projects/" + encodeURIComponent(id));
  const reviews = await api("/projects/" + encodeURIComponent(id) + "/reviews");
  let ownReview = null;
  if (state.user && can("reviews.create")) {
    try {
      ownReview = await api(
        "/workspace/projects/" + encodeURIComponent(id) + "/review",
        { private: true },
      );
    } catch (error) {
      if (error.status !== 404) throw error;
    }
  }
  return [
    a("← Все проекты", "#projects", "back"),
    el(
      "section",
      { class: "project-hero" },
      el(
        "div",
        {},
        el("p", { class: "eyebrow" }, "ПРОЕКТ AGL"),
        chip(statusNames[row.status] || row.status),
        el("h1", {}, row.title),
        el("p", { class: "lead" }, row.summary),
      ),
      image(row.cover),
    ),
    el(
      "section",
      { class: "prose" },
      el("h2", {}, "О проекте"),
      el("p", { class: "plain-text" }, row.description),
      id === "rublemet" &&
        a("Страница «Рублемёта» ↗", "/games/rublemet/", "button secondary"),
    ),
    el(
      "section",
      {},
      el(
        "div",
        { class: "section-heading" },
        el("h2", {}, "Отзывы тестировщиков"),
        can("reviews.create") &&
          button(ownReview ? "Изменить мой отзыв" : "Написать отзыв", () =>
            change(
              "Отзыв о проекте",
              [
                field("Оценка", "rating", {
                  value: String(ownReview?.rating || 5),
                  options: [
                    ["5", "5 — отлично"],
                    ["4", "4"],
                    ["3", "3"],
                    ["2", "2"],
                    ["1", "1"],
                  ],
                }),
                field("Текст отзыва", "body", {
                  value: ownReview?.body || "",
                  type: "textarea",
                  maxLength: 4000,
                }),
              ],
              (v) =>
                api(
                  "/workspace/projects/" + encodeURIComponent(id) + "/review",
                  {
                    method: "PUT",
                    private: true,
                    body: {
                      rating: Number(v.rating),
                      body: v.body,
                      expected_revision: ownReview?.revision || 0,
                    },
                  },
                ),
            ),
          ),
      ),
      reviews.items.length
        ? el(
            "div",
            { class: "list" },
            ...reviews.items.map((x) =>
              el(
                "article",
                { class: "list-item" },
                el("strong", {}, "★ " + x.rating + " · " + x.author),
                el("p", { class: "plain-text" }, x.body),
                can("reviews.moderate") &&
                  button(
                    "Удалить отзыв",
                    () =>
                      confirmAction(
                        "Удалить отзыв?",
                        "Действие будет записано в журнал.",
                        () =>
                          api(
                            "/workspace/reviews/" +
                              x.id +
                              "?expected_revision=" +
                              x.revision,
                            { method: "DELETE", private: true },
                          ),
                      ),
                    "text-button",
                  ),
              ),
            ),
          )
        : el("p", { class: "muted" }, "Отзывов пока нет."),
    ),
  ];
}
async function articleView(id) {
  const row = await api("/news/" + encodeURIComponent(id));
  return [
    a("← Все новости", "#news", "back"),
    el(
      "article",
      { class: "reading" },
      el("p", { class: "eyebrow" }, "ЗАМЕТКИ КОМАНДЫ"),
      el("h1", {}, row.title),
      el(
        "p",
        { class: "card-meta" },
        date(row.published_at) + " · " + row.author,
      ),
      image(row.cover),
      el("p", { class: "lead" }, row.excerpt),
      el("div", { class: "plain-text article-text" }, row.body),
      row.project_slug &&
        a("К проекту ↗", "#project/" + row.project_slug, "button secondary"),
    ),
  ];
}
async function accountView() {
  if (!state.user)
    return [
      heading(
        "AGL ID",
        "Один аккаунт для всей AGL",
        "Твой профиль на сайте и в подключённых играх.",
      ),
      el(
        "section",
        { class: "account-intro" },
        el(
          "div",
          {},
          chip("Единый вход"),
          el("h2", {}, "С возвращением"),
          el(
            "p",
            {},
            "Войди по нику или почте и паролю. Если ты здесь впервые, создай аккаунт — нужны только ник и пароль.",
          ),
          el("div", { class: "auth-entry-actions" },
            button("Войти", () => signIn()),
            button("Создать аккаунт", () => signIn(false, "register"), "button secondary"),
          ),
          el("p", { class: "muted small" }, "Почта при регистрации необязательна. Приложение с кодами для обычного входа настраивать не нужно."),
        ),
        image("rublemet"),
      ),
      el(
        "p",
        { class: "muted" },
        "Не получается войти? Напиши @akaAlexey в Telegram — поможем восстановить доступ.",
      ),
    ];
  const [games, phone] = await Promise.all([
    api("/games"), api("/me/phone", { private: true }).catch(() => null),
  ]);
  return [
    heading(
      "ЛИЧНЫЙ КАБИНЕТ",
      state.profile.display_name || "Добро пожаловать.",
      "Здесь твой профиль и данные подключённых игр.",
    ),
    el("section", { class: "panel account-security" },
      el("h2", {}, "Вход в аккаунт"),
      el("p", {}, phone?.linked ? "Телефон подтверждён: " + phone.masked_phone :
        phone?.enabled ? "Привяжи телефон, чтобы входить по SMS в этот же аккаунт." :
        "Вход по SMS появится после подключения сервиса отправки кодов. Сейчас работает вход по нику или почте и паролю."),
      el("div", { class: "auth-entry-actions" },
        button("Изменить пароль", () => signIn(false, "UPDATE_PASSWORD"), "button secondary"),
        phone?.enabled && !phone.linked && button("Привязать телефон", () => signIn(false, "agl-link-phone"), "button secondary"),
      ),
    ),
    el(
      "div",
      { class: "account-grid" },
      el(
        "section",
        { class: "panel" },
        el("h2", {}, "Профиль"),
        form(
          [
            field("Имя в профиле", "display_name", {
              value: state.profile.display_name,
              required: false,
              maxLength: 80,
            }),
            field("Язык", "locale", {
              value: state.profile.locale,
              options: [
                ["ru", "Русский"],
                ["en", "English"],
              ],
            }),
          ],
          (v) =>
            action(
              () => api("/me", { method: "PATCH", private: true, body: v }),
              "Профиль обновлён",
            ),
        ),
      ),
      el(
        "section",
        { class: "panel" },
        el("p", { class: "eyebrow" }, "ТВОЙ ДОСТУП"),
        el("h2", {}, state.access.owner ? "Owner" : "Участник AGL"),
        el(
          "div",
          { class: "chips" },
          ...(state.access.roles.length
            ? state.access.roles.map((x) => chip(x.title))
            : [chip("Игрок")]),
        ),
        el(
          "p",
          { class: "muted small" },
          "ID аккаунта: " + state.access.account_id,
        ),
        state.access.restrictions.length &&
          el("p", {}, "Есть ограничения для отдельных проектов."),
      ),
    ),
    el(
      "section",
      {},
      el("h2", {}, "Подключённые игры"),
      el(
        "div",
        { class: "list" },
        ...games.map((game) =>
          el(
            "article",
            { class: "list-item" },
            el(
              "div",
              {},
              el("h3", {}, game.title),
              chip(statusNames[game.status] || game.status),
            ),
            button(
              "Мои сохранения",
              () => showSaves(game.slug),
              "button secondary",
            ),
          ),
        ),
      ),
    ),
  ];
}
async function showSaves(slug) {
  const rows = await Promise.all(
    [1, 2, 3].map(async (slot) => {
      try {
        const data = await api("/games/" + slug + "/saves/" + slot, {
          private: true,
        });
        return el(
          "div",
          { class: "list-item" },
          el("strong", {}, "Слот " + slot),
          el(
            "p",
            {},
            "Версия " + data.revision + " · " + date(data.updated_at),
          ),
        );
      } catch (e) {
        return el(
          "div",
          { class: "list-item" },
          el("strong", {}, "Слот " + slot),
          el("p", {}, e.status === 404 ? "Пока пусто" : errorText(e.code)),
        );
      }
    }),
  );
  openEditor(
    "Облачные сохранения",
    el(
      "div",
      { class: "list" },
      rows,
      el(
        "p",
        { class: "muted" },
        "Игровое сохранение меняется из игры. Авторитетные игровые показатели хранятся отдельно.",
      ),
    ),
  );
}
async function workspaceView() {
  const data = await api("/workspace/projects", { private: true });
  return [
    heading(
      "РАБОЧЕЕ ПРОСТРАНСТВО",
      "Делаем следующий шаг.",
      "Твои проекты, публикации и отчёты — в одном месте.",
    ),
    el(
      "div",
      { class: "workspace-tiles" },
      ...[
        [
          can("articles.create"),
          "Редакция",
          "Истории и новости команды.",
          "#articles",
        ],
        [
          can("reports.create") ||
            can("reports.read_all") ||
            can("reports.read_assigned"),
          "Тестирование",
          "Отчёты и замечания по проектам.",
          "#reports",
        ],
        [
          can("users.read"),
          "Пользователи",
          "Назначения, роли и ограничения.",
          "#administration",
        ],
      ]
        .filter((x) => x[0])
        .map(
          (x) =>
            a("", x[3], "tile").appendChild(
              el(
                "div",
                {},
                el("h2", {}, x[1]),
                el("p", {}, x[2]),
                el("span", { class: "card-link" }, "Открыть ↗"),
              ),
            ).parentElement,
        ),
    ),
    el(
      "div",
      { class: "section-heading" },
      el("h2", {}, "Проекты в работе"),
      can("projects.manage") && button("Новый проект", () => editProject()),
    ),
    data.items.length
      ? el(
          "div",
          { class: "list" },
          ...data.items.map((row) =>
            el(
              "article",
              { class: "list-item" },
              el(
                "div",
                {},
                el("h3", {}, row.title),
                chip(row.published ? "Публичный" : "Скрытый"),
                row.owner_protected && chip("Защита Owner"),
              ),
              el(
                "div",
                { class: "row-actions" },
                button(
                  "Редактировать",
                  () => editProject(row),
                  "button secondary",
                ),
                can("projects.assign") &&
                  button("Участники", () => projectMembers(row), "text-button"),
                state.access.owner &&
                  row.owner_protected &&
                  button(
                    "Разрешить делегирование",
                    () =>
                      confirmAction(
                        "Снять защиту проекта?",
                        "Назначенные разработчики и администраторы смогут изменять этот проект.",
                        () =>
                          api(
                            "/workspace/projects/" +
                              row.slug +
                              "/release-protection",
                            { method: "POST", private: true },
                          ),
                      ),
                    "text-button",
                  ),
              ),
            ),
          ),
        )
      : empty(
          "Назначений пока нет.",
          "Когда Owner или Admin назначит тебе проект, он появится здесь.",
        ),
  ];
}
function confirmAction(title, text, work) {
  let d;
  d = openEditor(
    title,
    el(
      "div",
      {},
      el("p", {}, text),
      el(
        "div",
        { class: "row-actions" },
        button("Отмена", () => d.close(), "button secondary"),
        button("Подтвердить", async () => {
          d.close();
          await action(work);
        }),
      ),
    ),
  );
}
function projectFields(row = {}) {
  return [
    !row.slug &&
      field("Адрес проекта", "slug", {
        maxLength: 64,
        help: "Латинские буквы, цифры и дефисы.",
      }),
    field("Название", "title", { value: row.title, maxLength: 120 }),
    field("Кратко о проекте", "summary", {
      type: "textarea",
      value: row.summary,
      maxLength: 500,
    }),
    field("Описание", "description", {
      type: "textarea",
      value: row.description,
      required: false,
      maxLength: 20000,
    }),
    field("Состояние", "status", {
      value: row.status || "development",
      options: ["development", "testing", "released", "paused"].map((x) => [
        x,
        statusNames[x],
      ]),
    }),
    field("Обложка", "cover", {
      value: row.cover || "studio",
      options: [
        ["studio", "Студия"],
        ["rublemet", "Рублемёт"],
        ["lab", "Лаборатория"],
        ["none", "Без обложки"],
      ],
    }),
    field("Видимость", "published", {
      value: String(row.published ?? false),
      options: [
        ["false", "Скрытый проект"],
        ["true", "Публичный проект"],
      ],
    }),
  ].filter(Boolean);
}
function editProject(row) {
  change(
    row ? "Редактирование проекта" : "Новый проект",
    projectFields(row),
    (v) =>
      api("/workspace/projects" + (row ? "/" + row.slug : ""), {
        method: row ? "PUT" : "POST",
        private: true,
        body: {
          ...v,
          published: v.published === "true",
          ...(row ? { expected_revision: row.revision } : { kind: "game" }),
        },
      }),
  );
}
async function projectMembers(row) {
  try {
    const members = await api("/workspace/projects/" + row.slug + "/members", {
      private: true,
    });
    let d;
    d = openEditor(
      "Участники: " + row.title,
      el(
        "div",
        {},
        el(
          "div",
          { class: "list" },
          ...members.items.map((x) =>
            el(
              "div",
              { class: "list-item" },
              el("span", {}, x.account_id + " · " + x.kind),
              button(
                "Убрать",
                () => {
                  d.close();
                  action(() =>
                    api(
                      "/workspace/projects/" +
                        row.slug +
                        "/members/" +
                        x.account_id,
                      { method: "DELETE", private: true },
                    ),
                  );
                },
                "text-button",
              ),
            ),
          ),
        ),
        form(
          [
            field("ID аккаунта", "account_id"),
            field("Назначение", "kind", {
              options: [
                ["developer", "Разработчик"],
                ["tester", "Тестировщик"],
              ],
            }),
          ],
          async (v) => {
            await api("/workspace/projects/" + row.slug + "/members", {
              method: "PUT",
              private: true,
              body: v,
            });
            d.close();
            toast("Участник назначен");
          },
        ),
      ),
    );
  } catch (e) {
    toast(errorText(e.code), true);
  }
}
async function articlesView() {
  const data = await api("/workspace/articles?limit=24&offset=" + pageOffset, {
    private: true,
  });
  return [
    heading(
      "РЕДАКЦИЯ",
      "Есть о чём рассказать.",
      "Developer и QA Contributor публикуют материалы сразу.",
      can("articles.create") &&
        button("Написать статью +", () => editArticle()),
    ),
    data.items.length
      ? el(
          "div",
          { class: "list" },
          ...data.items.map((row) =>
            el(
              "article",
              { class: "list-item" },
              el(
                "div",
                {},
                chip(statusNames[row.status]),
                row.owner_protected && chip("Owner"),
                el("h2", {}, row.title),
                el(
                  "p",
                  { class: "muted" },
                  row.author + " · " + date(row.updated_at),
                ),
              ),
              el(
                "div",
                { class: "row-actions" },
                button(
                  "Редактировать",
                  () => editArticle(row),
                  "button secondary",
                ),
                button(
                  "Удалить",
                  () =>
                    confirmAction(
                      "Удалить статью?",
                      "Материал исчезнет из новостей. Действие попадёт в журнал.",
                      () =>
                        api(
                          "/workspace/articles/" +
                            row.id +
                            "?expected_revision=" +
                            row.revision,
                          { method: "DELETE", private: true },
                        ),
                    ),
                  "text-button",
                ),
              ),
            ),
          ),
        )
      : empty(
          "Начни с одной истории.",
          "Расскажи о решении, над которым работаешь, или о новой части проекта.",
        ),
    pagination(data.items, pageOffset, 24, "articles"),
  ];
}
async function editArticle(row = {}) {
  try {
    const projects = await api("/workspace/projects", { private: true });
    await change(
      row.id ? "Редактирование статьи" : "Новая статья",
      [
        field("Заголовок", "title", { value: row.title, maxLength: 160 }),
        field("Короткое описание", "excerpt", {
          type: "textarea",
          value: row.excerpt,
          required: false,
          maxLength: 500,
        }),
        field("Текст статьи", "body", {
          type: "textarea",
          value: row.body,
          maxLength: 30000,
          help: "Обычный текст. HTML не выполняется.",
        }),
        field("Проект", "project_slug", {
          value: row.project_slug || "",
          required: false,
          options: [
            ["", "Без проекта"],
            ...projects.items.map((x) => [x.slug, x.title]),
          ],
        }),
        field("Обложка", "cover", {
          value: row.cover || "studio",
          options: [
            ["studio", "Студия"],
            ["rublemet", "Рублемёт"],
            ["lab", "Лаборатория"],
            ["none", "Без обложки"],
          ],
        }),
        field("Состояние", "status", {
          value: row.status || "published",
          options: (row.id
            ? ["draft", "published", "archived"]
            : ["draft", "published"]
          ).map((x) => [x, statusNames[x]]),
        }),
      ],
      (v) =>
        api("/workspace/articles" + (row.id ? "/" + row.id : ""), {
          method: row.id ? "PUT" : "POST",
          private: true,
          body: {
            ...v,
            project_slug: v.project_slug || null,
            ...(row.id ? { expected_revision: row.revision } : {}),
          },
        }),
      row.id ? "Сохранить изменения" : "Сохранить статью",
    );
  } catch (e) {
    toast(errorText(e.code), true);
  }
}
async function reportsView() {
  const data = await api("/workspace/reports?limit=24&offset=" + pageOffset, {
    private: true,
  });
  const rows = data.items.map((row) => {
    const own = row.author_id === state.access.account_id || state.access.owner;
    const actions = el(
      "div",
      { class: "row-actions" },
      own && button("Редактировать", () => editReport(row), "button secondary"),
      can("reports.triage") &&
        button(
          "Состояние",
          () =>
            change(
              "Состояние отчёта",
              [
                field("Состояние", "status", {
                  value: row.status,
                  options: [
                    "open",
                    "triaged",
                    "in_progress",
                    "resolved",
                    "closed",
                  ].map((x) => [x, statusNames[x]]),
                }),
              ],
              (v) =>
                api("/workspace/reports/" + row.id + "/status", {
                  method: "PATCH",
                  private: true,
                  body: { ...v, expected_revision: row.revision },
                }),
            ),
          "text-button",
        ),
      own &&
        button(
          "Удалить",
          () =>
            confirmAction(
              "Удалить отчёт?",
              "Он исчезнет из рабочего пространства.",
              () =>
                api(
                  "/workspace/reports/" +
                    row.id +
                    "?expected_revision=" +
                    row.revision,
                  { method: "DELETE", private: true },
                ),
            ),
          "text-button",
        ),
    );
    const details = el(
      "details",
      {},
      el("summary", {}, "Подробности"),
      ...["steps", "expected", "actual", "environment"].map((key, i) =>
        el(
          "section",
          {},
          el(
            "h3",
            {},
            [
              "Шаги воспроизведения",
              "Ожидаемый результат",
              "Фактический результат",
              "Окружение",
            ][i],
          ),
          el("p", { class: "plain-text" }, row[key]),
        ),
      ),
    );
    return el(
      "article",
      { class: "report-item" },
      el(
        "div",
        { class: "section-heading" },
        el(
          "div",
          {},
          chip(statusNames[row.status]),
          chip(row.severity),
          el("h2", {}, row.title),
          el("p", { class: "muted" }, row.project_slug + " · " + row.build),
        ),
        actions,
      ),
      details,
    );
  });
  return [
    heading(
      "ТЕСТИРОВАНИЕ",
      "Каждая деталь имеет значение.",
      "Отчёты видят автор, Owner, Admin и разработчики назначенного проекта.",
      can("reports.create") && button("Создать отчёт +", () => editReport()),
    ),
    rows.length
      ? el("div", { class: "list" }, rows)
      : empty(
          "Здесь пока тихо.",
          "Новые отчёты появятся после проверки первых сборок.",
        ),
    pagination(data.items, pageOffset, 24, "reports"),
  ];
}

async function editReport(row = {}) {
  try {
    const pub = await api("/projects?limit=50");
    const assigned = await api("/workspace/projects", { private: true });
    const choices = [
      ...new Map(
        [...pub.items, ...assigned.items].map((x) => [x.slug, x]),
      ).values(),
    ];
    change(
      row.id ? "Редактирование отчёта" : "Новый отчёт",
      [
        field("Проект", "project_slug", {
          value: row.project_slug,
          options: choices.map((x) => [x.slug, x.title]),
        }),
        field("Название проблемы", "title", {
          value: row.title,
          maxLength: 160,
        }),
        field("Версия сборки", "build", { value: row.build, maxLength: 80 }),
        field("Серьёзность", "severity", {
          value: row.severity || "normal",
          options: [
            ["minor", "Незначительная"],
            ["normal", "Обычная"],
            ["major", "Серьёзная"],
            ["critical", "Критическая"],
          ],
        }),
        ...["steps", "expected", "actual", "environment"].map((key, i) =>
          field(
            [
              "Шаги воспроизведения",
              "Ожидаемый результат",
              "Фактический результат",
              "Устройство и окружение",
            ][i],
            key,
            {
              type: "textarea",
              value: row[key],
              required: key !== "environment",
              maxLength:
                key === "steps" ? 10000 : key === "environment" ? 500 : 5000,
            },
          ),
        ),
      ],
      (v) =>
        api("/workspace/reports" + (row.id ? "/" + row.id : ""), {
          method: row.id ? "PUT" : "POST",
          private: true,
          body: {
            ...v,
            ...(row.id ? { expected_revision: row.revision } : {}),
          },
        }),
    );
  } catch (e) {
    toast(errorText(e.code), true);
  }
}
async function adminView() {
  const [users, roles, permissions] = await Promise.all([
    api("/staff/users?limit=24&offset=" + pageOffset, { private: true }),
    api("/staff/roles", { private: true }),
    api("/staff/permissions", { private: true }),
  ]);
  return [
    heading(
      "УПРАВЛЕНИЕ",
      "Люди и ответственность.",
      "Роли задают обычные возможности. Owner может изменить доступ отдельного человека.",
    ),
    staffConfirm(),
    el(
      "div",
      { class: "section-heading" },
      el("h2", {}, "Пользователи"),
      button("Создать роль", () => editRole(null, permissions.items)),
    ),
    el(
      "div",
      { class: "list" },
      ...users.items.map((user) =>
        el(
          "article",
          { class: "list-item" },
          el(
            "div",
            {},
            el("h3", {}, user.display_name || "Без имени"),
            el("code", { class: "small" }, user.id),
          ),
          button(
            "Профиль и доступ",
            () => userAccess(user, roles.items, permissions.items),
            "button secondary",
          ),
        ),
      ),
    ),
    pagination(users.items, pageOffset, 24, "administration"),
    el("h2", {}, "Роли"),
    el(
      "div",
      { class: "list" },
      ...roles.items.map((row) =>
        el(
          "div",
          { class: "list-item" },
          el(
            "div",
            {},
            el("h3", {}, row.title),
            el("p", { class: "muted" }, row.permissions.length + " разрешений"),
          ),
          button(
            "Редактировать",
            () => editRole(row, permissions.items),
            "button secondary",
          ),
        ),
      ),
    ),
  ];
}
function editRole(row, permissions) {
  change(
    row ? "Роль: " + row.title : "Новая роль",
    [
      !row && field("Код роли", "slug", { maxLength: 64 }),
      field("Название", "title", { value: row?.title, maxLength: 80 }),
      field("Разрешения", "permissions", {
        type: "textarea",
        value: row?.permissions.join("\n") || "",
        required: false,
        help:
          "По одному коду на строку. Доступные: " +
          permissions.map((x) => x.id).join(", "),
      }),
    ].filter(Boolean),
    (v) =>
      api("/staff/roles" + (row ? "/" + row.slug : ""), {
        method: row ? "PUT" : "POST",
        private: true,
        body: {
          ...v,
          permissions: v.permissions.split(/[\s,]+/).filter(Boolean),
          ...(row ? { expected_revision: row.revision } : {}),
        },
      }),
  );
}
async function userAccess(user, roles, permissions) {
  try {
    const detail = await api("/staff/users/" + user.id, { private: true });
    let d;
    const controls = el(
      "div",
      {},
      el("p", { class: "muted" }, "ID: " + user.id),
      form(
        [
          field("Роли", "roles", {
            type: "textarea",
            required: false,
            value: detail.roles.join("\n"),
            help:
              "Коды через пробел или с новой строки: " +
              roles.map((x) => x.slug).join(", "),
          }),
        ],
        async (v) => {
          await api("/staff/users/" + user.id + "/roles", {
            method: "PUT",
            private: true,
            body: { roles: v.roles.split(/[\s,]+/).filter(Boolean) },
          });
          d.close();
          toast("Роли обновлены");
          await refreshAccess();
        },
        "Назначить роли",
      ),
      el("h3", {}, "Блокировки"),
      ...detail.bans.map((b) =>
        el(
          "div",
          { class: "list-item" },
          el(
            "p",
            {},
            b.reason +
              " · " +
              (b.revoked_at
                ? "Снята"
                : b.expires_at
                  ? date(b.expires_at)
                  : "Без срока"),
          ),
          !b.revoked_at &&
            button(
              "Снять",
              () => {
                d.close();
                change(
                  "Снятие блокировки",
                  [field("Причина", "reason", { maxLength: 500 })],
                  (v) =>
                    api(
                      "/staff/users/" + user.id + "/bans/" + b.id + "/revoke",
                      { method: "POST", private: true, body: v },
                    ),
                );
              },
              "text-button",
            ),
        ),
      ),
      button(
        "Заблокировать",
        () => {
          d.close();
          change(
            "Блокировка аккаунта",
            [
              field("Причина", "reason", { maxLength: 500 }),
              field("Проект (пусто — весь аккаунт)", "project_slug", {
                required: false,
              }),
              field("Окончание", "expires_at", {
                type: "datetime-local",
                required: false,
              }),
            ],
            (v) =>
              api("/staff/users/" + user.id + "/bans", {
                method: "POST",
                private: true,
                body: {
                  ...v,
                  project_slug: v.project_slug || null,
                  expires_at: v.expires_at
                    ? new Date(v.expires_at).toISOString()
                    : null,
                },
              }),
          );
        },
        "button secondary",
      ),
    );
    if (state.access.owner)
      controls.append(
        el("h3", {}, "Персональные допуски"),
        ...detail.overrides.map((o) =>
          el(
            "div",
            { class: "list-item" },
            el(
              "p",
              {},
              o.permission +
                " · " +
                o.effect +
                " · " +
                (o.project_slug || "Все проекты"),
            ),
            button(
              "Убрать",
              () => {
                d.close();
                action(() =>
                  api("/staff/users/" + user.id + "/overrides/" + o.id, {
                    method: "DELETE",
                    private: true,
                  }),
                );
              },
              "text-button",
            ),
          ),
        ),
        button(
          "Добавить допуск или запрет",
          () => {
            d.close();
            change(
              "Персональное правило",
              [
                field("Разрешение", "permission", {
                  options: permissions.map((x) => [
                    x.id,
                    x.title + " (" + x.id + ")",
                  ]),
                }),
                field("Действие", "effect", {
                  options: [
                    ["allow", "Разрешить"],
                    ["deny", "Запретить"],
                  ],
                }),
                field("Проект (пусто — все)", "project_slug", {
                  required: false,
                }),
                field("Окончание", "expires_at", {
                  type: "datetime-local",
                  required: false,
                }),
                field("Причина", "reason", { maxLength: 500 }),
              ],
              (v) =>
                api("/staff/users/" + user.id + "/overrides", {
                  method: "POST",
                  private: true,
                  body: {
                    ...v,
                    project_slug: v.project_slug || null,
                    expires_at: v.expires_at
                      ? new Date(v.expires_at).toISOString()
                      : null,
                  },
                }),
            );
          },
          "button secondary",
        ),
      );
    d = openEditor(user.display_name || "Профиль пользователя", controls);
  } catch (e) {
    toast(errorText(e.code), true);
  }
}
async function metricsView() {
  let data = null;
  if (can("metrics.read"))
    data = await api("/staff/metrics?project_slug=rublemet&days=7", {
      private: true,
    });
  const correction = () => {
    const operation = crypto.randomUUID();
    change(
      "Коррекция игровых показателей",
      [
        field("ID аккаунта", "account_id"),
        field("Код игры", "game_slug", { value: "rublemet" }),
        field("Изменение баланса", "balance_delta", {
          type: "number",
          value: 0,
        }),
        field("Изменения счётчиков (JSON)", "metrics_delta", {
          type: "textarea",
          value: "{}",
          help: 'Например: {"wins": 1}. Укажи только необходимые изменения.',
        }),
        field("Причина", "reason", { maxLength: 500 }),
      ],
      async (v) => {
        let metrics;
        try {
          metrics = JSON.parse(v.metrics_delta);
        } catch {
          throw { code: "validation_error" };
        }
        return api(
          "/staff/users/" +
            encodeURIComponent(v.account_id) +
            "/games/" +
            encodeURIComponent(v.game_slug) +
            "/adjustments",
          {
            method: "POST",
            private: true,
            body: {
              operation_id: operation,
              balance_delta: Number(v.balance_delta),
              metrics_delta: metrics,
              reason: v.reason,
            },
          },
        );
      },
      "Применить коррекцию",
    );
  };
  return [
    heading(
      "ИГРОВЫЕ ПОКАЗАТЕЛИ",
      "Понимать, что происходит.",
      "События от клиентов и серверные показатели игроков учитываются отдельно.",
    ),
    staffConfirm(),
    data &&
      el(
        "section",
        { class: "panel" },
        el("h2", {}, "Рублемёт · последние 7 дней"),
        el(
          "p",
          { class: "muted" },
          "Клиентские события могут быть неполными и подделанными. Они не подтверждают начисления.",
        ),
        data.items.length
          ? el(
              "div",
              { class: "stat-grid" },
              ...data.items.map((x) =>
                el(
                  "div",
                  {},
                  el("strong", { class: "stat-value" }, x.events),
                  el("p", {}, x.event),
                  el("small", {}, x.accounts + " аккаунтов"),
                ),
              ),
            )
          : el("p", {}, "Событий за этот период пока нет."),
      ),
    el(
      "section",
      { class: "panel" },
      el("h2", {}, "Показатели игрока"),
      form(
        [
          field("ID аккаунта", "account_id"),
          field("Код игры", "game_slug", { value: "rublemet" }),
        ],
        async (v) => {
          try {
            const r = await api(
              "/staff/users/" +
                encodeURIComponent(v.account_id) +
                "/games/" +
                encodeURIComponent(v.game_slug) +
                "/stats",
              { private: true },
            );
            openEditor(
              "Показатели игрока",
              el(
                "div",
                {},
                el("p", {}, "Баланс: " + r.balance),
                el("p", {}, "Ревизия: " + r.revision),
                el("pre", {}, JSON.stringify(r.metrics, null, 2)),
              ),
            );
          } catch (e) {
            toast(errorText(e.code), true);
          }
        },
        "Посмотреть",
      ),
      can("players.adjust") &&
        button("Корректировать показатели", correction, "button secondary"),
    ),
  ];
}

async function auditView() {
  const data = await api("/staff/audit?limit=24&offset=" + pageOffset, {
    private: true,
  });
  return [
    heading(
      "ЖУРНАЛ",
      "У каждого действия есть след.",
      "Назначения, публикации, блокировки и коррекции игровых показателей.",
    ),
    data.items.length
      ? el(
          "div",
          { class: "list" },
          ...data.items.map((row) =>
            el(
              "article",
              { class: "audit-item" },
              el(
                "div",
                {},
                chip(row.action),
                el("time", {}, date(row.created_at)),
              ),
              el("p", { class: "small" }, "Исполнитель: " + row.actor_id),
              el(
                "p",
                { class: "small" },
                row.target_kind + " · " + row.target_id,
              ),
              el(
                "details",
                {},
                el("summary", {}, "Подробности"),
                el("pre", {}, JSON.stringify(row.details, null, 2)),
              ),
            ),
          ),
        )
      : empty("Журнал пока пуст.", "Записи появятся после первых изменений."),
    pagination(data.items, pageOffset, 24, "audit"),
  ];
}
async function render() {
  const seq = ++state.seq;
  const { name, id } = route(location.hash, location.pathname);
  root.dataset.view = name;
  navigation();
  document.title = (titles[name] || "Alex Game Lab") + " · AGL";
  root.setAttribute("aria-busy", "true");
  root.replaceChildren(
    el("div", { class: "loading", role: "status" }, "Загружаем пространство…"),
  );
  try {
    if (
      !["news", "projects", "project", "article", "account"].includes(name) &&
      !state.user
    ) {
      root.replaceChildren(
        empty(
          "Здесь начинается работа команды.",
          "Войди в AGL ID, чтобы открыть своё рабочее пространство.",
          button("Войти ↗", () => signIn()),
        ),
      );
      return;
    }
    const views = {
      news: () => newsView(seq),
      projects: projectsView,
      project: () => projectView(id),
      article: () => articleView(id),
      account: accountView,
      workspace: workspaceView,
      articles: articlesView,
      reports: reportsView,
      administration: adminView,
      metrics: metricsView,
      audit: auditView,
    };
    const content = await views[name]();
    if (seq !== state.seq) return;
    status.textContent = state.online
      ? "Сервис доступен"
      : state.online === false
        ? "Нет связи с API"
        : "Статус API ещё не проверен";
    status.classList.toggle("online", state.online === true);
    root.replaceChildren(...(content || []).filter(Boolean));
  } catch (error) {
    if (seq !== state.seq) return;
    state.online = false;
    status.textContent = "Нет связи с API";
    status.classList.remove("online");
    root.replaceChildren(
      empty(
        error.status
          ? "Не удалось открыть страницу."
          : "Пространство готовится к запуску.",
        error.status
          ? errorText(error.code)
          : "Сайт доступен, но сервер аккаунтов и публикаций пока не отвечает. Попробуй позже или напиши Алексею.",
        button("Попробовать снова", render),
      ),
      el(
        "div",
        { class: "fallback-links" },
        a("О «Рублемёте» ↗", "/games/rublemet/"),
        a("Алексей · akaalexey ↗", "/akaalexey/"),
        a("Связаться в Telegram ↗", "https://t.me/akaAlexey"),
      ),
    );
  } finally {
    if (seq === state.seq) root.removeAttribute("aria-busy");
  }
}
document.querySelector(".skip").addEventListener("click", (event) => {
  event.preventDefault();
  root.focus();
  root.scrollIntoView();
});
window.addEventListener("hashchange", () => {
  pageOffset = 0;
  render();
});
document.querySelector("#theme").addEventListener("click", () => {
  const value =
    document.documentElement.dataset.theme === "light" ? "dark" : "light";
  document.documentElement.dataset.theme = value;
  try {
    localStorage.setItem("agl.theme", value);
  } catch {}
  updateTheme();
});
function updateTheme() {
  const light = document.documentElement.dataset.theme === "light";
  document.querySelector("#theme").setAttribute("aria-pressed", String(light));
  document
    .querySelector("#theme")
    .setAttribute(
      "aria-label",
      light ? "Включить тёмную тему" : "Включить светлую тему",
    );
}
try {
  document.documentElement.dataset.theme =
    localStorage.getItem("agl.theme") || "dark";
} catch {}
updateTheme();
async function start() {
  if (location.pathname === "/auth/callback/") {
    try {
      const client = sessionStorage.getItem("agl.login.client");
      if (!["agl-web", "agl-console"].includes(client))
        throw new Error("Unknown login request");
      state.manager = manager(client);
      state.user = await state.manager.signinRedirectCallback(location.href);
      sessionStorage.removeItem("agl.login.client");
      const target =
        typeof state.user.state?.route === "string" &&
        /^#[a-z/-]+$/.test(state.user.state.route)
          ? state.user.state.route
          : "#account";
      history.replaceState(null, "", "/portal/" + target);
      await refreshAccess();
    } catch {
      await state.manager?.removeUser();
      state.user = null;
      state.access = null;
      state.profile = null;
      sessionStorage.removeItem("agl.login.client");
      history.replaceState(null, "", "/portal/#account");
      toast("Вход не завершён. Нажми «Войти» и попробуй ещё раз. Если это повторяется, напиши @akaAlexey.", true);
    }
  }
  await render();
}
start();
