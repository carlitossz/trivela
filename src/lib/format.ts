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

export const totalStock = (p: Product) => p.variants.reduce((a, v) => a + v.stock, 0)
export const sizesInStock = (p: Product) => p.variants.filter((v) => v.stock > 0).map((v) => v.size)

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

/** Solo dígitos, para wa.me */
export const digits = (s: string) => s.replace(/\D/g, '')

export function errorMessage(e: unknown) {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return 'Algo salió mal. Intenta de nuevo.'
}
