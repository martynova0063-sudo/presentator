const API_BASE = '/api'
const KEY_STORAGE = 'presentator_api_key'

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

export const apiKeyStorage = {
  get: () => localStorage.getItem(KEY_STORAGE),
  set: (key) => localStorage.setItem(KEY_STORAGE, key),
  clear: () => localStorage.removeItem(KEY_STORAGE),
}

function detailMessage(detail, fallback) {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((item) => item.msg).filter(Boolean).join('; ') || fallback
  }
  return fallback
}

async function request(path, { method = 'GET', json, form, apiKey, blob = false } = {}) {
  const headers = { 'X-API-Key': apiKey ?? apiKeyStorage.get() ?? '' }
  let body
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(json)
  } else if (form) {
    body = form
  }

  let response
  try {
    response = await fetch(`${API_BASE}${path}`, { method, headers, body })
  } catch {
    throw new ApiError('Нет связи с сервером. Проверьте, что он запущен.', 0)
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new ApiError(detailMessage(payload?.detail, `Ошибка сервера (${response.status})`), response.status)
  }
  if (response.status === 204) return null
  return blob ? response.blob() : response.json()
}

export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function safeFilename(name) {
  return name.replace(/[\\/:*?"<>|]/g, '_')
}

function fileForm(fields, file) {
  const form = new FormData()
  Object.entries(fields).forEach(([key, value]) => form.append(key, value))
  form.append('file', file)
  return form
}

export const api = {
  me: (apiKey) => request('/me', { apiKey }),

  listTasks: () => request('/tasks'),
  getTask: (id) => request(`/tasks/${id}`),
  createTask: (body) => request('/tasks', { method: 'POST', json: body }),
  rebuildTask: (id, changes) => request(`/tasks/${id}/rebuild`, { method: 'POST', json: changes }),
  downloadTaskFile: (id, format) => request(`/tasks/${id}/result?format=${format}`, { blob: true }),

  listTemplates: () => request('/templates'),
  getTemplate: (id) => request(`/templates/${id}`),
  createTemplate: (name, file) => request('/templates', { method: 'POST', form: fileForm({ name }, file) }),
  uploadTemplateVersion: (id, file) => request(`/templates/${id}/versions`, { method: 'POST', form: fileForm({}, file) }),
  activateTemplateVersion: (id, versionId) =>
    request(`/templates/${id}/versions/${versionId}/activate`, { method: 'POST' }),
  getTemplateVersionPreview: (id, versionId) =>
    request(`/templates/${id}/versions/${versionId}/preview`, { blob: true }),
  deleteTemplate: (id) => request(`/templates/${id}`, { method: 'DELETE' }),
}
