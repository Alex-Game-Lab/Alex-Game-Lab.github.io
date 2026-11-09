import { reactive } from "vue";
import { api } from "./api";
export interface HomeContent {
  title: string;
  intro: string;
  channel_label: string;
  channel_url: string;
  hero_media_id: string | null;
}
export const defaultHome: HomeContent = {
  title: "Из любопытства. В целые миры.",
  intro:
    "Создаём игры, исследуем механики и собираем идеи в истории, в которых хочется остаться.",
  channel_label: "Канал AGL",
  channel_url: "https://t.me/alex_game_lab",
  hero_media_id: null,
};
export const siteHome = reactive<HomeContent>({ ...defaultHome });
function valid(value: any): value is HomeContent {
  return (
    value &&
    typeof value.title === "string" &&
    typeof value.intro === "string" &&
    typeof value.channel_label === "string" &&
    /^https:\/\//.test(value.channel_url) &&
    (value.hero_media_id === null ||
      /^[0-9a-f-]{36}$/.test(value.hero_media_id))
  );
}
try {
  const value = JSON.parse(
    localStorage.getItem("agl.published.home") || "null",
  );
  if (valid(value)) Object.assign(siteHome, value);
} catch {}
export function applyPublishedHome(content: HomeContent) {
  if (!valid(content)) return;
  Object.assign(siteHome, content);
  try {
    localStorage.setItem("agl.published.home", JSON.stringify(content));
  } catch {}
}
let request: Promise<void> | null = null;
export const loadSiteHome = () =>
  (request ||= api<{ content: HomeContent }>("/site-content/agl/home")
    .then((result) => applyPublishedHome(result.content))
    .catch(() => {}));
