<script setup>
import { computed, onMounted, ref } from 'vue'
import { useCalibrationStore } from '../stores/calibration'
import { useAuthStore } from '../stores/auth'
import { downloadCsv } from '../services/download'
import VerificationModal from '../components/VerificationModal.vue'
const store = useCalibrationStore(), auth = useAuthStore(), filter = ref('all'), selected = ref(null), notice = ref('')
const rows = computed(() => store.calibrations.filter(x => String(x.engineerId) === String(auth.user?.id) && (filter.value === 'all' || x.status === filter.value)))
const labels = { planned:'Принята в работу', in_progress:'В поверке', completed:'Поверка завершена' }
function exportList() { downloadCsv('engineer-calibrations.csv', [{key:'scheduledAt',label:'Дата'},{key:'equipmentName',label:'Оборудование'},{key:'provider',label:'Организация'},{key:'status',label:'Статус'},{key:'nextCalibrationAt',label:'Следующая поверка'},{key:'certificateNumber',label:'Свидетельство'}], rows.value) }
async function saved() { selected.value = null; notice.value = 'Сведения о поверке сохранены.'; await store.loadRemote() }
onMounted(store.loadRemote)
</script>
<template><section class="page"><div class="section-heading"><div><h2>Мои поверки</h2><p>Принятые заявки, текущие работы и результаты завершённых поверок.</p></div><button class="btn-outline" @click="exportList">⇩ Экспорт</button></div><p v-if="store.loadError" class="auth-error">{{ store.loadError }}</p><p v-if="notice" class="insight" role="status">{{ notice }}</p><div class="toolbar"><select v-model="filter" class="select"><option value="all">Все поверки</option><option value="planned">Принятые в работу</option><option value="in_progress">В поверке</option><option value="completed">Завершённые</option></select></div><div class="table-panel"><table class="data-table"><thead><tr><th>ДАТА</th><th>ОБОРУДОВАНИЕ</th><th>ОРГАНИЗАЦИЯ</th><th>СВИДЕТЕЛЬСТВО</th><th>СТАТУС</th><th>ДЕЙСТВИЕ</th></tr></thead><tbody><tr v-for="x in rows" :key="x.id"><td>{{ x.performedAt || x.scheduledAt || '—' }}</td><td>{{ x.equipmentName }}</td><td>{{ x.provider || '—' }}</td><td>{{ x.certificateNumber || '—' }}</td><td><span class="status active">{{ labels[x.status] || x.status }}</span></td><td><button class="btn-outline" @click="selected = x">{{ x.status === 'completed' ? 'Результаты' : 'Карточка поверки' }}</button></td></tr><tr v-if="!rows.length"><td colspan="6" class="empty">{{ store.isLoading ? 'Загрузка…' : 'Нет поверок, созданных из ваших заявок' }}</td></tr></tbody></table></div><VerificationModal v-if="selected" :calibration="selected" @close="selected = null" @saved="saved"/></section></template>
