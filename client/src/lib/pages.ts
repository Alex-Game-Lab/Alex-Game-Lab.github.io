import { reactive, computed, watch, type Ref } from "vue";
import snapshots from "../content/published.json";
import { api } from "./api";
export interface ContentLink { label:string; url:string }
export interface ContentImage { src:string; alt:string; caption:string }
export interface ContentBlock { type:"text"|"image"|"gallery"|"project"|"links"; eyebrow?:string; title:string; body:string; image?:string; alt?:string; caption?:string; images?:ContentImage[]; links?:ContentLink[] }
export interface PageContent { title:string; intro:string; eyebrow:string; hero_image:string; hero_mobile_image:string; hero_alt:string; hero_media_id:string|null; seo_title:string; seo_description:string; seo_image:string; primary:ContentLink; secondary:ContentLink; featured_project:string; sections:ContentBlock[]; links:ContentLink[]; footer_note:string; channel_label:string; channel_url:string }
export const pageNames:Record<string,string>={"agl/home":"AGL · Главная","agl/projects":"AGL · Каталог","agl/project-rublemet":"AGL · Рублемёт","agl/news":"AGL · Новости","agl/studio":"AGL · Студия","agl/navigation":"AGL · Навигация и подвал","personal/home":"Личный · Главная","personal/about":"Личный · Обо мне","personal/projects":"Личный · Проекты","personal/project-rublemet":"Личный · Кейс Рублемёта","personal/experience":"Личный · Опыт","personal/contact":"Личный · Контакты","personal/navigation":"Личный · Навигация и подвал"};
export const defaultPages=snapshots as unknown as Record<string,PageContent>;
export const pages=reactive<Record<string,PageContent>>(JSON.parse(JSON.stringify(defaultPages)));
const requests:Record<string,Promise<void>>={};
export function applyPage(key:string,value:PageContent){if(!defaultPages[key]||!value?.title||!Array.isArray(value.sections))return;Object.assign(pages[key],value);try{localStorage.setItem('agl.page.'+key,JSON.stringify(value));}catch{}}
for(const key in pages){try{const value=JSON.parse(localStorage.getItem('agl.page.'+key)||'null');if(value?.title&&Array.isArray(value.sections))Object.assign(pages[key],value);}catch{}}
export function loadPages(site='agl'){return requests[site]||=api<{pages:Record<string,PageContent>}>('/site-content/'+site).then(result=>{for(const key in result.pages)applyPage(site+'/'+key,result.pages[key]);}).catch(()=>{});}
export function usePage(site:string,page:string){void loadPages(site);return computed(()=>pages[site+'/'+page]);}
export function imageUrl(value?:string,site='agl'){if(!value)return '';if(value.startsWith('media:'))return 'https://api.alexgamelab.ru/v1/media/'+value.slice(6);if(site==='personal'&&value.startsWith('/assets/'))return 'https://akaalexey.ru'+value;return value;}
export function heroUrl(doc:PageContent,site='agl'){return doc.hero_media_id?'https://api.alexgamelab.ru/v1/media/'+doc.hero_media_id:imageUrl(doc.hero_image,site);}
export function publicPath(key:string){const [site,page]=key.split('/');return (site==='personal'?'https://akaalexey.ru':'https://alexgamelab.ru')+({home:'/',navigation:'/',studio:'/about/','project-rublemet':'/projects/rublemet/'}[page]||'/'+page+'/');}
export function usePageMeta(doc:Ref<PageContent>){watch(doc,value=>{if(!value)return;document.title=value.seo_title||value.title;document.querySelector('meta[name="description"]')?.setAttribute('content',value.seo_description||value.intro);document.querySelector('meta[property="og:title"]')?.setAttribute('content',value.seo_title||value.title);document.querySelector('meta[property="og:description"]')?.setAttribute('content',value.seo_description||value.intro);const image=imageUrl(value.seo_image||value.hero_image);if(image)document.querySelector('meta[property="og:image"]')?.setAttribute('content',image.startsWith('/')?location.origin+image:image);},{immediate:true,deep:true});}
