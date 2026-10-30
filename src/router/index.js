import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
const router = createRouter({ history: createWebHistory(import.meta.env.BASE_URL), routes: [
  { path: '/login', component: () => import('../views/AuthView.vue'), meta: { guest: true, title: 'Вход в систему' } },
  { path: '/', component: () => import('../views/HomeView.vue'), meta: { requiresAuth: true, title: 'Панель управления' } },
  { path: '/equipment', component: () => import('../views/EquipmentView.vue'), meta: { requiresAuth: true, roles: ['customer'], title: 'Моё оборудование' } },
  { path: '/calibrations', component: () => import('../views/CalibrationsView.vue'), meta: { requiresAuth: true, roles: ['engineer'], title: 'Поверки в работе' } },
  { path: '/requests', component: () => import('../views/RequestsView.vue'), meta: { requiresAuth: true, roles: ['customer','engineer'], title: 'Заявки на поверку' } },
  { path: '/engineers', component: () => import('../views/EngineersView.vue'), meta: { requiresAuth: true, roles: ['admin'], title: 'Инженеры-лаборанты' } },
] })
router.beforeEach((to) => { const auth = useAuthStore(); if (to.meta.requiresAuth && !auth.isAuthenticated) return { path: '/login', query: { redirect: to.fullPath } }; if (to.meta.guest && auth.isAuthenticated) return '/'; if (to.meta.roles && !to.meta.roles.includes(auth.user?.role)) return '/' })
export default router
