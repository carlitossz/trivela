import { Link } from 'react-router-dom'
import { Icon, JerseyImage, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import { bs, cop, orderTotal, timeAgo, totalStock, usd } from '../../lib/format'
import { useAsync } from '../../lib/store'
import { useOrderAlerts } from './orderAlerts'
import { ErrorBox, PageTitle, StatusBadge } from './shared'

export default function Dashboard() {
  const { tick, permission, enableNotifications } = useOrderAlerts()
  const { data, error, loading, reload } = useAsync(() => Promise.all([api.listProducts({ includeInactive: true }), api.listOrders()]), [tick])

  if (loading && !data) return <div className="grid place-items-center py-20"><Spinner dark /></div>
  if (error || !data) return <ErrorBox message={error ?? 'No se pudo cargar'} onRetry={reload} />

  const [products, orders] = data
  const active = products.filter((p) => p.active)
  const stock = active.reduce((a, p) => a + totalStock(p), 0)
  const pending = orders.filter((o) => o.status === 'pendiente')
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const sold = orders.filter((o) => (o.status === 'pagado' || o.status === 'entregado') && new Date(o.created_at) >= monthStart)
  const units = sold.reduce((a, o) => a + o.items.reduce((b, i) => b + i.qty, 0), 0)
  const byCurrency = {
    USD: sold.filter((o) => o.currency === 'USD').reduce((a, o) => a + o.total_usd, 0),
    COP: sold.filter((o) => o.currency === 'COP').reduce((a, o) => a + o.total_cop, 0),
    BS: sold.filter((o) => o.currency === 'BS').reduce((a, o) => a + (o.total_bs ?? 0), 0),
    BSnoRate: sold.filter((o) => o.currency === 'BS' && o.total_bs == null).reduce((a, o) => a + o.total_usd, 0)
  }
  const lastUnits = active.flatMap((p) => p.variants.filter((v) => v.stock === 1).map((v) => ({ p, v })))

  return (
    <>
      <PageTitle
        title="Inicio"
        subtitle={pending.length ? `Tienes ${pending.length} ${pending.length === 1 ? 'pedido' : 'pedidos'} por confirmar` : 'No hay pedidos pendientes'}
        actions={
          <>
            <button type="button" className="a-btn" onClick={reload} aria-label="Actualizar">
              <Icon name="refresh" size={16} />
            </button>
            <Link to="/admin/franelas/nueva" className="a-btn-dark">
              <Icon name="plus" size={16} /> Nueva franela
            </Link>
          </>
        }
      />

      {permission !== 'granted' && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-[#BFE8CF] bg-[#EAF8EF] p-4 text-sm">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-wa text-ink">
            <Icon name="bag" size={18} />
          </span>
          <div className="min-w-0 flex-1 basis-56">
            <p className="font-bold">Aviso de pedidos nuevos</p>
            <p className="text-[#3D5C48]">
              {permission === 'denied'
                ? 'Notificaciones bloqueadas en este navegador. Con el panel abierto igual suena y aparece el aviso.'
                : permission === 'unsupported'
                  ? 'Con el panel abierto, cada pedido nuevo suena y aparece arriba. En iPhone, instala la app en la pantalla de inicio para recibir notificaciones.'
                  : 'Con el panel abierto, cada pedido nuevo suena y aparece arriba. Activa las notificaciones para enterarte aunque estés en otra pestaña.'}
            </p>
          </div>
          {permission === 'default' && (
            <button type="button" className="a-btn-dark" onClick={() => void enableNotifications()}>
              Activar notificaciones
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Franelas en stock" value={String(stock)} note={`${active.length} modelos activos`} />
        <Kpi label="Por confirmar" value={String(pending.length)} note={reservedNote(pending.reduce((a, o) => a + o.items.reduce((b, i) => b + i.qty, 0), 0))} />
        <Kpi label="Vendidas este mes" value={String(units)} note={`${sold.length} pedidos pagados`} />
        <Kpi label="Última unidad" value={`${lastUnits.length} tallas`} note="Revisa si reponer" dark />
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="a-card min-w-0 p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-bold">Por confirmar</h2>
            <Link to="/admin/pedidos" className="text-sm font-semibold underline">
              Ver pedidos
            </Link>
          </div>
          {pending.length === 0 ? (
            <p className="text-sm text-[#5C5C5C]">Cuando un cliente haga un pedido aparece aquí, con las franelas ya apartadas.</p>
          ) : (
            <ul className="divide-y divide-[#EEEEEA]">
              {pending.slice(0, 6).map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="font-bold">
                      {o.code} · {o.customer_name}
                    </p>
                    <p className="truncate text-xs text-[#5C5C5C]">
                      {o.items.map((i) => `${i.product_name} ${i.size}${i.dorsal ? ` (${i.dorsal})` : ''}`).join(', ')} · {timeAgo(o.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{orderTotal(o)}</span>
                    <StatusBadge status={o.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex flex-col gap-4">
          <section className="a-card flex flex-col gap-2.5 p-5">
            <h2 className="text-lg font-bold">Cobrado este mes</h2>
            <Row label="Dólares" value={usd(byCurrency.USD)} />
            <Row label="Pesos" value={cop(byCurrency.COP)} />
            <Row label="Bolívares" value={bs(byCurrency.BS)} />
            {byCurrency.BSnoRate > 0 && <Row label="Bs sin tasa cargada" value={`${usd(byCurrency.BSnoRate)} en Bs`} />}
            <p className="text-xs text-[#5C5C5C]">Cada moneda se suma aparte, para que cuadre con la caja y las cuentas.</p>
          </section>

          <section className="a-card flex flex-col gap-2 p-5">
            <h2 className="text-lg font-bold">Última unidad</h2>
            {lastUnits.length === 0 ? (
              <p className="text-sm text-[#5C5C5C]">Ninguna talla está en su última unidad.</p>
            ) : (
              lastUnits.slice(0, 8).map(({ p, v }) => (
                <div key={v.id} className="flex items-center gap-3 text-sm">
                  <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#F0F0EC]">
                    <JerseyImage src={p.image_url} alt="" className="h-8 w-full" />
                  </div>
                  <span className="flex-1 truncate font-semibold">
                    {p.name}
                    {v.dorsal && <span className="block truncate text-xs font-normal text-[#5C5C5C]">{v.dorsal}</span>}
                  </span>
                  <span className="rounded-md bg-[#FFF1C2] px-2 py-0.5 text-xs font-bold text-[#5C4100]">{v.size}</span>
                </div>
              ))
            )}
            <Link to="/admin/inventario" className="mt-1 text-sm font-semibold underline">
              Ir al inventario
            </Link>
          </section>
        </div>
      </div>
    </>
  )
}

const reservedNote = (n: number) => (n === 1 ? '1 franela apartada' : `${n} franelas apartadas`)

function Kpi({ label, value, note, dark = false }: { label: string; value: string; note: string; dark?: boolean }) {
  return (
    <div className={`flex flex-col gap-1.5 rounded-2xl p-4 ${dark ? 'bg-ink text-white' : 'border border-rule bg-white'}`}>
      <span className={`text-[13px] font-semibold ${dark ? 'text-soft' : 'text-[#5C5C5C]'}`}>{label}</span>
      <span className="text-[30px] font-extrabold leading-none">{value}</span>
      <span className={`text-xs ${dark ? 'text-soft' : 'text-[#5C5C5C]'}`}>{note}</span>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span>{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  )
}
