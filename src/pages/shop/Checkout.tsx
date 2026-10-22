import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ShopShell } from '../../components/ShopLayout'
import { BackButton, Icon, PaymentDetailsBox, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import { errorMessage, hoursText, money } from '../../lib/format'
import { useCart, useSettings } from '../../lib/store'
import type { Delivery } from '../../lib/types'
import { orderMessage } from '../../lib/whatsapp'

export const LAST_ORDER_KEY = 'trivela-last-order'

const CUSTOMER_KEY = 'trivela-customer'

function readCustomer() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOMER_KEY) || '{}') as { name?: string; phone?: string; address?: string }
  } catch {
    return {}
  }
}

export default function Checkout() {
  const cart = useCart()
  const { settings } = useSettings()
  const navigate = useNavigate()
  const saved = readCustomer()
  const [name, setName] = useState(saved.name ?? '')
  const [phone, setPhone] = useState(saved.phone ?? '')
  const [delivery, setDelivery] = useState<Delivery>('pickup')
  const [address, setAddress] = useState(saved.address ?? '')
  const [method, setMethod] = useState('')
  const [cashAmount, setCashAmount] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const detailsRef = useRef<HTMLDivElement>(null)

  // Al elegir un método, la pantalla se desliza sola hasta sus datos para que no pasen desapercibidos
  useEffect(() => {
    if (method) detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [method])

  // El aviso de error se quita apenas el cliente corrige algo
  useEffect(() => {
    setError('')
  }, [name, phone, delivery, address, method, cashAmount])

  if (cart.items.length === 0 && !sending) return <Navigate to="/carrito" replace />

  const methods = settings?.payment_methods.filter((m) => m.enabled) ?? []
  const selected = methods.find((m) => m.name === method)
  const bsTotal = settings?.bs_rate != null ? Math.round(cart.totalUsd * settings.bs_rate * 100) / 100 : null
  const total = money(selected?.currency ?? 'USD', { usd: cart.totalUsd, cop: cart.totalCop, bs: bsTotal })
  const totalInSelectedCurrency = selected?.currency === 'COP' ? cart.totalCop : selected?.currency === 'BS' ? (bsTotal ?? cart.totalUsd) : cart.totalUsd
  const cashAmountNum = cashAmount.trim() === '' ? null : Number(cashAmount)
  const changeDue = cashAmountNum != null && cashAmountNum >= totalInSelectedCurrency ? cashAmountNum - totalInSelectedCurrency : null

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim() || !phone.trim()) return setError('Escribe tu nombre y tu WhatsApp.')
    if (delivery === 'delivery' && !address.trim()) return setError('Escribe la dirección de entrega.')
    if (!selected) return setError('Elige cómo vas a pagar.')
    if (selected.cash && cashAmountNum != null && cashAmountNum < totalInSelectedCurrency) return setError('Ese monto no alcanza para cubrir el total.')

    const cashToSend = selected.cash ? cashAmountNum : null

    setSending(true)
    try {
      const result = await api.createOrder({
        customer_name: name,
        customer_phone: phone,
        delivery,
        address: delivery === 'delivery' ? address : '',
        payment_method: selected.name,
        items: cart.items.map((i) => ({ variant_id: i.variant_id, qty: i.qty })),
        cash_amount: cashToSend
      })
      const message = orderMessage({
        storeName: settings?.store_name ?? 'Trivela',
        result,
        items: cart.items.map((i) => ({ name: i.name, size: i.size, dorsal: i.dorsal, qty: i.qty })),
        customerName: name.trim(),
        customerPhone: phone.trim(),
        delivery,
        address: address.trim(),
        paymentMethod: selected.name,
        cashAmount: cashToSend
      })
      const done = {
        code: result.code,
        message,
        total: money(result.currency, { usd: result.total_usd, cop: result.total_cop, bs: result.total_bs }),
        paymentCash: selected.cash,
        reserveHours: settings?.reserve_hours ?? 0
      }
      try {
        localStorage.setItem(CUSTOMER_KEY, JSON.stringify({ name: name.trim(), phone: phone.trim(), address: address.trim() }))
        sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(done))
      } catch {
        /* sin almacenamiento */
      }
      cart.clear()
      navigate(`/pedido/${result.code}`, { replace: true, state: done })
    } catch (err) {
      setError(errorMessage(err))
      setSending(false)
    }
  }

  return (
    <ShopShell header={false}>
      <header className="flex items-center gap-3 px-5 pb-2 pt-4">
        <BackButton to="/carrito" label="Volver al carrito" />
        <h1 className="text-[22px] font-extrabold uppercase">Tu pedido</h1>
      </header>

      <form onSubmit={submit} className="flex flex-col gap-6 px-5 pb-44 pt-2" noValidate>
        <section className="rounded-2xl border border-line bg-panel px-4 py-1">
          {cart.items.map((i) => (
            <div key={i.variant_id} className="flex items-center justify-between gap-3 border-b border-[#262626] py-3 last:border-0">
              <span>
                <span className="text-sm font-bold">{i.qty}× {i.name}</span>
                <span className="text-xs text-muted">
                  {' '}· Talla {i.size}
                  {i.dorsal && ` · ${i.dorsal}`}
                </span>
              </span>
              <Link to="/carrito" className="text-xs font-semibold text-soft underline">
                Cambiar
              </Link>
            </div>
          ))}
        </section>

        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2.5 text-[16px] font-extrabold">¿Cómo la recibes?</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['pickup', 'Pickup', settings?.pickup_info || 'Retiras tú'],
                ['delivery', 'Delivery', settings?.delivery_info || 'Te la llevamos']
              ] as const
            ).map(([value, label, hint]) => (
              <label
                key={value}
                className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3 ${delivery === value ? 'border-2 border-white bg-white text-ink' : 'border-line2 bg-panel'}`}
              >
                <input type="radio" name="delivery" value={value} checked={delivery === value} onChange={() => setDelivery(value)} className="sr-only" />
                <span className="flex items-center gap-1.5 text-sm font-bold">
                  <Icon name={value === 'pickup' ? 'pin' : 'truck'} size={16} /> {label}
                </span>
                <span className={`text-xs leading-snug ${delivery === value ? 'text-[#4A4A4A]' : 'text-soft'}`}>{hint}</span>
              </label>
            ))}
          </div>
          {delivery === 'delivery' && (
            <label className="flex flex-col gap-1 text-xs font-semibold text-[#D4D4D4]">
              Dirección de entrega
              <input className="field" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Barrio, calle, punto de referencia" autoComplete="street-address" />
            </label>
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2.5 text-[16px] font-extrabold">Tus datos</legend>
          <label className="flex flex-col gap-1 text-xs font-semibold text-[#D4D4D4]">
            Nombre
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Tu nombre" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-[#D4D4D4]">
            WhatsApp
            <input className="field" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="+57 300 000 0000" />
          </label>
        </fieldset>

        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2.5 text-[16px] font-extrabold">Método de pago</legend>
          {!settings ? (
            <Spinner />
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {methods.map((m) => (
                <label
                  key={m.name}
                  className={`grid h-12 cursor-pointer place-items-center rounded-xl border px-1 text-center text-[13px] font-semibold leading-tight ${method === m.name ? 'border-2 border-white bg-white font-bold text-ink' : 'border-line2 bg-panel'}`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={m.name}
                    checked={method === m.name}
                    onChange={() => {
                      setMethod(m.name)
                      if (!m.cash) setCashAmount('')
                    }}
                    className="sr-only"
                  />
                  {m.name}
                </label>
              ))}
            </div>
          )}
          {selected && (
            <div key={method} ref={detailsRef} className="animate-reveal scroll-mt-4">
              {selected.cash ? (
                <div className="flex flex-col gap-2 rounded-xl border border-line bg-panel2 p-3">
                  <span className="text-sm font-bold">¿Vas a pagar con billete grande?</span>
                  <span className="text-xs text-muted">Escribe cuánto traes y te decimos el vuelto. Si pagas exacto, déjalo vacío.</span>
                  <input
                    className="field"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    placeholder={`Total: ${total}`}
                  />
                  {changeDue != null && (
                    <span className="rounded-lg bg-[#2A2410] px-3 py-2 text-sm font-bold text-[#F2D27A]">
                      Te devolvemos {money(selected.currency, { usd: changeDue, cop: changeDue, bs: changeDue })} de vuelto.
                    </span>
                  )}
                </div>
              ) : (
                <PaymentDetailsBox note={selected.note} fields={selected.fields} cash={selected.cash} />
              )}
            </div>
          )}
        </fieldset>

        {error && (
          <p role="alert" className="rounded-xl border border-[#7A2318] bg-[#2A1512] px-3 py-2.5 text-sm font-semibold text-[#F2B5A8]">
            {error}
          </p>
        )}

        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-[#141414]">
          <div className="mx-auto flex max-w-[34rem] flex-col gap-2.5 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-soft">
                {cart.count} {cart.count === 1 ? 'franela' : 'franelas'}
                {delivery === 'delivery' ? ' · delivery aparte' : ''}
              </span>
              <span className="text-[24px] font-extrabold">{total}</span>
            </div>
            <button type="submit" disabled={sending} className="btn-wa w-full">
              {sending ? <Spinner /> : <Icon name="check" />}
              {sending ? 'Apartando tus franelas…' : 'Confirmar pedido'}
            </button>
            {!!settings?.reserve_hours && (
              <p className="text-center text-[11px] text-muted">Te apartamos las franelas por {hoursText(settings.reserve_hours)} mientras confirmas el pago.</p>
            )}
          </div>
        </div>
      </form>
    </ShopShell>
  )
}