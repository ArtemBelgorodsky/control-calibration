import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { apiRequest } from '../services/api'

export const useRequestsStore = defineStore('requests', () => {
  const requests = ref([]), loading = ref(false)
  const active = computed(() => requests.value.filter(x => !['completed', 'rejected'].includes(x.status)))
  async function load() {
    loading.value = true
    try { requests.value = await apiRequest('requests') } finally { loading.value = false }
  }
  async function create(payload) {
    if (!payload.equipmentId) throw new Error('Выберите оборудование из своего реестра.')
    const created = await apiRequest('requests', { method: 'POST', body: JSON.stringify({ ...payload, status: 'new', createdAt: new Date().toISOString() }) })
    requests.value.unshift(created)
  }
  async function updateStatus(item, status, engineerId) {
    if (status !== 'accepted') throw new Error('Изменяйте результат через карточку поверки.')
    const current = await apiRequest(`requests/${item.id}`)
    if (current.engineerId && String(current.engineerId) !== String(engineerId)) throw new Error('Заявка уже принята другим инженером.')
    let equipmentId = current.equipmentId
    if (!equipmentId) {
      const equipment = await apiRequest('equipment')
      const matches = equipment.filter(x => x.inventoryNumber === current.inventoryNumber && String(x.ownerId) === String(current.customerId))
      if (matches.length !== 1) throw new Error('Не удалось однозначно найти оборудование заказчика. У заявки должен быть equipmentId.')
      equipmentId = matches[0].id
    }
    const existing = await apiRequest(`calibrations?requestId=${item.id}`)
    let calibration = existing.find(x => String(x.requestId) === String(item.id))
    if (!calibration) calibration = await apiRequest('calibrations', { method: 'POST', body: JSON.stringify({ requestId: item.id, equipmentId, equipmentName: current.equipmentName, inventoryNumber: current.inventoryNumber, customerId: current.customerId, engineerId, scheduledAt: current.preferredDate || new Date().toISOString().slice(0, 10), status: 'planned', provider: '', certificateNumber: '' }) })
    const updated = await apiRequest(`requests/${item.id}`, { method: 'PATCH', body: JSON.stringify({ status, engineerId, equipmentId, calibrationId: calibration.id }) })
    Object.assign(item, updated)
  }
  return { requests, loading, active, load, create, updateStatus }
})
