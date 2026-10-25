import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { Icon, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import { money } from '../../lib/format'
import { useAsync } from '../../lib/store'
import { ErrorBox, PageTitle } from './shared'

const MONTH_LABEL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** "2026-05" a partir de una fecha ISO, en hora local */
function monthKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function Reports() {
  const { data: orders, error, loading, reload } = useAsync(() => api.listOrders())
  const [month, setMonth] = useState(() => monthKey(new Date().toISOString()))

  // Solo cuenta como venta real lo pagado o entregado; pendiente y cancelado no
  const sold = useMemo(
    () => (orders ?? []).filter((o) => (o.status === 'pagado' || o.status === 'entregado') && monthKey(o.created_at) === month),
    [orders, month]
  )

  const totalUsd = sold.reduce((a, o) => a + o.total_usd, 0)
  const totalCop = sold.reduce((a, o) => a + o.total_cop, 0)

  const lines = useMemo(() => {
    const map = new Map<string, { name: string; size: string; dorsal: string; qty: number }>()
    for (const o of sold) {
      for (const i of o.items) {
        const key = `${i.product_name}\u0001${i.size}\u0001${i.dorsal}`
        const cur = map.get(key)
        if (cur) cur.qty += i.qty
        else map.set(key, { name: i.product_name, size: i.size, dorsal: i.dorsal, qty: i.qty })
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name) || a.size.localeCompare(b.size) || a.dorsal.localeCompare(b.dorsal))
  }, [sold])

  const [y, m] = month.split('-')
  const monthLabel = `${MONTH_LABEL[Number(m) - 1]} ${y}`
  const monthLabelCap = monthLabel[0].toUpperCase() + monthLabel.slice(1)

  function download() {
    const resumen = [
      ['Mes', monthLabelCap],
      ['Pedidos vendidos (pagados o entregados)', sold.length],
      ['Total en USD', Number(totalUsd.toFixed(2))],
      ['Total en COP', totalCop]
    ]
    const detalle = [['Franela', 'Talla', 'Dorsal', 'Cantidad vendida'], ...lines.map((l) => [l.name, l.size, l.dorsal || 'Sin nombre/número', l.qty])]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumen), 'Resumen')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detalle), 'Detalle')
    XLSX.writeFile(wb, `Ventas ${monthLabelCap}.xlsx`)
  }

  return (
    <>
      <PageTitle title="Reportes" subtitle="Lo vendido de verdad: pedidos ya pagados o entregados, mes por mes." />

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
              <p className="text-2xl font-extrabold">{money('USD', { usd: totalUsd, cop: totalCop, bs: null })}</p>
              <span className="text-xs text-[#5C5C5C]">o {money('COP', { usd: totalUsd, cop: totalCop, bs: null })}</span>
            </div>
            <div className="a-card flex flex-col gap-0.5 p-4">
              <span className="text-xs font-semibold text-[#5C5C5C]">Pedidos vendidos</span>
              <p className="text-2xl font-extrabold">{sold.length}</p>
              <span className="text-xs text-[#5C5C5C]">Pagados o entregados ese mes</span>
            </div>
          </div>

          {lines.length === 0 ? (
            <div className="a-card p-6 text-sm text-[#5C5C5C]">No hay ventas pagadas o entregadas en {monthLabel}.</div>
          ) : (
            <div className="a-card overflow-x-auto p-0">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-[#EEEEEA] text-left text-xs text-[#5C5C5C]">
                    <th className="px-4 py-3 font-semibold">Franela</th>
                    <th className="px-4 py-3 font-semibold">Talla</th>
                    <th className="px-4 py-3 font-semibold">Dorsal</th>
                    <th className="px-4 py-3 text-right font-semibold">Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={i} className="border-b border-[#F3F3F0] last:border-0">
                      <td className="px-4 py-2.5 font-semibold">{l.name}</td>
                      <td className="px-4 py-2.5">{l.size}</td>
                      <td className="px-4 py-2.5 text-[#5C5C5C]">{l.dorsal || '—'}</td>
                      <td className="px-4 py-2.5 text-right font-bold">{l.qty}</td>
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