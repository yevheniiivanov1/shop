import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { useCart } from '../cart/CartContext'

const navClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'nav__link nav__link--active' : 'nav__link')

export function Layout() {
  const { user, signOut } = useAuth()
  const { count, clear } = useCart()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  // Leave protected pages first, otherwise their guard would bounce us to /login.
  const handleSignOut = async () => {
    navigate('/')
    clear()
    await signOut()
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header__inner container">
          <Link to="/" className="logo">
            <img src="/favicon.svg" alt="" width="28" height="28" />
            Shop
          </Link>

          <button
            className="btn btn--ghost menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="main-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            Menu
          </button>

          <nav id="main-nav" className={menuOpen ? 'nav nav--open' : 'nav'} onClick={() => setMenuOpen(false)}>
            <NavLink to="/" end className={navClass}>
              Catalog
            </NavLink>
            <NavLink to="/cart" className={navClass}>
              Cart {count > 0 && <span className="badge">{count}</span>}
            </NavLink>
            {user && (
              <>
                <NavLink to="/orders" className={navClass}>
                  My orders
                </NavLink>
                {user.role === 'admin' && (
                  <>
                    <NavLink to="/admin/users" className={navClass}>
                      Users
                    </NavLink>
                    <NavLink to="/admin/items" className={navClass}>
                      Items
                    </NavLink>
                  </>
                )}
              </>
            )}

            <span className="nav__spacer" />

            {user ? (
              <>
                <NavLink to="/profile" className={navClass} title="Profile">
                  {user.first_name} {user.last_name}
                  {user.role === 'admin' && <span className="tag tag--admin">admin</span>}
                </NavLink>
                <button className="btn btn--ghost" onClick={handleSignOut}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navClass}>
                  Sign in
                </NavLink>
                <Link to="/register" className="btn btn--primary">
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="container main">
        <Outlet />
      </main>
    </div>
  )
}
