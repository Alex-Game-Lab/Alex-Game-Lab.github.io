import { pages, defaultPages, loadPages, applyPage, type PageContent } from './pages';
export type HomeContent=PageContent;
export const defaultHome=defaultPages['agl/home'];
export const siteHome=pages['agl/home'];
export const applyPublishedHome=(value:PageContent)=>applyPage('agl/home',value);
export const loadSiteHome=()=>loadPages('agl');
