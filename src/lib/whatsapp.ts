import { cashAmountText, changeDueText, digits, money } from './format'
import type { Delivery, OrderResult } from './types'

interface MessageInput {
  storeName: string
  result: OrderResult
  items: { name: string; size: string; dorsal: string; qty: number }[]
  customerName: string
  customerPhone: string
  delivery: Delivery
  address: string
  paymentMethod: string
  /** Con cuánto dijo el cliente que va a pagar (solo métodos en efectivo), null si no aplica */
  cashAmount: number | null
}

export function orderMessage(m: MessageInput) {
  const o = { currency: m.result.currency, total_usd: m.result.total_usd, total_cop: m.result.total_cop, total_bs: m.result.total_bs, cash_amount: m.cashAmount }
  const paidWith = cashAmountText(o)
  const change = changeDueText(o)
  const lines = [
    `*Pedido ${m.result.code}* · ${m.storeName}`,
    '',
    ...m.items.map((i) => `${i.qty}× ${i.name} · Talla ${i.size}${i.dorsal ? ` · ${i.dorsal}` : ''}`),
    '',
    `Entrega: ${m.delivery === 'pickup' ? 'Pickup' : 'Delivery'}`,
    ...(m.delivery === 'delivery' && m.address ? [`Dirección: ${m.address}`] : []),
    `Pago: ${m.paymentMethod}`,
    `*Total: ${money(m.result.currency, { usd: m.result.total_usd, cop: m.result.total_cop, bs: m.result.total_bs })}*${m.delivery === 'delivery' ? ' + delivery' : ''}`,
    ...(paidWith ? [`Paga con: ${paidWith}${change ? ` (vuelto: ${change})` : ''}`] : []),
    '',
    `${m.customerName} · ${m.customerPhone}`
  ]
  return lines.join('\n')
}

export function waLink(phone: string, text: string) {
  const n = digits(phone)
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`
}
