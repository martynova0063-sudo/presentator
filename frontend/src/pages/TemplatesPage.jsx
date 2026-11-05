import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'

export default function TemplatesPage() {
  const [templates, setTemplates] = useState(null)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const load = () =>
    api
      .listTemplates()
      .then(setTemplates)
      .catch((err) => setError(err.message))

  useEffect(() => {
    load()
  }, [])

  const create = async (event) => {
    event.preventDefault()
    if (!file) return
    setSubmitting(true)
    setError('')
    try {
      await api.createTemplate(name.trim(), file)
      setName('')
      setFile(null)
      setCreating(false)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="page">
      <header className="page-header page-title-row">
        <div>
          <h1 className="title">Корпоративные шаблоны</h1>
          <p className="muted">Загрузите PPTX-шаблон с фирменными цветами, шрифтами и логотипом.</p>
        </div>
        {!creating && (
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            Загрузить шаблон
          </button>
        )}
      </header>

      {creating && (
        <form className="card form fade-in" onSubmit={create}>
          <label className="field">
            <span className="label">Название шаблона</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} required />
          </label>
          <label className="field">
            <span className="label">Файл PPTX</span>
            <input
              className="input"
              type="file"
              accept=".pptx"
              onChange={(e) => setFile(e.target.files[0] ?? null)}
              required
            />
          </label>
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setCreating(false)}>
              Отмена
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting || !file || !name.trim()}>
              {submitting ? 'Загружаем…' : 'Сохранить шаблон'}
            </button>
          </div>
        </form>
      )}

      {error && <p className="alert alert-error">{error}</p>}
      {templates === null && !error && <p className="muted">Загружаем шаблоны…</p>}

      {templates?.length === 0 && <p className="card empty">Шаблонов пока нет.</p>}

      {templates?.length > 0 && (
        <ul className="list">
          {templates.map((template) => {
            const active = template.versions.find((version) => version.is_active)
            return (
              <li key={template.id}>
                <Link to={`/templates/${template.id}`} className="card list-item">
                  <strong className="list-title">{template.name}</strong>
                  <span className="muted small">
                    {active ? `Активная версия: ${active.version}` : 'Нет активной версии'} · версий:{' '}
                    {template.versions.length}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
