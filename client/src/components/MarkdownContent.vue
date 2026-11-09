<script setup lang="ts">
import { computed } from "vue";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { API, covers } from "../lib/content";
const props = withDefaults(defineProps<{ body: string; format?: string }>(), {
  format: "markdown",
});
const rendered = computed(() => {
  const html = marked.parse(props.body, {
    async: false,
    gfm: true,
    breaks: true,
  }) as string;
  const safe = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "em",
      "del",
      "h2",
      "h3",
      "h4",
      "ul",
      "ol",
      "li",
      "blockquote",
      "pre",
      "code",
      "hr",
      "a",
      "img",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
    ],
    ALLOWED_ATTR: ["href", "title", "src", "alt"],
    ALLOW_DATA_ATTR: false,
  });
  const doc = new DOMParser().parseFromString(safe, "text/html");
  for (const link of doc.querySelectorAll("a")) {
    const href = link.getAttribute("href") || "";
    if (!/^(https?:\/\/|mailto:|\/(?!\/)|#)/i.test(href))
      link.removeAttribute("href");
    else {
      link.setAttribute("rel", "noopener noreferrer");
      if (href.startsWith("http")) link.setAttribute("target", "_blank");
    }
  }
  for (const image of doc.querySelectorAll("img")) {
    const source = image.getAttribute("src") || "";
    const uploaded =
      source.startsWith(API + "/v1/media/") &&
      /^[0-9a-f-]{36}$/.test(source.slice((API + "/v1/media/").length));
    if (!Object.values(covers).includes(source) && !uploaded) image.remove();
    else {
      image.setAttribute("loading", "lazy");
      image.setAttribute("decoding", "async");
    }
  }
  return doc.body.innerHTML;
});
</script>
<template>
  <div v-if="format === 'plain'" class="article-prose plain-text">
    {{ body }}
  </div>
  <div v-else class="article-prose" v-html="rendered"></div>
</template>
