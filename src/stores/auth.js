import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { apiRequest } from '../services/api'

const SESSION_KEY = 'calibration-session'
export const useAuthStore = defineStore('auth', () => {
  const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
  const user = ref(saved?.user || null)
  const token = ref(saved?.token || '')
  const isAuthenticated = computed(() => Boolean(token.value || user.value))
  function persist() { localStorage.setItem(SESSION_KEY, JSON.stringify({ user: user.value, token: token.value })) }
  async function findProfile(email) { const data = await apiRequest(`users?email=${encodeURIComponent(email)}`); const users = Array.isArray(data) ? data : data.items || data.data || []; return users.find(item => item.email?.toLowerCase() === email?.toLowerCase()) || null }
  async function signIn(credentials) { const result = await apiRequest('auth', { method: 'POST', body: JSON.stringify(credentials) }); token.value = result.token || result.accessToken || ''; const responseUser = result.user || result; const profile = responseUser.role ? null : await findProfile(credentials.email).catch(() => null); user.value = { ...responseUser, ...profile, id: profile?.id || responseUser.id, fullName: profile?.fullName || responseUser.fullName || credentials.email, email: profile?.email || responseUser.email || credentials.email, role: profile?.role || responseUser.role || null }; persist(); return result }
  async function register(payload) { const result = await apiRequest('register', { method: 'POST', body: JSON.stringify(payload) }); token.value = result.token || result.accessToken || ''; const responseUser = result.user || result; const profile = responseUser.role ? null : await findProfile(payload.email).catch(() => null); user.value = { ...responseUser, ...profile, id: profile?.id || responseUser.id, fullName: profile?.fullName || responseUser.fullName || payload.fullName, email: profile?.email || responseUser.email || payload.email, role: profile?.role || responseUser.role || payload.role }; persist(); return result }
  async function refreshUser() { if (!user.value?.email) return; const profile = await findProfile(user.value.email).catch(() => null); if (profile) { user.value = { ...user.value, ...profile, role: profile.role || user.value.role }; persist() } }
  function logout() { user.value = null; token.value = ''; localStorage.removeItem(SESSION_KEY) }
  return { user, token, isAuthenticated, signIn, register, refreshUser, logout }
})
