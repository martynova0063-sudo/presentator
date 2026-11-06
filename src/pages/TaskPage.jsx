import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, safeFilename, saveBlob } from '../api.js'
import RebuildDialog from '../components/RebuildDialog.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { SLIDE_TYPE_LABELS, formatDate, isActiveStatus } from '../labels.js'

const POLL_INTERVAL_MS = 2000

export default function TaskPage() {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const [task, setTask] = useState(null)
  const [error, setError] = useState('')
  const [downloadError, setDownloadError] = useState('')
  const [rebuildOpen, setRebuildOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    let timer = null

    const load = () => {
      api
        .getTask(taskId)
        .then((data) => {
          if (cancelled) return
          setTask(data)
          setError('')
          if (isActiveStatus(data.status)) timer = setTimeout(load, POLL_INTERVAL_MS)
        })
        .catch((err) => {
          if (!cancelled) setError(err.message)
        })
    }

    load()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [taskId])

  const download = async (format) => {
    setDownloadError('')
    try {
      const blob = await api.downloadTaskFile(task.id, format)
      saveBlob(blob, `${safeFilename(task.title)}.${format}`)
    } catch (err) {
      setDownloadError(err.message)
    }
  }

  if (error && !task) {
    return (
      <section className="page">
        <p className="alert alert-error">{error}</p>
        <Link to="/tasks" className="btn btn-secondary">
          К истории
        </Link>
      </section>
    )
  }
  if (!task) return <p className="muted">Загружаем презентацию…</p>

  const active = isActiveStatus(task.status)

  return (
    <section className="page">
      <div className="page-header">
        <Link to="/tasks" className="muted small">
          ← К истории
        </Link>
        <div className="page-title-row">
          <h1 className="title">{task.title}</h1>
          <StatusBadge status={task.status} />
        </div>
        <p className="muted small">Создано {formatDate(task.created_at)}</p>
      </div>

      {active && (
        <div className="card stack fade-in">
          <span className="progress-text">Презентация готовится. Страница обновится сама.</span>
          <div className="progress">
            <div className="progress-bar" style={{ width: `${task.progress}%` }} />
          </div>
        </div>
      )}

      {task.status === 'failed' && (
        <p className="alert alert-error">Не удалось создать презентацию: {task.error ?? 'неизвестная ошибка'}</p>
      )}

      {task.status === 'completed' && (
        <div className="card stack">
          <div className="actions">
            <button type="button" className="btn btn-primary" disabled={!task.has_pptx} onClick={() => download('pptx')}>
              Скачать PPTX
            </button>
            <button type="button" className="btn btn-secondary" disabled={!task.has_pdf} onClick={() => download('pdf')}>
              Скачать PDF
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setRebuildOpen(true)}>
              Пересобрать
            </button>
          </div>
          {downloadError && <p className="alert alert-error">{downloadError}</p>}
        </div>
      )}

      {task.outline?.length > 0 && (
        <section className="stack">
          <h2 className="subtitle">Слайды ({task.outline.length})</h2>
          <ol className="outline-list">
            {task.outline.map((slide, index) => (
              <li key={index} className="card outline-item">
                <div className="outline-head">
                  <span className="outline-number">{index + 1}</span>
                  <strong>{slide.title}</strong>
                  <span className="tag">{SLIDE_TYPE_LABELS[slide.type] ?? slide.type}</span>
                </div>
                {slide.bullets?.length > 0 && (
                  <ul className="outline-bullets">
                    {slide.bullets.map((bullet, i) => (
                      <li key={i}>{bullet}</li>
                    ))}
                  </ul>
                )}
                {slide.table && (
                  <div className="outline-table-wrap">
                    <table className="outline-table">
                      <thead>
                        <tr>
                          {slide.table.headers.map((header, i) => (
                            <th key={i}>{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {slide.table.rows.map((row, i) => (
                          <tr key={i}>
                            {row.map((cell, j) => (
                              <td key={j}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {slide.comparison && (
                  <div className="outline-comparison">
                    <div>
                      <strong>{slide.comparison.left_title}</strong>
                      <ul>
                        {slide.comparison.left_items.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <strong>{slide.comparison.right_title}</strong>
                      <ul>
                        {slide.comparison.right_items.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                {slide.reasoning && <p className="hint">{slide.reasoning}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}

      {rebuildOpen && (
        <RebuildDialog
          task={task}
          onClose={() => setRebuildOpen(false)}
          onRebuilt={(created) => navigate(`/tasks/${created.id}`)}
        />
      )}
    </section>
  )
}
