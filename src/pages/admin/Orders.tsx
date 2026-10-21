import { useEffect, useMemo, useState } from 'react'
import { Icon, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import { cashAmountText, changeDueText, errorMessage, orderTotal, STATUS_LABEL, timeAgo, timeLeft } from '../../lib/format'
import { useAsync, useSettings } from '../../lib/store'
import type { Order, OrderStatus } from '../../lib/types'
import { waLink } from '../../lib/whatsapp'
import { useOrderAlerts } from './orderAlerts'
import { ErrorBox, PageTitle, StatusBadge, Toast, useConfirm } from './shared'

const TABS: (OrderStatus | 'todos')[] = ['pendiente', 'pagado', 'entregado', 'cancelado', 'todos']

export default function Orders() {
  // Se recarga sola cuando el aviso detecta un pedido nuevo
  const { tick } = useOrderAlerts()
  const { data: orders, error, loading, reload, setData } = useAsync(() => api.listOrders(), [tick])
  const { settings } = useSettings()
  const { confirm, dialog } = useConfirm()
  const [tab, setTab] = useState<OrderStatus | 'todos'>('pendiente')
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState('')
  const [toast, setToast] = useState('')

  // Los pedidos nuevos llegan por el aviso; esto refresca estados cada minuto (por ejemplo, pedidos liberados solos)
  useEffect(() => {
    const t = setInterval(reload, 60000)
    return () => clearInterval(t)
  }, [reload])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2500)
    return () => clearTimeout(t)
  }, [toast])

  const counts = useMemo(() => {
    const c: Record<string, number> = { todos: orders?.length ?? 0 }
    for (const o of orders ?? []) c[o.status] = (c[o.status] ?? 0) + 1
    return c
  }, [orders])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (orders ?? [])
      .filter((o) => tab === 'todos' || o.status === tab)
      .filter((o) => !q || `${o.code} ${o.customer_name} ${o.customer_phone}`.toLowerCase().includes(q))
  }, [orders, tab, query])

  async function change(o: Order, status: OrderStatus) {
    if (status === 'cancelado' && !(await confirm(`¿Cancelar el pedido ${o.code}? Las tallas vuelven al inventario.`, 'Sí, cancelar'))) return
    setBusy(o.id)
    try {
      await api.setOrderStatus(o.id, status)
      setData((prev) => prev?.map((x) => (x.id === o.id ? { ...x, status } : x)) ?? prev)
      setToast(status === 'cancelado' ? `${o.code} cancelado · stock devuelto` : `${o.code} → ${STATUS_LABEL[status]}`)
    } catch (e) {
      setToast(`No se pudo: ${errorMessage(e)}`)
    } finally {
      setBusy('')
    }
  }

  return (
    <>
      <PageTitle
        title="Pedidos"
        subtitle="Al llegar un pedido, sus tallas ya quedan apartadas. Si lo cancelas, vuelven al inventario."
        actions={
          <button type="button" className="a-btn" onClick={reload}>
            <Icon name="refresh" size={16} /> Actualizar
          </button>
        }
      />

      <div className="mb-4 flex flex-col gap-3">
        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0" role="group" aria-label="Filtrar por estado">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tab === t}
              onClick={() => setTab(t)}
              className={`flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold ${tab === t ? 'border-ink bg-ink text-white' : 'border-[#D6D6D2] bg-white'}`}
            >
              {t === 'todos' ? 'Todos' : STATUS_LABEL[t]}
              <span className={`text-xs ${tab === t ? 'text-soft' : 'text-[#8C8C8C]'}`}>{counts[t] ?? 0}</span>
            </button>
          ))}
        </div>
        <input className="a-field max-w-sm" type="search" placeholder="Buscar por código, nombre o teléfono" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar pedido" />
      </div>

      {loading && !orders && <div className="grid place-items-center py-16"><Spinner dark /></div>}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {orders && shown.length === 0 && (
        <div className="a-card p-6 text-sm text-[#5C5C5C]">{tab === 'pendiente' ? 'No hay pedidos por confirmar.' : 'No hay pedidos en esta lista.'}</div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {shown.map((o) => (
          <article key={o.id} className="a-card flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-bold">{o.code}</p>
                <p className="text-xs text-[#5C5C5C]">
                  {timeAgo(o.created_at)} · {new Date(o.created_at).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
              <StatusBadge status={o.status} />
            </div>

            <ul className="flex flex-col gap-1 rounded-xl bg-[#F7F7F5] p-3 text-sm">
              {o.items.map((i) => (
                <li key={i.id} className="flex justify-between gap-2">
                  <span>
                    {i.qty}× <b>{i.product_name}</b> · {i.size}
                    {i.dorsal && ` · ${i.dorsal}`}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-[#5C5C5C]">Cliente</dt>
              <dd className="font-semibold">{o.customer_name}</dd>
              <dt className="text-[#5C5C5C]">WhatsApp</dt>
              <dd>{o.customer_phone}</dd>
              <dt className="text-[#5C5C5C]">Entrega</dt>
              <dd>{o.delivery === 'pickup' ? 'Pickup' : `Delivery · ${o.address}`}</dd>
              <dt className="text-[#5C5C5C]">Pago</dt>
              <dd>
                <b>{orderTotal(o)}</b> · {o.payment_method}
              </dd>
              {cashAmountText(o) && (
                <>
                  <dt className="text-[#5C5C5C]">Paga con</dt>
                  <dd>{cashAmountText(o)}</dd>
                </>
              )}
            </dl>

            {changeDueText(o) && (
              <p className="rounded-lg bg-[#FFF1C2] px-3 py-2 text-xs font-bold text-[#5C4100]">Prepara {changeDueText(o)} de vuelto.</p>
            )}

            {o.status === 'pendiente' && settings && timeLeft(o.created_at, settings.reserve_hours) && (
              <p className="rounded-lg bg-[#FFF8E1] px-3 py-2 text-xs font-semibold text-[#5C4100]">
                Si no se confirma el pago, {timeLeft(o.created_at, settings.reserve_hours)} y las tallas vuelven a la tienda.
              </p>
            )}
            {o.notes && <p className="rounded-lg bg-[#F7F7F5] px-3 py-2 text-xs text-[#5C5C5C]">{o.notes}</p>}

            <div className="flex flex-wrap gap-2">
              {o.status === 'pendiente' && (
                <button type="button" disabled={busy === o.id} className="a-btn-dark flex-1" onClick={() => change(o, 'pagado')}>
                  <Icon name="check" size={16} /> Confirmar pago
                </button>
              )}
              {o.status === 'pagado' && (
                <button type="button" disabled={busy === o.id} className="a-btn-dark flex-1" onClick={() => change(o, 'entregado')}>
                  <Icon name="check" size={16} /> Marcar entregado
                </button>
              )}
              <a
                href={waLink(o.customer_phone, `Hola ${o.customer_name.split(' ')[0]}, te escribo de ${settings?.store_name ?? 'Trivela'} por tu pedido ${o.code}.`)}
                target="_blank"
                rel="noreferrer"
                className="a-btn"
              >
                <Icon name="wa" size={16} /> Escribirle
              </a>
              {(o.status === 'pendiente' || o.status === 'pagado') && (
                <button type="button" disabled={busy === o.id} className="a-btn text-[#7A2318]" onClick={() => change(o, 'cancelado')}>
                  Cancelar
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      <Toast text={toast} />
      {dialog}
    </>
  )
}
