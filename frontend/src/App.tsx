import { Route, Routes } from 'react-router'
import { GuestOnly, RequireAuth } from './components/guards'
import { Layout } from './components/Layout'
import { AdminItemsPage } from './pages/admin/AdminItemsPage'
import { AdminUsersPage } from './pages/admin/AdminUsersPage'
import { CartPage } from './pages/CartPage'
import { CatalogPage } from './pages/CatalogPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { OrdersPage } from './pages/OrdersPage'
import { ProfilePage } from './pages/ProfilePage'
import { RegisterPage } from './pages/RegisterPage'

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<CatalogPage />} />
        <Route path="cart" element={<CartPage />} />

        <Route element={<GuestOnly />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="orders" element={<OrdersPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        <Route path="admin" element={<RequireAuth admin />}>
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="items" element={<AdminItemsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
