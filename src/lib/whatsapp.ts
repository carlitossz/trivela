import { digits, money } from './format'
import type { Delivery, OrderResult } from './types'

interface MessageInput {
  storeName: string
  result: OrderResult
  items: { name: string; size: string; qty: number }[]
  customerName: string
  customerPhone: string
  delivery: Delivery
  address: string
  paymentMethod: string
}

export function orderMessage(m: MessageInput) {
  const lines = [
    `*Pedido ${m.result.code}* · ${m.storeName}`,
    '',
    ...m.items.map((i) => `${i.qty}× ${i.name} · Talla ${i.size}`),
    '',
    `Entrega: ${m.delivery === 'pickup' ? 'Pickup' : 'Delivery'}`,
    ...(m.delivery === 'delivery' && m.address ? [`Dirección: ${m.address}`] : []),
    `Pago: ${m.paymentMethod}`,
    `*Total: ${money(m.result.currency, { usd: m.result.total_usd, cop: m.result.total_cop, bs: m.result.total_bs })}*${m.delivery === 'delivery' ? ' + delivery' : ''}`,
    '',
    `${m.customerName} · ${m.customerPhone}`
  ]
  return lines.join('\n')
}

export function waLink(phone: string, text: string) {
  const n = digits(phone)
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`
}
