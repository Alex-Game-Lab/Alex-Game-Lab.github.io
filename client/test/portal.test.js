import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
import {configIsTrusted, ISSUER, COVERS, route} from '../src/safety.js';

const sdk=`export class WebStorageStateStore {constructor(){}};export class InMemoryWebStorage{};export class UserManager{constructor(){} async signinRedirectCallback(){return globalThis.__fixtureUser} async removeUser(){} async signinSilent(){globalThis.__renewCalls++;return {...globalThis.__fixtureUser,access_token:"fixture-renewed-token",expired:false,expires_in:300}}}`;

// Bundle the actual production source, replacing only the external identity transport in the test harness.
const source=fs.readFileSync('src/app.js','utf8').replace('from "oidc-client-ts"','from "./test-sdk.js"');
const {build}=await import('esbuild');
const harness=(await build({stdin:{contents:source,resolveDir:process.cwd()+'/src'},bundle:true,write:false,format:'iife',loader:{'.css':'empty'},plugins:[{name:'fixture-idp',setup(b){b.onResolve({filter:/test-sdk\.js$/},()=>({path:'fixture',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:sdk,loader:'js'}));}}]})).outputFiles[0].text;
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
async function render({hash='#news',responses={},authenticated=false,access={},expired=false}={}){
 const {window}=parseHTML('<html><body><a class="skip" href="#app">Skip</a><nav id="portal-nav"></nav><div id="connection"></div><button id="login"></button><button id="theme"></button><main id="app"></main><div id="notices"></div></body></html>');
 const location={origin:'https://alexgamelab.ru',pathname:authenticated?'/auth/callback/':'/portal/',hash,href:'https://alexgamelab.ru/auth/callback/?code=fixture&state=fixture'};
 const session=storage();if(authenticated)session.setItem('agl.login.client','agl-web');
 const calls=[];
 const context=vm.createContext({window,document:window.document,Node:window.Node,location,history:{replaceState(_a,_b,target){location.pathname='/portal/';location.hash=target.slice(target.indexOf('#'));}},localStorage:storage(),sessionStorage:session,AbortController,Intl,URL,console,setTimeout:()=>1,clearTimeout(){},__renewCalls:0,__fixtureUser:{access_token:'fixture-only-token',expired,expires_in:expired?0:300,state:{route:hash}},fetch:async(url,options)=>{calls.push({url,options});const path=url.replace('https://api.alexgamelab.ru/v1','');const defaults={'/me/access':{owner:false,account_id:'fixture-user',roles:[],permissions:[],projects:[],restrictions:[],...access},'/me':{display_name:'Тест',locale:'ru'},'/games':[]};if(!(path in responses)&&!(path in defaults))throw Error('offline');return {ok:true,status:200,json:async()=>responses[path]??defaults[path]};}});
 vm.runInContext(harness,context);for(let i=0;i<12;i++)await new Promise(setImmediate);
 return {document:window.document,calls,renewals:context.__renewCalls};
}

test('Only pinned issuer and clients are accepted; external cover URLs are excluded',()=>{
 assert.equal(configIsTrusted({issuer:ISSUER,client_id:'agl-web',console_client_id:'agl-console',pkce:'S256'}),true);
 assert.equal(configIsTrusted({issuer:'https://evil.invalid',client_id:'agl-web',console_client_id:'agl-console',pkce:'S256'}),false);
 assert.equal(COVERS['https://evil.invalid/tracker'],undefined);
 assert.equal(route('#unknown').name,'news');assert.equal(route('', '/projects/').name,'projects');
});
test('Published article text never becomes HTML or executable markup',async()=>{
 const text='<img src=x onerror=alert(1)><script>alert(2)</script>';
 const {document}=await render({hash:'#article/fixture',responses:{'/news/fixture':{title:text,excerpt:'Проверка',body:text,author:'Автор',cover:'none',published_at:'2026-11-06T00:00:00Z'}}});
 const main=document.querySelector('#app');assert.match(main.textContent,/<script>/);assert.equal(main.querySelector('script'),null);assert.equal(main.querySelector('img'),null);
});
test('Offline state preserves public navigation and offers retry without fake data',async()=>{
 const {document}=await render();assert.match(document.querySelector('#app').textContent,/готовится к запуску/);assert.match(document.querySelector('#connection').textContent,/Нет связи/);assert.equal(document.querySelector('a[href="#administration"]'),null);
});
test('Developer sees editorial tools but no user or metrics administration',async()=>{
 const {document,calls}=await render({hash:'#articles',authenticated:true,access:{roles:[{slug:'developer',title:'Developer'}],permissions:['articles.create','articles.publish'],projects:[]},responses:{'/workspace/articles?limit=24&offset=0':{items:[]}}});
 assert.match(document.querySelector('#app').textContent,/Есть о чём рассказать/);assert.ok(document.querySelector('a[href="#articles"]'));assert.equal(document.querySelector('a[href="#administration"]'),null);assert.equal(document.querySelector('a[href="#metrics"]'),null);
 const privateCall=calls.find(x=>x.url.includes('/workspace/articles'));assert.equal(privateCall.options.credentials,'omit');assert.equal(privateCall.options.headers.Authorization,'Bearer fixture-only-token');
});
test('Ordinary account page never reports an untested API as available',async()=>{
 const {document}=await render({hash:'#account'});assert.match(document.querySelector('#app').textContent,/Один аккаунт/);assert.doesNotMatch(document.querySelector('#connection').textContent,/Сервис доступен/);
});

test('Project catalog renders API entries with local curated artwork',async()=>{
 const {document}=await render({hash:'#projects',responses:{'/projects?limit=50':{items:[{slug:'rublemet',title:'Рублемёт',summary:'Игра в разработке',cover:'rublemet',status:'development'}]}}});
 assert.equal(document.querySelectorAll('.article-card').length,1);assert.equal(document.querySelector('.article-card').getAttribute('href'),'#project/rublemet');assert.equal(document.querySelector('.article-card img').getAttribute('src'),'/assets/rublemet-cover.webp');
});

test('Concurrent private requests share one refresh when token rotation is enabled',async()=>{
 const {calls,renewals}=await render({hash:'#account',authenticated:true,expired:true});
 assert.equal(renewals,1);
 for(const call of calls.filter(x=>/\/me(?:$|\/access)/.test(x.url)))assert.equal(call.options.headers.Authorization,'Bearer fixture-renewed-token');
});
test('Existing own review opens edit behavior rather than an impossible second creation',async()=>{
 const {document}=await render({hash:'#project/rublemet',authenticated:true,access:{permissions:['reviews.create','reviews.edit']},responses:{
 '/projects/rublemet':{slug:'rublemet',title:'Рублемёт',summary:'В разработке',description:'Описание',cover:'rublemet',status:'development'},
 '/projects/rublemet/reviews':{items:[]},'/workspace/projects/rublemet/review':{id:'fixture-review',rating:4,body:'Мой отзыв',revision:2}
 }});
 assert.match(document.querySelector('#app').textContent,/Изменить мой отзыв/);
});
