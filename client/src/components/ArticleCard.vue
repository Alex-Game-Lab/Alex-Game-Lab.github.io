<script setup lang="ts">
import PageLink from "./PageLink.vue";
import type { Article } from "../lib/types";
import { covers, shortDate, readingTime } from "../lib/content";
import Icon from "./Icon.vue";
import { coverUrl, summary } from "../lib/media";
defineProps<{ article: Article }>();
</script>
<template>
  <PageLink
    :to="'/news/' + article.slug + '/'"
    class="news-card"
    :class="{ 'news-card-brief': article.kind === 'news' }"
    ><div v-if="coverUrl(article) && (article.kind!=='news' || article.cover_media_id || article.cover==='rublemet')" class="news-image">
      <img
        v-if="coverUrl(article)"
        :src="coverUrl(article)"
        alt=""
        width="720"
        height="420"
        loading="lazy"
      />
      <div v-else class="cover-placeholder">
        <Icon name="article" :size="50" />
      </div>
    </div>
    <div class="news-card-body">
      <div class="meta">
        <time :datetime="article.published_at || undefined">{{
          shortDate(article.published_at)
        }}</time
        ><span>·</span
        ><span v-if="article.kind !== 'news'"
          >{{ readingTime(article.body) }} мин чтения</span
        ><span v-else>Новость</span>
      </div>
      <h3>{{ article.title }}</h3>
      <p>{{ article.excerpt || summary(article.body) }}</p>
      <div class="news-card-end">
        <span>{{ article.author }}</span
        ><Icon name="out" :size="19" />
      </div></div
  ></PageLink>
</template>
