import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, clearApiKey, setApiKey } from '../api.js'

export default function LoginPage() {
  const navigate = useNavigate()
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    clearApiKey()
  }, [])

  const submit = async (event) => {
    event.preventDefault()
    if (!key.trim()) return
    setLoading(true)
    setError('')
    setApiKey(key.trim())
    try {
      await api.getMe()
      navigate('/', { replace: true })
    } catch (err) {
      clearApiKey()
      setError(err.status === 401 ? 'Ключ не подходит. Проверьте его и попробуйте снова.' : err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <form className="card login-card fade-in" onSubmit={submit}>
        <h1 className="title">Презентатор</h1>
        <p className="muted">Введите API-ключ, чтобы создавать презентации.</p>
        <label className="field">
          <span className="label">API-ключ</span>
          <input
            className="input"
            type="password"
            value={key}
            onChange={(event) => setKey(event.target.value)}
            autoComplete="off"
            autoFocus
          />
        </label>
        {error && <p className="alert alert-error">{error}</p>}
        <button type="submit" className="btn btn-primary btn-block" disabled={loading || !key.trim()}>
          {loading ? 'Проверяем…' : 'Войти'}
        </button>
      </form>
    </div>
  )
}
