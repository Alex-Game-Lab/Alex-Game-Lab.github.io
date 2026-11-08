<script setup lang="ts">
import PageLink from "./PageLink.vue";
import type { Article } from "../lib/types";
import { covers, shortDate, readingTime } from "../lib/content";
import Icon from "./Icon.vue";
defineProps<{ article: Article }>();
</script>
<template>
  <PageLink :to="'/news/' + article.slug + '/'" class="news-card"
    ><div class="news-image">
      <img
        v-if="covers[article.cover]"
        :src="covers[article.cover]"
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
        ><span>·</span><span>{{ readingTime(article.body) }} мин чтения</span>
      </div>
      <h3>{{ article.title }}</h3>
      <p>{{ article.excerpt }}</p>
      <div class="news-card-end">
        <span>{{ article.author }}</span
        ><Icon name="out" :size="19" />
      </div></div
  ></PageLink>
</template>
