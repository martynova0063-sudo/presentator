import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import StatusBadge from '../components/StatusBadge.jsx'
import { formatDate } from '../labels.js'

const FILTERS = [
  { value: 'all', label: 'Все' },
  { value: 'queued', label: 'В очереди' },
  { value: 'processing', label: 'Генерируются' },
  { value: 'completed', label: 'Готовы' },
  { value: 'failed', label: 'С ошибкой' },
]

export default function TasksPage() {
  const [tasks, setTasks] = useState(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.listTasks().then(setTasks).catch((err) => setError(err.message))
  }, [])

  const visible = useMemo(() => {
    if (!tasks) return []
    const query = search.trim().toLowerCase()
    return tasks.filter(
      (task) => (filter === 'all' || task.status === filter) && (!query || task.title.toLowerCase().includes(query)),
    )
  }, [tasks, filter, search])

  return (
    <section className="page">
      <div className="page-header">
        <h1 className="title">История</h1>
        <p className="muted">Все ваши презентации и их текущий статус.</p>
      </div>

      <div className="filter-bar">
        <input
          className="input filter-search"
          placeholder="Поиск по названию"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="filter-tabs">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`filter-tab ${filter === item.value ? 'filter-tab-active' : ''}`}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="alert alert-error">{error}</p>}
      {!error && !tasks && <p className="muted">Загружаем список…</p>}

      {tasks && visible.length === 0 && (
        <div className="card empty">
          <p className="muted">
            {tasks.length === 0 ? 'Презентаций пока нет.' : 'Ничего не найдено по выбранному фильтру.'}
          </p>
          {tasks.length === 0 && (
            <Link to="/" className="btn btn-primary">
              Создать первую презентацию
            </Link>
          )}
        </div>
      )}

      {visible.length > 0 && (
        <ul className="list">
          {visible.map((task) => (
            <li key={task.id}>
              <Link to={`/tasks/${task.id}`} className="card list-item">
                <div className="list-item-main">
                  <span className="list-title">{task.title}</span>
                  <span className="muted small">{formatDate(task.created_at)}</span>
                </div>
                <div className="list-item-meta">
                  {task.want_pdf && <span className="tag">PDF</span>}
                  <StatusBadge status={task.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
