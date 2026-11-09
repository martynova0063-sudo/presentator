import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'

export default function LoginPage() {
  const navigate = useNavigate()
  const { user, login } = useAuth()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" replace />

  const submit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login()
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
        <p className="muted">Создавайте презентации по тексту или данным.</p>

        {error && <p className="alert alert-error">{error}</p>}

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'Входим…' : 'Войти'}
        </button>
      </form>
    </div>
  )
}
