<script setup lang="ts">
import { ref, watch } from "vue";
import Modal from "./Modal.vue";
const props = withDefaults(defineProps<{open:boolean; title:string; target:string; revision:number; description:string; restore?:boolean; busy?:boolean; typed?:boolean}>(), {typed:true});
const emit=defineEmits<{"update:open":[value:boolean]; confirm:[body:{confirmation:string; expected_revision:number; reason:string}]}>();
const confirmation=ref(""), reason=ref("");
watch(()=>[props.open,props.target],()=>{confirmation.value="";reason.value=""});
function submit(){if(!props.busy&&reason.value.trim().length>=3&&(!props.typed||confirmation.value===props.target))emit("confirm",{confirmation:props.target,expected_revision:props.revision,reason:reason.value.trim()});}
</script>
<template><Modal :open="open" :title="title" :busy="busy" @update:open="emit('update:open',$event)"><form class="form-stack" @submit.prevent="submit"><p>{{description}}</p><label v-if="typed">Для подтверждения введи <strong class="mono break-word">{{target}}</strong><input v-model="confirmation" autocomplete="off" spellcheck="false" required :aria-label="'Подтверждение: '+target"/></label><label>Причина<textarea v-model="reason" required minlength="3" maxlength="500" rows="2"/></label><p class="field-note">Действие обратимо и попадёт в журнал. Повторный ввод пароля не нужен.</p><div class="button-row"><button class="button" :class="{'danger':!restore}" :disabled="busy||reason.trim().length<3||(typed&&confirmation!==target)">{{busy?'Выполняем…':restore?'Восстановить':'В корзину'}}</button><button type="button" class="button secondary" :disabled="busy" @click="emit('update:open',false)">Отмена</button></div></form></Modal></template>
