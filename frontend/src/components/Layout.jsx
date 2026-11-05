import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { clearApiKey } from '../api.js'

const NAV_ITEMS = [
  { to: '/', label: 'Новая презентация', end: true },
  { to: '/tasks', label: 'История' },
  { to: '/templates', label: 'Шаблоны' },
]

export default function Layout() {
  const navigate = useNavigate()

  const logout = () => {
    clearApiKey()
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
          <button type="button" className="btn btn-ghost" onClick={logout}>
            Выйти
          </button>
        </div>
      </header>
      <main className="container main">
        <Outlet />
      </main>
    </div>
  )
}
