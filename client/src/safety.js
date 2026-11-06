export const API = "https://api.alexgamelab.ru";
export const ISSUER = "https://id.alexgamelab.ru/realms/agl";
export const COVERS = Object.freeze({
  studio: "/assets/agl-studio.webp",
  rublemet: "/assets/rublemet-cover.webp",
  lab: "/assets/agl-hero.webp",
  none: null,
});
export function route(hash, pathname = "/portal/") {
  const value =
    hash.replace(/^#\/?/, "") ||
    {
      "/news/": "news",
      "/projects/": "projects",
      "/account/": "account",
      "/workspace/": "workspace",
    }[pathname] ||
    "news";
  const [name, id] = value.split("/");
  return {
    name: [
      "news",
      "projects",
      "account",
      "workspace",
      "articles",
      "reports",
      "administration",
      "metrics",
      "audit",
      "article",
      "project",
    ].includes(name)
      ? name
      : "news",
    id: id || "",
  };
}
export function configIsTrusted(value) {
  return (
    value?.issuer === ISSUER &&
    value?.client_id === "agl-web" &&
    value?.console_client_id === "agl-console" &&
    value?.pkce === "S256"
  );
}
export function errorText(code) {
  return (
    {
      permission_denied: "Для этого действия нет разрешения.",
      recent_mfa_required:
        "Подтверди вход с паролем и кодом приложения. Подтверждение действует пять минут.",
      owner_content_protected:
        "Материал защищён Owner. Изменить его может только Owner.",
      owner_account_protected: "Аккаунт Owner защищён.",
      privileged_account_protected: "Для изменения этого аккаунта нужен Owner.",
      revision_conflict:
        "Запись уже изменена. Обнови страницу и повтори действие.",
      account_restricted:
        "Действует ограничение аккаунта. Свяжись с @akaAlexey.",
      authentication_required: "Сначала войди в AGL ID.",
      operation_id_conflict:
        "Номер операции уже использован с другими данными.",
      delegation_ceiling:
        "Admin может назначать и изменять только младшие роли.",
      owner_is_not_assignable:
        "Owner закреплён за владельцем вне системы назначаемых ролей.",
      validation_error: "Проверь заполненные поля.",
      stats_out_of_range: "Коррекция выходит за допустимые границы.",
      not_found: "Запись не найдена или недоступна.",
      slug_exists: "Такой адрес проекта уже занят.",
    }[code] || "Не удалось выполнить действие. Попробуй ещё раз."
  );
}
