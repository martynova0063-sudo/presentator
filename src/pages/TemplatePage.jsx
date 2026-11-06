import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api.js'
import TemplatePreviewDialog from '../components/TemplatePreviewDialog.jsx'
import { formatDate } from '../labels.js'

export default function TemplatePage() {
  const { templateId } = useParams()
  const navigate = useNavigate()
  const [template, setTemplate] = useState(null)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [previewVersion, setPreviewVersion] = useState(null)
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    api
      .getTemplate(templateId)
      .then(setTemplate)
      .catch((err) => setError(err.message))
  }, [templateId])

  const run = async (action) => {
    setActionError('')
    try {
      await action()
    } catch (err) {
      setActionError(err.message)
    }
  }

  const activate = (version) =>
    run(async () => setTemplate(await api.activateTemplateVersion(template.id, version.id)))

  const uploadVersion = (event) => {
    event.preventDefault()
    const formEl = event.currentTarget
    if (!file) return
    run(async () => {
      setUploading(true)
      try {
        setTemplate(await api.uploadTemplateVersion(template.id, file))
        setFile(null)
        formEl.reset()
      } finally {
        setUploading(false)
      }
    })
  }

  const remove = () => {
    if (!window.confirm(`Удалить шаблон «${template.name}» со всеми версиями?`)) return
    run(async () => {
      await api.deleteTemplate(template.id)
      navigate('/templates', { replace: true })
    })
  }

  if (error) {
    return (
      <section className="page">
        <p className="alert alert-error">{error}</p>
        <Link to="/templates" className="btn btn-secondary">
          К шаблонам
        </Link>
      </section>
    )
  }
  if (!template) return <p className="muted">Загружаем шаблон…</p>

  const versions = [...template.versions].sort((a, b) => b.version - a.version)

  return (
    <section className="page">
      <div className="page-header">
        <Link to="/templates" className="muted small">
          ← К шаблонам
        </Link>
        <h1 className="title">{template.name}</h1>
        <p className="muted small">Создан {formatDate(template.created_at)}</p>
      </div>

      {actionError && <p className="alert alert-error">{actionError}</p>}

      <section className="card stack">
        <h2 className="subtitle">Версии</h2>
        <ul className="version-list">
          {versions.map((version) => (
            <li key={version.id} className="version-item">
              <div>
                <strong>Версия {version.version}</strong>
                {version.is_active && <span className="tag tag-success">Активна</span>}
                <p className="muted small">
                  {version.original_filename} · {formatDate(version.created_at)}
                </p>
              </div>
              <div className="version-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setPreviewVersion(version)}>
                  Предпросмотр
                </button>
                {!version.is_active && (
                  <button type="button" className="btn btn-secondary" onClick={() => activate(version)}>
                    Сделать активной
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>

        <form className="version-upload form" onSubmit={uploadVersion}>
          <label className="field">
            <span className="label">Новая версия (PPTX)</span>
            <input className="input" type="file" accept=".pptx" onChange={(e) => setFile(e.target.files[0] ?? null)} />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={uploading || !file}>
              {uploading ? 'Загружаем…' : 'Загрузить версию'}
            </button>
          </div>
        </form>
      </section>

      <div className="danger-zone">
        <button type="button" className="btn btn-danger" onClick={remove}>
          Удалить шаблон
        </button>
      </div>

      {previewVersion && (
        <TemplatePreviewDialog
          templateId={template.id}
          version={previewVersion}
          onClose={() => setPreviewVersion(null)}
        />
      )}
    </section>
  )
}
