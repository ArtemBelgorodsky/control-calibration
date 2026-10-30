<script setup>
import { computed, onMounted, ref } from 'vue'
import { apiRequest } from '../services/api'
import { saveVerification } from '../services/verification'
import { useAuthStore } from '../stores/auth'

const props = defineProps({ calibration: { type: Object, required: true }, readOnly: { type: Boolean, default: false } })
const emit = defineEmits(['close', 'saved'])
const auth = useAuthStore(), equipment = ref(null), error = ref(''), busy = ref(false), loading = ref(true)
const readonly = computed(() => props.readOnly || auth.user?.role !== 'engineer' || String(props.calibration.engineerId) !== String(auth.user?.id) || props.calibration.status === 'completed')
const form = ref({ performedAt: props.calibration.performedAt || (readonly.value ? '' : new Date().toISOString().slice(0, 10)), nextCalibrationAt: props.calibration.nextCalibrationAt || '', verifierName: props.calibration.verifierName || (readonly.value ? '' : auth.user?.fullName || ''), provider: props.calibration.provider || '', certificateNumber: props.calibration.certificateNumber || '', certificateUrl: props.calibration.certificateUrl || '', result: props.calibration.result || (readonly.value ? '' : 'fit'), method: props.calibration.method || '', registryNumber: props.calibration.registryNumber || '', notes: props.calibration.notes || '' })
const documentUrl = computed(() => { try { const url = new URL(form.value.certificateUrl); return ['https:', 'http:'].includes(url.protocol) ? url.href : '' } catch { return '' } })
onMounted(async () => {
  try {
    if (!props.calibration.equipmentId) throw new Error('В поверке не указано оборудование (equipmentId).')
    equipment.value = await apiRequest(`equipment/${props.calibration.equipmentId}`)
  } catch (e) { error.value = e.message } finally { loading.value = false }
})
async function save(complete) {
  if (readonly.value) return
  busy.value = true; error.value = ''
  try { const saved = await saveVerification(props.calibration, { ...form.value, nextCalibrationAt: form.value.result === 'fit' ? form.value.nextCalibrationAt : null }, complete); emit('saved', saved) }
  catch (e) { error.value = `Не удалось сохранить: ${e.message}. Проверьте данные и повторите сохранение.` }
  finally { busy.value = false }
}
</script>

<template>
  <div class="modal-backdrop" @click.self="!busy && emit('close')">
    <section class="modal verification-modal" role="dialog" aria-modal="true" aria-labelledby="verification-title">
      <div class="section-heading"><h2 id="verification-title">{{ readonly ? 'Карточка поверки · просмотр' : 'Проведение поверки' }}</h2><button type="button" class="btn-outline" :disabled="busy" aria-label="Закрыть" @click="emit('close')">✕</button></div>
      <p v-if="readonly" class="panel-subtitle" style="margin-bottom:16px">Только просмотр. Незаполненные сведения появятся после сохранения инженером.</p>
      <p v-if="loading" class="empty">Загрузка оборудования…</p>
      <template v-else>
        <div class="insight" style="margin-bottom:18px"><b>{{ equipment?.name || calibration.equipmentName }}</b><div>Инвентарный №: {{ equipment?.inventoryNumber || calibration.inventoryNumber || '—' }} · Заводской №: {{ equipment?.serialNumber || '—' }}</div><div>{{ equipment?.manufacturer }} {{ equipment?.model }} · {{ equipment?.department || 'Подразделение не указано' }}</div><div>Предыдущая поверка: {{ equipment?.lastCalibrationAt || '—' }}</div></div>
        <form @submit.prevent="save(true)">
          <fieldset :disabled="busy || readonly || !equipment" class="verification-fields">
            <div class="form-grid">
              <label class="field">Дата проведения *<input v-model="form.performedAt" type="date" required></label>
              <label class="field">Результат *<select v-model="form.result"><option v-if="!form.result" value="">Пока не указан</option><option value="fit">Годен к применению</option><option value="unfit">Непригоден к применению</option></select></label>
              <label class="field">Поверитель, ФИО *<input v-model.trim="form.verifierName" required maxlength="150"></label>
              <label class="field">Поверочная организация *<input v-model.trim="form.provider" required maxlength="200" placeholder="Название организации"></label>
              <label class="field">{{ form.result === 'fit' ? 'Номер свидетельства *' : 'Номер извещения о непригодности *' }}<input v-model.trim="form.certificateNumber" required maxlength="100"></label>
              <label v-if="form.result !== 'unfit'" class="field">Следующая поверка *<input v-model="form.nextCalibrationAt" type="date" :min="form.performedAt" required></label>
              <label class="field full">Ссылка на свидетельство / документ<input v-model.trim="form.certificateUrl" type="url" placeholder="https://…"></label>
              <label class="field">Методика поверки<input v-model.trim="form.method" maxlength="200" placeholder="Обозначение методики"></label>
              <label class="field">Номер записи ФГИС «Аршин»<input v-model.trim="form.registryNumber" maxlength="150"></label>
              <label class="field full">{{ form.result === 'unfit' ? 'Причина непригодности *' : 'Заключение и примечания' }}<textarea v-model.trim="form.notes" :required="form.result === 'unfit'" rows="3" maxlength="3000"/></label>
            </div>
          </fieldset>
          <a v-if="documentUrl" :href="documentUrl" target="_blank" rel="noopener noreferrer" class="link" style="display:inline-block;margin-top:14px">Открыть документ поверки ↗</a>
          <p v-if="error" role="alert" class="auth-error">{{ error }}</p>
          <div class="modal-actions"><button type="button" class="btn-outline" :disabled="busy" @click="emit('close')">Закрыть</button><template v-if="!readonly && equipment"><button type="button" class="btn-outline" :disabled="busy" @click="save(false)">Сохранить в работе</button><button class="btn-primary" :disabled="busy">{{ busy ? 'Сохранение…' : 'Завершить поверку' }}</button></template></div>
        </form>
      </template>
    </section>
  </div>
</template>

<style scoped>
.verification-modal{width:min(760px,calc(100% - 30px));max-height:90vh;overflow:auto}.verification-fields{border:0;padding:0;margin:0;min-width:0}.field textarea{font:inherit;border:1px solid #dde4ee;border-radius:8px;padding:10px;color:#34425c;resize:vertical}.verification-modal .section-heading h2{margin:0}.modal-actions{flex-wrap:wrap}fieldset:disabled{opacity:.85}
</style>
