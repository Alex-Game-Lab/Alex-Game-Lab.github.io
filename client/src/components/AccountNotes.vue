<script setup lang="ts">
import {ref,watch} from "vue";
import {api} from "../lib/api";
import {resource} from "../lib/resource";
import {date} from "../lib/content";
import {errorMessage} from "../lib/errors";
import {readDraft,saveDraft,removeDraft} from "../lib/drafts";
import {notify} from "../stores/notices";
import type {AccountNote,Page} from "../lib/types";
import Icon from "./Icon.vue";
import LoadState from "./LoadState.vue";
import Pagination from "./Pagination.vue";
import TrashDialog from "./TrashDialog.vue";
const props=defineProps<{accountId:string;canCreate:boolean}>();
const state=ref('active'),offset=ref(0),body=ref(''),editing=ref<string|null>(null),expected=ref(1),busy=ref(false),saveError=ref(''),removing=ref<AccountNote|null>(null);
const path='/staff/users/'+props.accountId+'/notes', key='account-note:'+props.accountId;
const {data,loading,error,reload}=resource(()=>api<Page<AccountNote>>(path+'?state='+state.value+'&offset='+offset.value,{private:true}),[state,offset]);
watch(state,()=>offset.value=0);
const draft=readDraft<{body:string;editing:string|null;expected:number}>(key);
if(draft){body.value=draft.body;editing.value=draft.editing;expected.value=draft.expected;}
watch([body,editing,expected],()=>{if(body.value.trim())saveDraft(key,{body:body.value,editing:editing.value,expected:expected.value});else removeDraft(key)});
function edit(note:AccountNote){editing.value=note.id;body.value=note.body;expected.value=note.revision;saveError.value='';}
function cancel(){editing.value=null;body.value='';saveError.value='';removeDraft(key);}
async function save(){busy.value=true;saveError.value='';try{await api(path+(editing.value?'/'+editing.value:''),{private:true,method:editing.value?'PUT':'POST',body:{body:body.value,...(editing.value?{expected_revision:expected.value}:{})}});cancel();notify('Заметка сохранена');await reload();}catch(e){saveError.value=errorMessage(e);}finally{busy.value=false;}}
async function trash(payload:{confirmation:string;expected_revision:number;reason:string}){if(!removing.value)return;busy.value=true;try{const restore=!!removing.value.deleted_at;await api(path+'/'+removing.value.id+(restore?'/restore':''),{private:true,method:restore?'POST':'DELETE',body:payload});if(editing.value===removing.value.id)cancel();removing.value=null;notify(restore?'Заметка восстановлена':'Заметка в корзине');await reload();}catch(e){notify(errorMessage(e),true)}finally{busy.value=false;}}
</script>
<template><section class="account-notes"><p class="notice"><Icon name="lock" :size="17"/>Заметки видны только их автору, Admin и Owner. Владелец аккаунта не видит чужую заметку о себе. Право просмотра не даёт права редактировать или удалять.</p><form v-if="canCreate||editing" class="form-stack inset-form" @submit.prevent="save"><h3>{{editing?'Редактирование заметки':'Новая закрытая заметка'}}</h3><label>Текст заметки<textarea v-model="body" required maxlength="6000" rows="5" placeholder="Контекст обращения или договорённости. Не добавляй пароли и лишние личные данные."/></label><p v-if="saveError" role="alert" class="notice danger-text">{{saveError}} Текст оставлен в редакторе.</p><div class="button-row"><button class="button" :disabled="busy||!body.trim()">{{busy?'Сохраняем…':'Сохранить заметку'}}</button><button v-if="editing||body" type="button" class="button secondary" :disabled="busy" @click="cancel">Отменить правку</button><span class="field-note">{{body.length}} / 6000 · сохраняется после нажатия</span></div></form><div class="filter-tabs"><button :class="{active:state==='active'}" @click="state='active'">Заметки</button><button :class="{active:state==='deleted'}" @click="state='deleted'">Корзина заметок</button></div><LoadState :loading="loading" :error="error" @retry="reload"><article v-for="note in data?.items" :key="note.id" class="account-note"><header><div><strong>{{note.author}}</strong><p class="small muted">{{date(note.created_at)}} · версия {{note.revision}}<span v-if="note.updated_at!==note.created_at"> · изменена {{date(note.updated_at)}}</span></p></div><div class="row-actions"><button v-if="note.editable&&!note.deleted_at" class="icon-button" :disabled="busy" aria-label="Редактировать заметку" @click="edit(note)"><Icon name="edit"/></button><button v-if="note.deletable" class="icon-button" :disabled="busy" :aria-label="note.deleted_at?'Восстановить заметку':'Удалить заметку'" @click="removing=note"><Icon :name="note.deleted_at?'undo':'delete'"/></button></div></header><p class="note-body">{{note.body}}</p></article><p v-if="!data?.items.length" class="quiet-state">{{state==='deleted'?'Нет доступных тебе удалённых заметок.':'Нет доступных тебе заметок.'}}</p><Pagination :offset="offset" :limit="24" :count="data?.items.length||0" @change="offset=$event"/></LoadState><TrashDialog :open="!!removing" :title="removing?.deleted_at?'Восстановить заметку?':'Удалить заметку?'" :target="removing?.id||''" :revision="removing?.revision||1" :restore="!!removing?.deleted_at" :typed="false" :busy="busy" :description="removing?.deleted_at?'Заметка снова появится у её автора, Admin и Owner.':'Заметка будет перемещена в корзину. Её можно восстановить с правом удаления.'" @update:open="!$event&&(removing=null)" @confirm="trash"/></section></template>
