import { useEffect, useState } from 'react'
import { api } from '../api.js'

export default function RebuildDialog({ task, onClose, onRebuilt }) {
  const currentTemplateId = task.request?.template_id ?? ''
  const [title, setTitle] = useState(task.title)
  const [slidesCount, setSlidesCount] = useState(task.request?.slides_count ?? 8)
  const [templateId, setTemplateId] = useState(String(currentTemplateId))
  const [wantPdf, setWantPdf] = useState(Boolean(task.want_pdf))
  const [templates, setTemplates] = useState([])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    api.listTemplates().then(setTemplates).catch((err) => setError(err.message))
  }, [])

  const submit = async (event) => {
    event.preventDefault()
    const changes = {}
    if (title.trim() !== task.title) changes.title = title.trim()
    if (Number(slidesCount) !== task.request?.slides_count) changes.slides_count = Number(slidesCount)
    if (templateId !== String(currentTemplateId)) changes.template_id = templateId ? Number(templateId) : null
    if (wantPdf !== Boolean(task.want_pdf)) changes.want_pdf = wantPdf

    setSubmitting(true)
    setError('')
    try {
      const created = await api.rebuildTask(task.id, changes)
      onRebuilt(created)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form
        className="modal card fade-in"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <h2 className="subtitle">Пересборка презентации</h2>
        <p className="muted small">Будет создана новая презентация на основе этой. Исходная останется в истории.</p>

        <label className="field">
          <span className="label">Название</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
        </label>
        <label className="field">
          <span className="label">Количество слайдов</span>
          <input
            className="input"
            type="number"
            min={1}
            max={40}
            value={slidesCount}
            onChange={(e) => setSlidesCount(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span className="label">Шаблон оформления</span>
          <select className="input" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            <option value="">Стандартное оформление</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={wantPdf} onChange={(e) => setWantPdf(e.target.checked)} />
          Также подготовить PDF
        </label>

        {error && <p className="alert alert-error">{error}</p>}

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting || !title.trim()}>
            {submitting ? 'Запускаем…' : 'Пересобрать'}
          </button>
        </div>
      </form>
    </div>
  )
}
