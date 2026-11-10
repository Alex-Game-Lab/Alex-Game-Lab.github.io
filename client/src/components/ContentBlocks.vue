<script setup lang="ts">
import { imageUrl, type ContentBlock } from '../lib/pages';
defineProps<{blocks:ContentBlock[];site?:string;preview?:boolean}>();
</script>
<template><div class="content-blocks"><section v-for="(block,index) in blocks" :key="index" class="content-section" :class="['block-'+block.type,{'with-image':block.image}]">
<div class="section-index" aria-hidden="true">{{String(index+1).padStart(2,'0')}}</div><div class="section-copy"><p v-if="block.eyebrow" class="eyebrow">{{block.eyebrow}}</p><h2>{{block.title}}</h2><p v-if="block.body" class="block-body">{{block.body}}</p><div v-if="block.links?.length" class="button-row"><a v-for="link in block.links" :key="link.url" :href="link.url" class="text-link" @click="preview&&$event.preventDefault()">{{link.label}} <span aria-hidden="true">↗</span></a></div></div>
<figure v-if="block.image"><img :src="imageUrl(block.image,site)" :alt="block.alt||''" width="1200" height="720" loading="lazy"><figcaption v-if="block.caption">{{block.caption}}</figcaption></figure>
<div v-if="block.type==='gallery'" class="content-gallery"><figure v-for="item in block.images" :key="item.src"><a :href="imageUrl(item.src,site)" target="_blank" rel="noopener" @click="preview&&$event.preventDefault()"><img :src="imageUrl(item.src,site)" :alt="item.alt" width="900" height="1100" loading="lazy"></a><figcaption>{{item.caption}}</figcaption></figure></div>
</section></div></template>
