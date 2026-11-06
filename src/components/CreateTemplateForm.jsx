import { useState } from 'react'
import { api } from '../api.js'

export default function CreateTemplateForm({ onCreated }) {
  const [name, setName] = useState('')
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    if (!file) {
      setError('Выберите файл презентации в формате PPTX.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      onCreated(await api.createTemplate(name.trim(), file))
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <form className="card form" onSubmit={submit}>
      <h2 className="subtitle">Загрузить шаблон</h2>
      <label className="field">
        <span className="label">Название</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} required />
      </label>
      <label className="field">
        <span className="label">Файл PPTX</span>
        <input className="input" type="file" accept=".pptx" onChange={(e) => setFile(e.target.files[0] ?? null)} required />
        <span className="hint">Файл до 50 МБ.</span>
      </label>
      {error && <p className="alert alert-error">{error}</p>}
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={submitting || !name.trim() || !file}>
          {submitting ? 'Загружаем…' : 'Загрузить'}
        </button>
      </div>
    </form>
  )
}
