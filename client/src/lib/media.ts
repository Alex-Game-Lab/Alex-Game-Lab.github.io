import { API, covers } from "./content";
import type { Article } from "./types";
export interface MediaAsset {
  id: string;
  title: string;
  alt: string;
  published: boolean;
  revision: number;
  width: number;
  height: number;
  url: string;
}
export const mediaUrl = (id: string) =>
  API + "/v1/media/" + encodeURIComponent(id);
export const coverUrl = (article: Pick<Article, "cover" | "cover_media_id">) =>
  article.cover_media_id
    ? mediaUrl(article.cover_media_id)
    : covers[article.cover];
export const summary = (body: string) =>
  body
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/[#*_>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
export async function prepareImage(file: File): Promise<string> {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 12000000
  )
    throw new Error("Выбери PNG, JPG или WebP размером до 12 МБ.");
  const image = await createImageBitmap(file);
  try {
    const ratio = Math.min(1, 1920 / Math.max(image.width, image.height)),
      canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * ratio));
    canvas.height = Math.max(1, Math.round(image.height * ratio));
    canvas
      .getContext("2d")!
      .drawImage(image, 0, 0, canvas.width, canvas.height);
    let blob: Blob | null = null;
    for (const quality of [0.86, 0.74, 0.6, 0.46]) {
      blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", quality),
      );
      if (blob && blob.size <= 350000) break;
    }
    if (!blob || blob.size > 350000)
      throw new Error("Уменьши размер изображения или выбери другое.");
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Не удалось прочитать файл."));
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.readAsDataURL(blob!);
    });
  } finally {
    image.close();
  }
}
