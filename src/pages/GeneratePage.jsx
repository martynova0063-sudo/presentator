import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api.js'

const MAX_SLIDES = 40

const INITIAL_FORM = {
  title: '',
  text: '',
  slidesCount: 8,
  language: 'ru',
  audience: '',
  tone: '',
  templateId: '',
  wantPdf: false,
  slidesJson: '',
}

function parseSlides(raw) {
  if (!raw.trim()) return { slides: null }
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return { error: 'Структура слайдов должна быть списком в формате JSON.' }
    return { slides: parsed }
  } catch {
    return { error: 'Структура слайдов должна быть корректным JSON.' }
  }
}

export default function GeneratePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(INITIAL_FORM)
  const [templates, setTemplates] = useState([])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.listTemplates().then(setTemplates).catch((err) => setError(err.message))
  }, [])

  const update = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')

    const { slides, error: slidesError } = parseSlides(form.slidesJson)
    if (slidesError) {
      setError(slidesError)
      return
    }
    if (!slides && !form.text.trim()) {
      setError('Введите текст презентации или структуру слайдов.')
      return
    }

    const body = {
      title: form.title.trim(),
      text: form.text.trim() || null,
      slides,
      slides_count: Number(form.slidesCount),
      language: form.language,
      audience: form.audience.trim() || null,
      tone: form.tone.trim() || null,
      template_id: form.templateId ? Number(form.templateId) : null,
      want_pdf: form.wantPdf,
      mode: 'async',
    }

    setSubmitting(true)
    try {
      const task = await api.createTask(body)
      navigate(`/tasks/${task.id}`)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <section className="page">
      <div className="page-header">
        <h1 className="title">Новая презентация</h1>
        <p className="muted">Опишите тему или вставьте текст, а система подготовит слайды в фоновом режиме.</p>
      </div>

      <form className="card form fade-in" onSubmit={submit}>
        <label className="field">
          <span className="label">Название</span>
          <input className="input" value={form.title} onChange={update('title')} maxLength={200} required />
        </label>

        <label className="field">
          <span className="label">Текст презентации</span>
          <textarea
            className="input textarea"
            rows={8}
            value={form.text}
            onChange={update('text')}
            maxLength={50000}
            placeholder="Вставьте текст или план, из которого нужно сделать слайды"
          />
        </label>

        <div className="grid-2">
          <label className="field">
            <span className="label">Количество слайдов</span>
            <input
              className="input"
              type="number"
              min={1}
              max={MAX_SLIDES}
              value={form.slidesCount}
              onChange={update('slidesCount')}
              required
            />
          </label>
          <label className="field">
            <span className="label">Язык</span>
            <select className="input" value={form.language} onChange={update('language')}>
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="field">
            <span className="label">Аудитория</span>
            <input className="input" value={form.audience} onChange={update('audience')} maxLength={200} />
          </label>
          <label className="field">
            <span className="label">Тон изложения</span>
            <input className="input" value={form.tone} onChange={update('tone')} maxLength={200} />
          </label>
        </div>

        <label className="field">
          <span className="label">Шаблон оформления</span>
          <select className="input" value={form.templateId} onChange={update('templateId')}>
            <option value="">Стандартное оформление</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          {templates.length === 0 && (
            <span className="hint">
              Своих шаблонов пока нет. Загрузите PPTX в разделе <Link to="/templates">Шаблоны</Link>.
            </span>
          )}
        </label>

        <details className="details">
          <summary>Дополнительно: структура слайдов в JSON</summary>
          <label className="field">
            <span className="hint">
              Если заполнено, слайды берутся из этой структуры, а текст используется только при отсутствии слайдов.
            </span>
            <textarea
              className="input textarea mono"
              rows={6}
              value={form.slidesJson}
              onChange={update('slidesJson')}
              placeholder='[{"type": "text", "title": "Введение", "bullets": ["Пункт"]}]'
            />
          </label>
        </details>

        <label className="check">
          <input type="checkbox" checked={form.wantPdf} onChange={update('wantPdf')} />
          Также подготовить PDF
        </label>

        {error && <p className="alert alert-error">{error}</p>}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting || !form.title.trim()}>
            {submitting ? 'Отправляем…' : 'Создать презентацию'}
          </button>
        </div>
      </form>
    </section>
  )
}
