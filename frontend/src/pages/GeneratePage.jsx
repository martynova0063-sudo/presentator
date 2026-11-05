import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'

const FAST_MODE_MAX_SLIDES = 5
const INITIAL_FORM = {
  title: '',
  text: '',
  slidesCount: 8,
  language: 'ru',
  audience: '',
  tone: '',
  templateId: '',
  wantPdf: false,
  fastMode: false,
  slidesJson: '',
}

function parseSlides(raw) {
  if (!raw.trim()) return { slides: null }
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return { error: 'Структурированные данные должны быть списком слайдов в формате JSON' }
    }
    return { slides: parsed }
  } catch {
    return { error: 'Структурированные данные должны быть корректным JSON' }
  }
}

export default function GeneratePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(INITIAL_FORM)
  const [templates, setTemplates] = useState([])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.listTemplates().then(setTemplates).catch(() => setTemplates([]))
  }, [])

  const update = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setForm((current) => ({ ...current, [field]: value }))
  }

  const maxSlides = form.fastMode ? FAST_MODE_MAX_SLIDES : 40

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    const { slides, error: slidesError } = parseSlides(form.slidesJson)
    if (slidesError) {
      setError(slidesError)
      return
    }
    if (!form.text.trim() && !slides) {
      setError('Опишите содержание презентации или добавьте структурированные данные')
      return
    }
    setSubmitting(true)
    try {
      const task = await api.createTask({
        title: form.title.trim(),
        text: form.text.trim() || null,
        slides,
        slides_count: Number(form.slidesCount),
        language: form.language,
        audience: form.audience.trim() || null,
        tone: form.tone.trim() || null,
        template_id: form.templateId ? Number(form.templateId) : null,
        want_pdf: form.wantPdf,
        mode: form.fastMode ? 'sync' : 'async',
      })
      navigate(`/tasks/${task.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1 className="title">Новая презентация</h1>
        <p className="muted">Опишите содержание, и Презентатор соберет слайды по выбранному шаблону.</p>
      </header>

      <form className="card form fade-in" onSubmit={submit}>
        <label className="field">
          <span className="label">Название презентации</span>
          <input className="input" value={form.title} onChange={update('title')} maxLength={200} required />
        </label>

        <label className="field">
          <span className="label">Описание или структура содержания</span>
          <textarea
            className="input textarea"
            rows={8}
            value={form.text}
            onChange={update('text')}
            placeholder={'Каждый блок с новой строки. Заголовок слайда можно начать с #.\n\n# Итоги квартала\n- Выручка выросла на 12%\n- Открыто два новых офиса'}
          />
        </label>

        <div className="grid-2">
          <label className="field">
            <span className="label">Количество слайдов</span>
            <input
              className="input"
              type="number"
              min={1}
              max={maxSlides}
              value={form.slidesCount}
              onChange={update('slidesCount')}
            />
            {form.fastMode && <span className="hint">В быстром режиме не больше {FAST_MODE_MAX_SLIDES} слайдов</span>}
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
            <input className="input" value={form.audience} onChange={update('audience')} placeholder="Например, совет директоров" />
          </label>
          <label className="field">
            <span className="label">Тон изложения</span>
            <input className="input" value={form.tone} onChange={update('tone')} placeholder="Например, деловой и краткий" />
          </label>
        </div>

        <label className="field">
          <span className="label">Корпоративный шаблон</span>
          <select className="input" value={form.templateId} onChange={update('templateId')}>
            <option value="">Без шаблона</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </label>

        <div className="checks">
          <label className="check">
            <input type="checkbox" checked={form.wantPdf} onChange={update('wantPdf')} />
            <span>Сделать также PDF</span>
          </label>
          <label className="check">
            <input type="checkbox" checked={form.fastMode} onChange={update('fastMode')} />
            <span>Быстрый режим: результат сразу (до {FAST_MODE_MAX_SLIDES} слайдов)</span>
          </label>
        </div>

        <details className="details">
          <summary>Структурированные данные (для опытных пользователей)</summary>
          <label className="field">
            <span className="hint">
              Список слайдов в формате JSON, например: [{'{'}"title": "Продажи", "chart": {'{'}"categories": ["2023", "2024"], "series": [{'{'}"name": "Выручка", "values": [10, 12]{'}'}]{'}'}{'}'}]
            </span>
            <textarea
              className="input textarea mono"
              rows={6}
              value={form.slidesJson}
              onChange={update('slidesJson')}
            />
          </label>
        </details>

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
