import { useEffect, useState, type FormEvent } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { DemoBanner, Icon, Logo, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import { DEMO_PASSWORD } from '../../lib/demoApi'
import { errorMessage } from '../../lib/format'
import Dashboard from './Dashboard'
import { OrderAlertsProvider, useOrderAlerts } from './orderAlerts'
import Inventory from './Inventory'
import Orders from './Orders'
import ProductForm from './ProductForm'
import Products from './Products'
import Reports from './Reports'
import SettingsPage from './SettingsPage'

const NAV = [
  { to: '/admin', label: 'Inicio', icon: 'home', end: true },
  { to: '/admin/pedidos', label: 'Pedidos', icon: 'list', end: false },
  { to: '/admin/inventario', label: 'Inventario', icon: 'box', end: false },
  { to: '/admin/franelas', label: 'Franelas', icon: 'shirt', end: false },
  { to: '/admin/reportes', label: 'Reportes', icon: 'chart', end: false },
  { to: '/admin/ajustes', label: 'Ajustes', icon: 'gear', end: false }
] as const

export default function AdminApp() {
  const [email, setEmail] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    api.getSessionEmail().then(setEmail).catch(() => setEmail(null))
  }, [])

  if (email === undefined) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper">
        <Spinner dark />
      </div>
    )
  }
  if (!email) return <Login onDone={setEmail} />

  async function logout() {
    await api.signOut()
    setEmail(null)
  }

  return (
    <OrderAlertsProvider>
      <AdminShell email={email} onLogout={logout} />
    </OrderAlertsProvider>
  )
}

function AdminShell({ email, onLogout }: { email: string; onLogout: () => void }) {
  const { pending } = useOrderAlerts()
  const badge = (to: string) =>
    to === '/admin/pedidos' && pending.length > 0 ? (
      <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-wa px-1.5 text-[11px] font-bold text-ink">{pending.length}</span>
    ) : null

  return (
    <div className="min-h-screen bg-paper text-ink">
      <DemoBanner light />
      <div className="md:flex">
        {/* Menú lateral (computadora) */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 bg-ink px-4 py-6 text-[#D4D4D4] md:flex">
          <div className="flex items-center justify-between px-2 text-white">
            <Logo size={20} />
            <span className="rounded-[5px] border border-line2 px-1.5 py-0.5 text-[10px] font-bold tracking-[0.08em]">ADMIN</span>
          </div>
          <nav aria-label="Panel" className="flex flex-col gap-0.5">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `flex h-11 items-center gap-2.5 rounded-[10px] px-3 text-sm font-semibold ${isActive ? 'bg-white text-ink' : 'hover:bg-[#1F1F1F]'}`
                }
              >
                <Icon name={n.icon} size={18} />
                {n.label}
                {badge(n.to)}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-1 px-2 text-xs">
            <a href={import.meta.env.BASE_URL} target="_blank" rel="noreferrer" className="font-semibold text-white underline">
              Ver la tienda
            </a>
            <span className="truncate text-muted">{email}</span>
            <button type="button" onClick={onLogout} className="flex h-9 items-center gap-2 font-semibold text-soft hover:text-white">
              <Icon name="out" size={16} /> Cerrar sesión
            </button>
          </div>
        </aside>

        {/* Barra superior (teléfono) */}
        <header className="sticky top-0 z-20 flex items-center justify-between bg-ink px-4 py-3 text-white md:hidden">
          <Logo size={17} />
          <div className="flex items-center gap-2">
            <a href={import.meta.env.BASE_URL} target="_blank" rel="noreferrer" className="rounded-lg border border-line2 px-2.5 py-1.5 text-xs font-semibold">
              Ver tienda
            </a>
            <button type="button" onClick={onLogout} aria-label="Cerrar sesión" className="grid h-9 w-9 place-items-center rounded-lg border border-line2">
              <Icon name="out" size={16} />
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 pb-28 pt-5 md:px-10 md:pb-12 md:pt-8">
          <div className="mx-auto max-w-6xl">
            <Routes>
              <Route index element={<Dashboard />} />
              <Route path="pedidos" element={<Orders />} />
              <Route path="inventario" element={<Inventory />} />
              <Route path="franelas" element={<Products />} />
              <Route path="franelas/nueva" element={<ProductForm />} />
              <Route path="franelas/:id" element={<ProductForm />} />
              <Route path="reportes" element={<Reports />} />
              <Route path="ajustes" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </div>
        </main>
      </div>

      {/* Menú inferior (teléfono) */}
      <nav aria-label="Panel" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-6 border-t border-rule bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) => `flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${isActive ? 'text-ink' : 'text-[#8C8C8C]'}`}
          >
            <span className="relative">
              <Icon name={n.icon} size={21} />
              {n.to === '/admin/pedidos' && pending.length > 0 && (
                <span className="absolute -right-2.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-wa px-1 text-[10px] font-bold text-ink">{pending.length}</span>
              )}
            </span>
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function Login({ onDone }: { onDone: (email: string) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const demo = api.mode === 'demo'

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.signIn(email.trim(), password)
      onDone((await api.getSessionEmail()) ?? email)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-ink">
      <DemoBanner />
      <div className="grid min-h-[calc(100vh-30px)] place-items-center px-5 py-10">
        <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-5 rounded-3xl bg-white p-7 text-ink">
          <div className="flex items-center justify-between">
            <Logo size={22} />
            <span className="rounded-[5px] border border-rule px-1.5 py-0.5 text-[10px] font-bold tracking-[0.08em]">ADMIN</span>
          </div>
          <div>
            <h1 className="text-xl font-bold">Entrar al panel</h1>
            <p className="text-sm text-[#5C5C5C]">Pedidos, inventario y franelas de la tienda.</p>
          </div>
          {!demo && (
            <label className="a-label">
              Correo
              <input className="a-field h-12 text-base" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </label>
          )}
          <label className="a-label">
            Contraseña
            <input className="a-field h-12 text-base" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </label>
          {demo && (
            <p className="rounded-xl bg-[#FFF1C2] px-3 py-2 text-xs text-[#5C4100]">
              Versión de prueba: la contraseña es <b>{DEMO_PASSWORD}</b>
            </p>
          )}
          {error && (
            <p role="alert" className="rounded-xl bg-[#FBE3DE] px-3 py-2 text-sm font-semibold text-[#7A2318]">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} className="a-btn-dark h-12 text-base">
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
