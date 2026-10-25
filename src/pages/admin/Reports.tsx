import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { Icon, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import { fmtFor, usd } from '../../lib/format'
import { useAsync } from '../../lib/store'
import type { Currency, Order, OrderItem } from '../../lib/types'
import { ErrorBox, PageTitle } from './shared'

const MONTH_LABEL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const CURRENCY_LABEL: Record<Currency, string> = { USD: 'Dólares', COP: 'Pesos', BS: 'Bolívares' }

/** "2026-05" a partir de una fecha ISO, en hora local */
function monthKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Cuánto costó esa línea del pedido, en la moneda real con la que se pagó el pedido */
function itemAmount(o: Order, i: OrderItem): { amount: number; currency: Currency } {
  if (o.currency === 'COP') return { amount: Math.round(i.unit_cop * i.qty), currency: 'COP' }
  if (o.currency === 'BS' && o.total_bs != null && o.total_usd > 0) {
    const usdSub = i.unit_usd * i.qty
    return { amount: Math.round(usdSub * (o.total_bs / o.total_usd) * 100) / 100, currency: 'BS' }
  }
  return { amount: Math.round(i.unit_usd * i.qty * 100) / 100, currency: 'USD' }
}

interface Row {
  code: string
  created_at: string
  product_name: string
  size: string
  dorsal: string
  badge: string
  qty: number
  customer: string
  amount: number
  currency: Currency
}

export default function Reports() {
  const { data: orders, error, loading, reload } = useAsync(() => api.listOrders())
  const { data: products } = useAsync(() => api.listProducts({ includeInactive: true }))
  const [month, setMonth] = useState(() => monthKey(new Date().toISOString()))

  const badgeByProduct = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of products ?? []) m.set(p.id, p.badge)
    return m
  }, [products])

  // Solo cuenta como venta real lo pagado o entregado; pendiente y cancelado no
  const sold = useMemo(
    () => (orders ?? []).filter((o) => (o.status === 'pagado' || o.status === 'entregado') && monthKey(o.created_at) === month),
    [orders, month]
  )

  const totalUsd = sold.reduce((a, o) => a + o.total_usd, 0)

  const rows: Row[] = useMemo(() => {
    const out: Row[] = []
    for (const o of sold) {
      for (const i of o.items) {
        const { amount, currency } = itemAmount(o, i)
        out.push({
          code: o.code,
          created_at: o.created_at,
          product_name: i.product_name,
          size: i.size,
          dorsal: i.dorsal,
          badge: (i.product_id && badgeByProduct.get(i.product_id)) || '',
          qty: i.qty,
          customer: o.customer_name,
          amount,
          currency
        })
      }
    }
    return out.sort((a, b) => a.created_at.localeCompare(b.created_at))
  }, [sold, badgeByProduct])

  const [y, m] = month.split('-')
  const monthLabel = `${MONTH_LABEL[Number(m) - 1]} ${y}`
  const monthLabelCap = monthLabel[0].toUpperCase() + monthLabel.slice(1)

  function download() {
    const resumen = [
      ['Mes', monthLabelCap],
      ['Pedidos vendidos (pagados o entregados)', sold.length],
      ['Total en dólares', Number(totalUsd.toFixed(2))]
    ]
    const detalle = [
      ['Pedido', 'Franela', 'Talla', 'Dorsal y jugador', 'Tipo', 'Cantidad', 'Cliente', 'Monto', 'Moneda'],
      ...rows.map((r) => [r.code, r.product_name, r.size, r.dorsal || 'Sin nombre/número', r.badge || '—', r.qty, r.customer, r.amount, CURRENCY_LABEL[r.currency]])
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumen), 'Resumen')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detalle), 'Detalle')
    XLSX.writeFile(wb, `Ventas ${monthLabelCap}.xlsx`)
  }

  return (
    <>
      <PageTitle title="Reportes" subtitle="Lo vendido de verdad: pedidos ya pagados o entregados, mes por mes, venta por venta." />

      <div className="mb-5 flex flex-wrap items-end gap-3">
        <label className="a-label">
          Mes
          <input className="a-field" type="month" value={month} onChange={(e) => setMonth(e.target.value)} max={monthKey(new Date().toISOString())} />
        </label>
        <button type="button" className="a-btn-dark h-11" onClick={download} disabled={!orders || sold.length === 0}>
          <Icon name="download" size={16} /> Descargar Excel
        </button>
      </div>

      {loading && !orders && (
        <div className="grid place-items-center py-16">
          <Spinner dark />
        </div>
      )}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {orders && (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            <div className="a-card flex flex-col gap-0.5 p-4">
              <span className="text-xs font-semibold text-[#5C5C5C]">Total vendido en {monthLabel}</span>
              <p className="text-2xl font-extrabold">{usd(totalUsd)}</p>
              <span className="text-xs text-[#5C5C5C]">Sumado en dólares; abajo sale cada venta en su moneda real.</span>
            </div>
            <div className="a-card flex flex-col gap-0.5 p-4">
              <span className="text-xs font-semibold text-[#5C5C5C]">Pedidos vendidos</span>
              <p className="text-2xl font-extrabold">{sold.length}</p>
              <span className="text-xs text-[#5C5C5C]">Pagados o entregados ese mes</span>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="a-card p-6 text-sm text-[#5C5C5C]">No hay ventas pagadas o entregadas en {monthLabel}.</div>
          ) : (
            <div className="a-card overflow-x-auto p-0">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-[#EEEEEA] text-left text-xs text-[#5C5C5C]">
                    <th className="px-4 py-3 font-semibold">Pedido</th>
                    <th className="px-4 py-3 font-semibold">Franela</th>
                    <th className="px-4 py-3 font-semibold">Talla</th>
                    <th className="px-4 py-3 font-semibold">Dorsal</th>
                    <th className="px-4 py-3 font-semibold">Tipo</th>
                    <th className="px-4 py-3 text-right font-semibold">Cant.</th>
                    <th className="px-4 py-3 font-semibold">Cliente</th>
                    <th className="px-4 py-3 text-right font-semibold">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b border-[#F3F3F0] last:border-0">
                      <td className="whitespace-nowrap px-4 py-2.5 text-[#5C5C5C]">{r.code}</td>
                      <td className="px-4 py-2.5 font-semibold">{r.product_name}</td>
                      <td className="px-4 py-2.5">{r.size}</td>
                      <td className="px-4 py-2.5 text-[#5C5C5C]">{r.dorsal || '—'}</td>
                      <td className="px-4 py-2.5 text-[#5C5C5C]">{r.badge || '—'}</td>
                      <td className="px-4 py-2.5 text-right font-bold">{r.qty}</td>
                      <td className="px-4 py-2.5">{r.customer}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right font-bold">{fmtFor[r.currency](r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  )
}