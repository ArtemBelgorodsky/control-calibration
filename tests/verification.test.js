import test from 'node:test'
import assert from 'node:assert/strict'
import { saveVerification } from '../src/services/verification.js'

const calibration = { id: 10, requestId: 20, equipmentId: 30 }
const values = { performedAt: '2026-01-01', nextCalibrationAt: '2027-01-01', verifierName: 'Иван Иванов', provider: 'Метрологическая служба', certificateNumber: 'СВ-001', certificateUrl: '', result: 'fit', notes: '' }
function mockApi() {
  const calls = []
  globalThis.localStorage = { getItem: () => '{}' }
  globalThis.fetch = async (url, options) => {
    calls.push({ url, method: options.method || 'GET', body: options.body && JSON.parse(options.body) })
    return { ok: true, status: 200, json: async () => options.method ? { id: 10, ...JSON.parse(options.body) } : { id: 30 } }
  }
  return calls
}
test('Черновик сохраняет поверку в работе, не меняя срок оборудования', async () => {
  const calls = mockApi()
  await saveVerification(calibration, values, false)
  assert.equal(calls.length, 2)
  assert.ok(calls.every(x => !x.url.includes('/equipment/')))
  assert.equal(calls[1].body.status, 'in_progress')
})
test('Завершение обновляет прибор, закрывает заявку и сохраняет результат поверки', async () => {
  const calls = mockApi()
  const saved = await saveVerification(calibration, values, true)
  assert.equal(calls[1].body.nextCalibrationAt, '2027-01-01')
  assert.equal(calls[1].body.certificateNumber, 'СВ-001')
  assert.equal(calls[2].body.status, 'completed')
  assert.equal(saved.status, 'completed')
})
test('Неверная дата следующей поверки блокирует запросы', async () => {
  const calls = mockApi()
  await assert.rejects(saveVerification(calibration, { ...values, nextCalibrationAt: '2025-01-01' }, true), /позже/)
  assert.equal(calls.length, 0)
})
test('Непригодность снимает следующий срок и сохраняет причину', async () => {
  const calls = mockApi()
  await saveVerification(calibration, { ...values, result: 'unfit', nextCalibrationAt: null, notes: 'Погрешность превышает допустимую' }, true)
  assert.equal(calls[1].body.status, 'unfit')
  assert.equal(calls[1].body.nextCalibrationAt, null)
})
test('Ошибка обновления прибора не закрывает заявку и поверку', async () => {
  const calls = mockApi()
  const fetchMock = globalThis.fetch
  globalThis.fetch = (url, options) => options.method === 'PATCH' && url.includes('/equipment/') ? Promise.reject(new Error('Сеть недоступна')) : fetchMock(url, options)
  await assert.rejects(saveVerification(calibration, values, true), /Сеть недоступна/)
  assert.equal(calls.length, 1)
})
