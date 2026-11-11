export const API = "https://api.alexgamelab.ru";
export const ISSUER = "https://id.alexgamelab.ru/realms/agl";
export const covers: Record<string, string> = {
  studio: "/assets/agl-studio.webp",
  lab: "/assets/agl-hero.webp",
  rublemet: "/assets/rublemet-cover.webp",
  worlds: "/assets/agl-worlds-v2.webp",
  workshop: "/assets/agl-workshop-v2.webp",
};
export const coverLabels: Record<string, string> = {
  worlds: "Миры AGL",
  workshop: "Мастерская",
  studio: "Студия",
  rublemet: "Рублемёт",
  lab: "Лаборатория",
  none: "Без обложки",
};
export const labels: Record<string, string> = {
  development: "В разработке",
  testing: "Тестирование",
  released: "Выпущен",
  paused: "На паузе",
  draft: "Черновик",
  published: "Опубликовано",
  archived: "В архиве",
  game: "Игра",
  software: "Приложение",
  web: "Веб-проект",
  open: "Открыт",
  triaged: "Принят",
  in_progress: "В работе",
  resolved: "Исправлен",
  closed: "Закрыт",
  minor: "Небольшая",
  normal: "Обычная",
  major: "Серьёзная",
  critical: "Критическая",
};
export const permissionGroups: Record<string, string> = {
  project_membership: "Допуск к участию в проектах",
  profile: "Профиль",
  saves: "Сохранения",
  stats: "Личные показатели",
  telemetry: "События игр",
  articles: "Статьи",
  projects: "Проекты",
  reports: "Отчёты",
  reviews: "Отзывы",
  users: "Аккаунты",
  account_notes: "Закрытые заметки об аккаунтах",
  roles: "Роли",
  permissions: "Персональные права",
  metrics: "Метрики",
  players: "Игровые показатели",
  audit: "Журнал",
  tester: "Тестирование",
};
export function date(value?: string | null) {
  return value
    ? new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Europe/Moscow",
      }).format(new Date(value))
    : "";
}
export function shortDate(value?: string | null) {
  return value
    ? new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "short",
        timeZone: "Europe/Moscow",
      }).format(new Date(value))
    : "";
}
export function readingTime(body: string) {
  return Math.max(1, Math.ceil(body.trim().split(/\s+/u).length / 180));
}
export const words = (n: number, one: string, two: string, many: string) =>
  n % 10 === 1 && n % 100 !== 11
    ? one
    : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)
      ? two
      : many;
export const readableName = (value?: string) =>
  value && !value.startsWith("tel_") && !value.includes("@")
    ? value
    : "Игрок AGL";
