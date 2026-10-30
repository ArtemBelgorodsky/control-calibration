<script setup>
import { computed, ref } from 'vue'
import { useCalibrationStore } from '../stores/calibration'
import VerificationModal from './VerificationModal.vue'

const props = defineProps({ mode: { type: String, required: true } })
const emit = defineEmits(['close'])
const store = useCalibrationStore(), search = ref(''), selected = ref(null)
const isEquipment = computed(() => props.mode === 'equipment')
const labels = { active: 'Действующая', due: 'Скоро поверка', overdue: 'Просрочена', unfit: 'Непригоден', planned: 'Принята в работу', in_progress: 'В поверке', completed: 'Завершена' }
const rows = computed(() => (isEquipment.value ? store.equipment : store.calibrations).filter(item => [item.name, item.equipmentName, item.inventoryNumber, item.ownerName, item.provider, item.certificateNumber].filter(Boolean).join(' ').toLowerCase().includes(search.value.trim().toLowerCase())))
function date(value) { return value ? new Date(value).toLocaleDateString('ru-RU') : '—' }
</script>

<template>
  <div v-if="!selected" class="modal-backdrop" @click.self="emit('close')">
    <section class="modal registry-modal" role="dialog" aria-modal="true" aria-labelledby="registry-title">
      <div class="section-heading"><div><h2 id="registry-title">{{ isEquipment ? 'Реестр оборудования' : 'Реестр поверок' }}</h2><p>Просмотр данных предприятия · {{ rows.length }} записей</p></div><button class="btn-outline" aria-label="Закрыть" @click="emit('close')">✕</button></div>
      <input v-model="search" class="search" placeholder="Поиск по оборудованию, номеру или организации" aria-label="Поиск в реестре">
      <div class="table-panel" style="margin-top:16px;overflow:auto"><table class="data-table"><thead><tr><th>ОБОРУДОВАНИЕ</th><th>{{ isEquipment ? 'ВЛАДЕЛЕЦ' : 'ОРГАНИЗАЦИЯ' }}</th><th>{{ isEquipment ? 'СЛЕДУЮЩАЯ ПОВЕРКА' : 'ДАТА' }}</th><th>СТАТУС</th><th v-if="!isEquipment">ПРОСМОТР</th></tr></thead><tbody>
        <tr v-for="item in rows" :key="item.id"><td>{{ item.name || item.equipmentName }}<small class="muted" style="display:block">{{ item.inventoryNumber || '—' }}</small></td><td>{{ (isEquipment ? item.ownerName : item.provider) || '—' }}</td><td>{{ date(isEquipment ? item.nextCalibrationAt : item.performedAt || item.scheduledAt) }}</td><td><span :class="['status', ['overdue','unfit'].includes(item.status) ? 'overdue' : item.status === 'due' ? 'due' : 'active']">{{ labels[item.status] || item.status }}</span></td><td v-if="!isEquipment"><button class="btn-outline" @click="selected = item">Карточка поверки</button></td></tr>
        <tr v-if="!rows.length"><td :colspan="isEquipment ? 4 : 5" class="empty">{{ store.isLoading ? 'Загрузка…' : 'Записи не найдены' }}</td></tr>
      </tbody></table></div>
      <div class="modal-actions"><button class="btn-outline" @click="emit('close')">Закрыть</button></div>
    </section>
  </div>
  <VerificationModal v-else :calibration="selected" read-only @close="selected = null"/>
</template>

<style scoped>
.registry-modal{width:min(1060px,calc(100% - 32px));max-height:90vh;overflow:auto}.section-heading h2{margin:0}.section-heading{gap:16px}.search{width:100%}
</style>
