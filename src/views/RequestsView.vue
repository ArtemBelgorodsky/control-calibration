<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useRequestsStore } from '../stores/requests'
import { apiRequest } from '../services/api'
import VerificationModal from '../components/VerificationModal.vue'

const auth = useAuthStore(), store = useRequestsStore(), route = useRoute()
const show = ref(false), busy = ref(false), error = ref(''), notice = ref(''), selected = ref(null), equipment = ref([])
const form = ref({ equipmentId: '', reason: 'Плановая поверка', preferredDate: '' })
const isCustomer = computed(() => auth.user?.role === 'customer')
const rows = computed(() => isCustomer.value ? store.requests.filter(x => String(x.customerId) === String(auth.user?.id)) : store.requests)
const labels = { new: 'Новая', accepted: 'Принята', in_progress: 'В поверке', completed: 'Завершена', rejected: 'Отклонена' }
async function create() {
  busy.value = true; error.value = ''; notice.value = ''
  try {
    const item = equipment.value.find(x => String(x.id) === String(form.value.equipmentId))
    if (!item) throw new Error('Выберите оборудование из своего реестра.')
    await store.create({ ...form.value, equipmentId: item.id, equipmentName: item.name, inventoryNumber: item.inventoryNumber, customerId: auth.user?.id, customerName: auth.user?.fullName })
    show.value = false; notice.value = 'Заявка отправлена инженеру.'
  } catch (e) { error.value = e.message } finally { busy.value = false }
}
async function accept(item) {
  busy.value = true; error.value = ''; notice.value = ''
  try { await store.updateStatus(item, 'accepted', auth.user?.id); notice.value = 'Заявка принята. Откройте карточку поверки для внесения результатов.' }
  catch (e) { error.value = e.message } finally { busy.value = false }
}
async function openVerification(item) {
  busy.value = true; error.value = ''
  try {
    if (isCustomer.value && String(item.customerId) !== String(auth.user?.id)) throw new Error('Можно просматривать поверки только своих заявок.')
    const data = await apiRequest(`calibrations?requestId=${item.id}`)
    const calibration = data.find(x => String(x.requestId) === String(item.id))
    if (!calibration) throw new Error('Карточка пока недоступна. Она появится после принятия заявки инженером.')
    selected.value = calibration
  } catch (e) { error.value = e.message } finally { busy.value = false }
}
async function saved() { selected.value = null; notice.value = 'Сведения о поверке сохранены.'; await store.load().catch(e => error.value = e.message) }
onMounted(async () => {
  try {
    await store.load()
    if (isCustomer.value) {
      const data = await apiRequest('equipment')
      equipment.value = data.filter(x => String(x.ownerId) === String(auth.user?.id))
      const item = equipment.value.find(x => String(x.id) === String(route.query.equipmentId)) || equipment.value.find(x => x.inventoryNumber === route.query.inventoryNumber)
      if (item) { form.value.equipmentId = item.id; form.value.preferredDate = route.query.preferredDate || ''; show.value = true }
    }
  } catch (e) { error.value = e.message }
})
</script>

<template>
  <section class="page">
    <div class="section-heading"><div><h2>{{ isCustomer ? 'Мои заявки' : 'Заявки на поверку' }}</h2><p>{{ isCustomer ? 'Создавайте заявки и отслеживайте их выполнение.' : 'Принимайте заявки и заполняйте карточку поверки оборудования.' }}</p></div><button v-if="isCustomer" class="btn-primary" @click="show = true">＋ Создать заявку</button></div>
    <p v-if="error" class="auth-error" role="alert">{{ error }}</p><p v-if="notice" class="insight" role="status">{{ notice }}</p>
    <div class="table-panel"><table class="data-table"><thead><tr><th>№</th><th>ОБОРУДОВАНИЕ</th><th>ЗАКАЗЧИК</th><th>ЖЕЛАЕМАЯ ДАТА</th><th>СТАТУС</th><th>ДЕЙСТВИЕ</th></tr></thead><tbody>
      <tr v-for="item in rows" :key="item.id"><td>#{{ item.id }}</td><td>{{ item.equipmentName }}<small class="muted" style="display:block;font-weight:400;margin-top:3px">{{ item.inventoryNumber }} · {{ item.reason }}</small></td><td>{{ item.customerName || '—' }}</td><td>{{ item.preferredDate ? new Date(item.preferredDate).toLocaleDateString('ru-RU') : 'Не указана' }}</td><td><span :class="['status',item.status === 'new' ? 'due' : 'active']">{{ labels[item.status] }}</span></td><td><template v-if="isCustomer"><button v-if="['accepted','in_progress','completed'].includes(item.status)" :disabled="busy" class="btn-outline" @click="openVerification(item)">Просмотреть поверку</button><span v-else class="muted">Ожидает принятия</span></template><template v-else><button v-if="item.status === 'new'" :disabled="busy" class="btn-primary" @click="accept(item)">Принять</button><button v-else-if="['accepted','in_progress','completed'].includes(item.status) && String(item.engineerId) === String(auth.user?.id)" :disabled="busy" class="btn-outline" @click="openVerification(item)">{{ item.status === 'completed' ? 'Результаты поверки' : 'Карточка поверки' }}</button><span v-else class="muted">{{ item.engineerId ? 'У другого инженера' : '—' }}</span></template></td></tr>
      <tr v-if="!rows.length"><td colspan="6" class="empty">{{ store.loading ? 'Загрузка заявок…' : 'Заявок пока нет' }}</td></tr>
    </tbody></table></div>
    <div v-if="show" class="modal-backdrop" @click.self="!busy && (show = false)"><form class="modal" @submit.prevent="create"><h2>Новая заявка на поверку</h2><div class="form-grid"><label class="field full">Оборудование<select v-model="form.equipmentId" required><option value="" disabled>Выберите свой прибор</option><option v-for="item in equipment" :key="item.id" :value="item.id">{{ item.name }} · {{ item.inventoryNumber }}</option></select></label><label class="field">Желаемая дата<input v-model="form.preferredDate" type="date"></label><label class="field full">Причина / комментарий<input v-model.trim="form.reason" required></label></div><p v-if="!equipment.length" class="insight">Сначала добавьте прибор в разделе «Моё оборудование».</p><p v-if="error" class="auth-error">{{ error }}</p><div class="modal-actions"><button type="button" class="btn-outline" :disabled="busy" @click="show = false">Отмена</button><button class="btn-primary" :disabled="busy || !equipment.length">{{ busy ? 'Отправка…' : 'Отправить заявку' }}</button></div></form></div>
    <VerificationModal v-if="selected" :calibration="selected" :read-only="isCustomer" @close="selected = null" @saved="saved"/>
  </section>
</template>
