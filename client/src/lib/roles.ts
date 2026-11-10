export function permissionDiff(previous: string[], next: string[]) {
  return {
    added: next.filter((p) => !previous.includes(p)),
    removed: previous.filter((p) => !next.includes(p)),
  };
}
export function slugify(value: string) {
  const letters: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "kh",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
  };
  return Array.from(value.toLowerCase())
    .map((c) => letters[c] ?? c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
export const systemDescriptions: Record<string, string> = {
  player: "Роль по умолчанию. Свои данные и игровой прогресс доступны как базовые возможности аккаунта.",
  admin: "Управление проектами, публикациями и младшими ролями.",
  developer: "Свои статьи и работа над назначенными проектами.",
  "qa-tester": "Отзывы, отчёты и тестирование назначенных проектов.",
  "qa-contributor": "Тестирование и собственные публикации команды.",
};
