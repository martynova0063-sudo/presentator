import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'

export default function LoginPage() {
  const navigate = useNavigate()
  const { user, login } = useAuth()
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" replace />

  const submit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(apiKey.trim())
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <form className="card login-card fade-in" onSubmit={submit}>
        <h1 className="title">Презентатор</h1>
        <p className="muted">Введите ваш API-ключ, чтобы создавать презентации.</p>

        <label className="field">
          <span className="label">API-ключ</span>
          <input
            className="input"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            autoComplete="off"
            autoFocus
            required
          />
          <span className="hint">Ключ выдаёт администратор системы.</span>
        </label>

        {error && <p className="alert alert-error">{error}</p>}

        <button type="submit" className="btn btn-primary btn-block" disabled={loading || !apiKey.trim()}>
          {loading ? 'Проверяем ключ…' : 'Войти'}
        </button>
      </form>
    </div>
  )
}
