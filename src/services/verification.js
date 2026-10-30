import { apiRequest } from './api.js'

export async function saveVerification(calibration, values, complete) {
  const performedAt = values.performedAt
  if (complete && (!performedAt || !values.verifierName.trim() || !values.provider.trim() || !values.certificateNumber.trim())) throw new Error('Заполните дату, поверителя, организацию и номер документа.')
  if (complete && values.result === 'fit' && (!values.nextCalibrationAt || values.nextCalibrationAt <= performedAt)) throw new Error('Дата следующей поверки должна быть позже даты проведения.')
  if (complete && performedAt > new Date().toISOString().slice(0, 10)) throw new Error('Дата проведения не может быть в будущем.')
  if (complete && values.result === 'unfit' && !values.notes.trim()) throw new Error('Укажите причину непригодности оборудования.')
  const now = new Date().toISOString()
  const payload = { ...values, status: complete ? 'completed' : 'in_progress', updatedAt: now }
  // Последовательные записи можно повторить при сетевой ошибке: дубликаты документов не создаются.
  if (complete) {
    const equipment = await apiRequest(`equipment/${calibration.equipmentId}`)
    const equipmentUpdate = { lastCalibrationAt: performedAt, nextCalibrationAt: values.result === 'fit' ? values.nextCalibrationAt : null, verificationResult: values.result, status: values.result === 'fit' ? 'active' : 'unfit', certificateNumber: values.certificateNumber, certificateUrl: values.certificateUrl, verifierName: values.verifierName, provider: values.provider, updatedAt: now }
    await apiRequest(`equipment/${equipment.id}`, { method: 'PATCH', body: JSON.stringify(equipmentUpdate) })
    if (calibration.requestId) await apiRequest(`requests/${calibration.requestId}`, { method: 'PATCH', body: JSON.stringify({ status: 'completed', completedAt: now, result: values.result, calibrationId: calibration.id }) })
    payload.completedAt = now
  } else if (calibration.requestId) {
    await apiRequest(`requests/${calibration.requestId}`, { method: 'PATCH', body: JSON.stringify({ status: 'in_progress' }) })
  }
  return apiRequest(`calibrations/${calibration.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
}
