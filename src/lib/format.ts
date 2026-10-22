import type { Currency, Order, OrderStatus, Product } from './types'

const usdFmt = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 })
const copFmt = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const bsFmt = new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const usd = (n: number) => `$${usdFmt.format(n)}`
export const cop = (n: number) => `${copFmt.format(n)} COP`
export const bs = (n: number) => `Bs ${bsFmt.format(n)}`

/** Total mostrado en la moneda del método de pago */
export function money(currency: Currency, totals: { usd: number; cop: number; bs: number | null }) {
  if (currency === 'COP') return cop(totals.cop)
  if (currency === 'BS') return totals.bs != null ? bs(totals.bs) : `${usd(totals.usd)} en Bs`
  return usd(totals.usd)
}

export const orderTotal = (o: Pick<Order, 'currency' | 'total_usd' | 'total_cop' | 'total_bs'>) =>
  money(o.currency, { usd: o.total_usd, cop: o.total_cop, bs: o.total_bs })

const fmtFor: Record<Currency, (n: number) => string> = { USD: usd, COP: cop, BS: bs }

/** Lo que el cliente dijo que trae en efectivo, en la moneda del pedido (o null si no aplica) */
export function cashAmountText(o: Pick<Order, 'currency' | 'cash_amount'>) {
  return o.cash_amount == null ? null : fmtFor[o.currency](o.cash_amount)
}

/** Vuelto que hay que devolver, o null si paga exacto / no dio el monto */
export function changeDueText(o: Pick<Order, 'currency' | 'total_usd' | 'total_cop' | 'total_bs' | 'cash_amount'>) {
  if (o.cash_amount == null) return null
  const total = o.currency === 'COP' ? o.total_cop : o.currency === 'BS' ? (o.total_bs ?? o.total_usd) : o.total_usd
  const diff = Math.round((o.cash_amount - total) * 100) / 100
  return diff > 0 ? fmtFor[o.currency](diff) : null
}

export const totalStock = (p: Product) => p.variants.reduce((a, v) => a + v.stock, 0)
export const sizesInStock = (p: Product) => [...new Set(p.variants.filter((v) => v.stock > 0).map((v) => v.size))]
/** Dorsales (nombre y número) con al menos una unidad disponible en alguna talla */
export const dorsalsInStock = (p: Product) => [...new Set(p.variants.filter((v) => v.dorsal && v.stock > 0).map((v) => v.dorsal))]

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pendiente: 'Por confirmar',
  pagado: 'Pagado',
  entregado: 'Entregado',
  cancelado: 'Cancelado'
}

export function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'hace un momento'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  if (diff < 172800) return 'ayer'
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}

export const hoursText = (h: number) => (h === 1 ? '1 hora' : `${h} horas`)

/** Cuánto falta para que un pedido sin pagar se libere solo, en texto corto */
export function timeLeft(createdAt: string, hours: number) {
  if (!hours) return null
  const ms = new Date(createdAt).getTime() + hours * 3600_000 - Date.now()
  if (ms <= 0) return 'se libera en cualquier momento'
  const h = Math.floor(ms / 3600_000)
  const m = Math.floor((ms % 3600_000) / 60_000)
  if (h >= 1) return `se libera en ${h} h${m ? ` ${m} min` : ''}`
  return `se libera en ${Math.max(1, m)} min`
}

/** Solo dígitos, para wa.me */
export const digits = (s: string) => s.replace(/\D/g, '')

export function errorMessage(e: unknown) {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return 'Algo salió mal. Intenta de nuevo.'
}
