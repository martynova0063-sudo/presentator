import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api.js'
import { formatDate } from '../labels.js'
import TemplatePreviewDialog from '../components/TemplatePreviewDialog.jsx'

export default function TemplatePage() {
  const { templateId } = useParams()
  const navigate = useNavigate()
  const [template, setTemplate] = useState(null)
  const [error, setError] = useState('')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [previewVersion, setPreviewVersion] = useState(null)

  const run = async (action) => {
    setBusy(true)
    setError('')
    try {
      return await action()
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    run(() => api.getTemplate(templateId)).then((data) => data && setTemplate(data))
  }, [templateId])

  const uploadVersion = async (event) => {
    event.preventDefault()
    if (!file) return
    const updated = await run(() => api.uploadTemplateVersion(templateId, file))
    if (updated) {
      setTemplate(updated)
      setFile(null)
      event.target.reset()
    }
  }

  const activate = async (versionId) => {
    const updated = await run(() => api.activateTemplateVersion(templateId, versionId))
    if (updated) setTemplate(updated)
  }

  const remove = async () => {
    if (!window.confirm('Удалить шаблон и все его версии? Уже созданные презентации сохранятся.')) return
    setBusy(true)
    setError('')
    try {
      await api.deleteTemplate(templateId)
      navigate('/templates', { replace: true })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  if (!template) {
    return (
      <section className="page">
        {error ? <p className="alert alert-error">{error}</p> : <p className="muted">Загружаем шаблон…</p>}
        <Link to="/templates">Ко всем шаблонам</Link>
      </section>
    )
  }

  return (
    <section className="page">
      <header className="page-header">
        <Link to="/templates" className="muted small">← Шаблоны</Link>
        <h1 className="title">{template.name}</h1>
      </header>

      {error && <p className="alert alert-error">{error}</p>}

      <div className="card stack">
        <h2 className="subtitle">Версии</h2>
        <ul className="version-list">
          {[...template.versions].reverse().map((version) => (
            <li key={version.id} className="version-item">
              <div>
                <strong>Версия {version.version}</strong>
                {version.is_active && <span className="tag tag-success">активна</span>}
                <p className="muted small">
                  {version.original_filename} · {formatDate(version.created_at)}
                </p>
              </div>
              <div className="version-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setPreviewVersion(version)}>
                  Предпросмотр
                </button>
                {!version.is_active && (
                  <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => activate(version.id)}>
                    Сделать активной
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>

        <form className="form version-upload" onSubmit={uploadVersion}>
          <label className="field">
            <span className="label">Загрузить новую версию</span>
            <input
              className="input"
              type="file"
              accept=".pptx"
              onChange={(e) => setFile(e.target.files[0] ?? null)}
            />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={busy || !file}>
              {busy ? 'Загружаем…' : 'Загрузить версию'}
            </button>
          </div>
        </form>
      </div>

      {previewVersion && (
        <TemplatePreviewDialog
          templateId={templateId}
          version={previewVersion}
          onClose={() => setPreviewVersion(null)}
        />
      )}

      <div className="danger-zone">
        <button type="button" className="btn btn-danger" disabled={busy} onClick={remove}>
          Удалить шаблон
        </button>
      </div>
    </section>
  )
}
