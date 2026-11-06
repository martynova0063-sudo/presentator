import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import CreateTemplateForm from '../components/CreateTemplateForm.jsx'
import { formatDate } from '../labels.js'

export default function TemplatesPage() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.listTemplates().then(setTemplates).catch((err) => setError(err.message))
  }, [])

  return (
    <section className="page">
      <div className="page-header">
        <h1 className="title">Шаблоны</h1>
        <p className="muted">Загрузите PPTX с нужным оформлением, и презентации будут создаваться в его стиле.</p>
      </div>

      <CreateTemplateForm onCreated={(created) => navigate(`/templates/${created.id}`)} />

      {error && <p className="alert alert-error">{error}</p>}
      {!error && !templates && <p className="muted">Загружаем шаблоны…</p>}
      {templates && templates.length === 0 && <p className="muted">Шаблонов пока нет.</p>}

      {templates && templates.length > 0 && (
        <ul className="list">
          {templates.map((template) => {
            const active = template.versions.find((version) => version.is_active)
            return (
              <li key={template.id}>
                <Link to={`/templates/${template.id}`} className="card list-item">
                  <div className="list-item-main">
                    <span className="list-title">{template.name}</span>
                    <span className="muted small">Создан {formatDate(template.created_at)}</span>
                  </div>
                  <span className="tag">{active ? `Активна версия ${active.version}` : 'Нет активной версии'}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
