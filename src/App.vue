<script setup>
import { computed, onMounted } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useCalibrationStore } from './stores/calibration'
import { useAuthStore } from './stores/auth'
const route = useRoute(); const store = useCalibrationStore(); const auth = useAuthStore()
const pageTitle = computed(() => route.meta.title || 'Панель управления')
const nav = computed(() => { const role = auth.user?.role; if(role==='admin')return[{to:'/',icon:'▦',label:'Дашборд'},{to:'/engineers',icon:'♙',label:'Инженеры-лаборанты'}]; if(role==='engineer')return[{to:'/',icon:'▦',label:'Главная'},{to:'/requests',icon:'▤',label:'Заявки на поверку'},{to:'/calibrations',icon:'◷',label:'Поверки в работе'}]; return[{to:'/',icon:'▦',label:'Главная'},{to:'/equipment',icon:'◫',label:'Моё оборудование'},{to:'/requests',icon:'▤',label:'Мои заявки'}] })
onMounted(()=>auth.refreshUser())
</script>
<template><RouterView v-if="route.path === '/login'"/><div v-else class="app-shell"><aside class="sidebar"><RouterLink class="brand" to="/"><span class="brand-mark">◈</span><span>Поверка<span class="brand-dot">.pro</span></span></RouterLink><p class="workspace-label">РАБОЧЕЕ ПРОСТРАНСТВО</p><nav><RouterLink v-for="item in nav" :key="item.to" :to="item.to" class="nav-link"><span class="nav-icon">{{ item.icon }}</span>{{ item.label }}</RouterLink></nav><div class="sidebar-bottom"><div class="help-card"><span>?</span><div><b>Нужна помощь?</b><small>Центр поддержки</small></div></div><button class="user-card logout" @click="auth.logout();$router.push('/login')"><div class="avatar">{{(auth.user?.fullName||'П').slice(0,2).toUpperCase()}}</div><div><b>{{auth.user?.fullName||'Пользователь'}}</b><small>{{auth.user?.role==='admin'?'Администратор':auth.user?.role==='engineer'?'Инженер-лаборант':auth.user?.role==='customer'?'Заказчик':'Роль не назначена'}}</small></div><span class="more">→</span></button></div></aside><main class="main-area"><header class="topbar"><div><p class="crumb">ИНФОРМАЦИОННАЯ СИСТЕМА</p><h1>{{ pageTitle }}</h1></div><div class="top-actions"><div class="date-pill">{{ store.todayLabel }}</div></div></header><RouterView /></main></div></template>
