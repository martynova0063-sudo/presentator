import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'

const NAV_ITEMS = [
  { to: '/', label: 'Новая презентация', end: true },
  { to: '/tasks', label: 'История' },
  { to: '/templates', label: 'Шаблоны' },
]

export default function Layout() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="container header-inner">
          <span className="brand">Презентатор</span>
          <nav className="nav">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className="nav-link">
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="user-area">
            <span className="muted small">{user?.name}</span>
            <button type="button" className="btn btn-ghost" onClick={handleLogout}>
              Выйти
            </button>
          </div>
        </div>
      </header>
      <main className="container main">
        <Outlet />
      </main>
    </div>
  )
}
