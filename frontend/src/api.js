const BASE = '/api'
const KEY_STORAGE = 'presentator_api_key'

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

export const getApiKey = () => localStorage.getItem(KEY_STORAGE)
export const setApiKey = (key) => localStorage.setItem(KEY_STORAGE, key)
export const clearApiKey = () => localStorage.removeItem(KEY_STORAGE)

function authHeaders() {
  const key = getApiKey()
  return key ? { 'X-API-Key': key } : {}
}

function formatDetail(detail) {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).filter(Boolean).join('; ') || 'Проверьте заполнение формы'
  }
  return 'Что-то пошло не так, попробуйте еще раз'
}

async function request(path, { method = 'GET', body, form, raw = false } = {}) {
  const headers = { ...authHeaders() }
  let payload
  if (form) {
    payload = form
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  let response
  try {
    response = await fetch(`${BASE}${path}`, { method, headers, body: payload })
  } catch {
    throw new ApiError('Нет связи с сервером. Проверьте подключение.', 0)
  }
  if (!response.ok) {
    let message = 'Не удалось выполнить запрос'
    try {
      message = formatDetail((await response.json()).detail)
    } catch {
      /* ответ без JSON оставляем с общим сообщением */
    }
    throw new ApiError(message, response.status)
  }
  if (raw) return response.blob()
  return response.status === 204 ? null : response.json()
}

export const api = {
  getMe: () => request('/me'),
  listTasks: () => request('/tasks'),
  getTask: (id) => request(`/tasks/${id}`),
  createTask: (body) => request('/tasks', { method: 'POST', body }),
  rebuildTask: (id, body) => request(`/tasks/${id}/rebuild`, { method: 'POST', body }),
  listTemplates: () => request('/templates'),
  getTemplate: (id) => request(`/templates/${id}`),
  createTemplate: (name, file) => {
    const form = new FormData()
    form.append('name', name)
    form.append('file', file)
    return request('/templates', { method: 'POST', form })
  },
  uploadTemplateVersion: (id, file) => {
    const form = new FormData()
    form.append('file', file)
    return request(`/templates/${id}/versions`, { method: 'POST', form })
  },
  activateTemplateVersion: (id, versionId) =>
    request(`/templates/${id}/versions/${versionId}/activate`, { method: 'POST' }),
  getTemplateVersionPreview: (id, versionId) =>
    request(`/templates/${id}/versions/${versionId}/preview`, { raw: true }),
  deleteTemplate: (id) => request(`/templates/${id}`, { method: 'DELETE' }),
}

export async function downloadResult(taskId, format, title) {
  const response = await fetch(`${BASE}/tasks/${taskId}/result?format=${format}`, {
    headers: authHeaders(),
  })
  if (!response.ok) {
    throw new ApiError('Не удалось скачать файл', response.status)
  }
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = `${title.replace(/[\\/:*?"<>|]/g, '_')}.${format}`
  link.click()
  URL.revokeObjectURL(url)
}
