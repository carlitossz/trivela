import { useMemo, useState } from 'react'
import { Icon, JerseyImage, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import { errorMessage, usd } from '../../lib/format'
import { useAsync } from '../../lib/store'
import type { Currency, Product } from '../../lib/types'
import { ErrorBox, PageTitle } from './shared'

const CURRENCY_LABEL: Record<Currency, string> = { USD: 'Dólares', COP: 'Pesos', BS: 'Bolívares' }

interface CartItem {
  variant_id: string
  product_name: string
  size: string
  dorsal: string
  image_url: string | null
  qty: number
}

export default function ExternalSale() {
  const { data: products, error, loading, reload } = useAsync(() => api.listProducts({ includeInactive: true }))
  const [search, setSearch] = useState('')
  const [openProductId, setOpenProductId] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])

  const [customerName, setCustomerName] = useState('')
  const [currency, setCurrency] = useState<Currency>('USD')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [notes, setNotes] = useState('')

  const [sending, setSending] = useState(false)
  const [formError, setFormError] = useState('')
  const [done, setDone] = useState<{ code: string } | null>(null)

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (products ?? []).filter((p) => !q || p.name.toLowerCase().includes(q))
  }, [products, search])

  function addToCart(p: Product, size: string, dorsal: string) {
    const v = p.variants.find((x) => x.size === size && x.dorsal === dorsal)
    if (!v) return
    setCart((c) => {
      const already = c.find((i) => i.variant_id === v.id)
      const inCartQty = already?.qty ?? 0
      if (inCartQty >= v.stock) return c
      if (already) return c.map((i) => (i.variant_id === v.id ? { ...i, qty: i.qty + 1 } : i))
      return [...c, { variant_id: v.id, product_name: p.name, size: v.size, dorsal: v.dorsal, image_url: p.image_url, qty: 1 }]
    })
  }

  function removeFromCart(variantId: string) {
    setCart((c) => c.filter((i) => i.variant_id !== variantId))
  }

  function bumpCart(variantId: string, delta: number) {
    setCart((c) => c.map((i) => (i.variant_id === variantId ? { ...i, qty: Math.max(1, i.qty + delta) } : i)).filter((i) => i.qty > 0))
  }

  async function submit() {
    if (!cart.length) return setFormError('Agrega al menos una franela a la venta.')
    setFormError('')
    setSending(true)
    try {
      const result = await api.createExternalSale({
        customer_name: customerName,
        currency,
        payment_method: paymentMethod,
        notes,
        items: cart.map((i) => ({ variant_id: i.variant_id, qty: i.qty }))
      })
      setDone({ code: result.code })
      setCart([])
      setCustomerName('')
      setPaymentMethod('')
      setNotes('')
      reload()
    } catch (e) {
      setFormError(errorMessage(e))
    } finally {
      setSending(false)
    }
  }

  function another() {
    setDone(null)
  }

  if (done) {
    return (
      <>
        <PageTitle title="Ventas externas" subtitle="Registra ventas que pasaron fuera de la app, para que descuenten stock y salgan en Reportes." />
        <div className="a-card flex flex-col items-start gap-3 p-6">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[#E7F5EA] text-[#1F7A3A]">
            <Icon name="check" size={22} />
          </span>
          <div>
            <p className="font-bold">Venta registrada como {done.code}</p>
            <p className="text-sm text-[#5C5C5C]">El stock ya quedó descontado y la venta va a salir en Reportes de una vez.</p>
          </div>
          <button type="button" className="a-btn-dark" onClick={another}>
            <Icon name="plus" size={16} /> Registrar otra venta
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <PageTitle title="Ventas externas" subtitle="Registra ventas que pasaron fuera de la app, para que descuenten stock y salgan en Reportes." />

      {loading && !products && (
        <div className="grid place-items-center py-16">
          <Spinner dark />
        </div>
      )}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {products && (
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <label className="a-label">
              Buscar franela
              <div className="relative">
                <input className="a-field pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre de la franela…" />
                <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C8C]" />
              </div>
            </label>

            <div className="flex flex-col gap-2">
              {shown.length === 0 && <p className="a-card p-4 text-sm text-[#5C5C5C]">No se encontró ninguna franela con ese nombre.</p>}
              {shown.map((p) => (
                <ProductPicker key={p.id} product={p} open={openProductId === p.id} onToggle={() => setOpenProductId((id) => (id === p.id ? null : p.id))} onAdd={addToCart} cart={cart} />
              ))}
            </div>
          </div>

          <div className="a-card flex w-full flex-col gap-4 p-4 lg:sticky lg:top-6 lg:w-[360px] lg:shrink-0">
            <h2 className="font-bold">Venta en curso</h2>

            {cart.length === 0 ? (
              <p className="text-sm text-[#5C5C5C]">Todavía no has agregado ninguna franela.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {cart.map((i) => (
                  <li key={i.variant_id} className="flex items-center gap-2 rounded-xl border border-[#EEEEEA] p-2">
                    <JerseyImage src={i.image_url} alt={i.product_name} className="h-10 w-10 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{i.product_name}</p>
                      <p className="text-xs text-[#5C5C5C]">
                        Talla {i.size}
                        {i.dorsal && ` · ${i.dorsal}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" aria-label="Restar" className="grid h-7 w-7 place-items-center rounded-full border border-[#D6D6D2]" onClick={() => bumpCart(i.variant_id, -1)}>
                        <Icon name="minus" size={12} />
                      </button>
                      <span className="w-5 text-center text-sm font-bold">{i.qty}</span>
                      <button type="button" aria-label="Sumar" className="grid h-7 w-7 place-items-center rounded-full border border-[#D6D6D2]" onClick={() => bumpCart(i.variant_id, 1)}>
                        <Icon name="plus" size={12} />
                      </button>
                    </div>
                    <button type="button" aria-label="Quitar" className="grid h-7 w-7 place-items-center rounded-full text-[#7A2318]" onClick={() => removeFromCart(i.variant_id)}>
                      <Icon name="trash" size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <label className="a-label">
              Cliente (opcional)
              <input className="a-field" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Ej. Gonzalo, o vacío si no aplica" />
            </label>
            <label className="a-label">
              Moneda en que se cobró
              <span className="relative">
                <select className="a-select" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
                  {(Object.keys(CURRENCY_LABEL) as Currency[]).map((c) => (
                    <option key={c} value={c}>
                      {CURRENCY_LABEL[c]}
                    </option>
                  ))}
                </select>
                <Icon name="chevron" size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C]" />
              </span>
            </label>
            <label className="a-label">
              Forma de pago (opcional)
              <input className="a-field" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} placeholder="Ej. Efectivo, Pago móvil…" />
            </label>
            <label className="a-label">
              Notas (opcional)
              <textarea className="a-field h-16 py-2" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej. vendida en el mercado del barrio" />
            </label>

            <p className="text-xs text-[#5C5C5C]">
              Los precios se toman del precio actual de cada franela. Esta venta queda guardada ya como <b>pagada</b> y descuenta el stock de una vez.
            </p>

            {formError && <p className="text-sm font-semibold text-[#7A2318]">{formError}</p>}

            <button type="button" className="a-btn-dark h-11" disabled={sending || cart.length === 0} onClick={submit}>
              {sending ? <Spinner /> : <Icon name="check" size={16} />} Registrar venta
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function ProductPicker({
  product: p,
  open,
  onToggle,
  onAdd,
  cart
}: {
  product: Product
  open: boolean
  onToggle: () => void
  onAdd: (p: Product, size: string, dorsal: string) => void
  cart: CartItem[]
}) {
  const [dorsal, setDorsal] = useState('')

  const dorsalOptions = ['', ...p.dorsals].filter((d) => p.variants.some((v) => v.dorsal === d && v.stock > 0))
  const sizesForDorsal = p.variants.filter((v) => v.dorsal === (dorsalOptions.includes(dorsal) ? dorsal : dorsalOptions[0] ?? ''))

  return (
    <div className="a-card overflow-hidden">
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 p-2.5 text-left">
        <JerseyImage src={p.image_url} alt={p.name} className="h-12 w-12 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{p.name}</p>
          <p className="text-xs text-[#5C5C5C]">{usd(p.price_usd)}</p>
        </div>
        <Icon name="chevron" size={16} className={`shrink-0 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="flex flex-col gap-3 border-t border-[#EEEEEA] p-3">
          {p.dorsals.length > 0 && dorsalOptions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {dorsalOptions.map((d) => (
                <button
                  key={d || '__blank__'}
                  type="button"
                  onClick={() => setDorsal(d)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold ${
                    (dorsalOptions.includes(dorsal) ? dorsal : dorsalOptions[0]) === d ? 'border-ink bg-ink text-white' : 'border-[#D6D6D2]'
                  }`}
                >
                  {d || 'Sin nombre/número'}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {sizesForDorsal.map((v) => {
              const inCart = cart.find((i) => i.variant_id === v.id)?.qty ?? 0
              const available = v.stock - inCart
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={available <= 0}
                  onClick={() => onAdd(p, v.size, v.dorsal)}
                  className="flex flex-col items-center gap-0.5 rounded-lg border border-[#D6D6D2] px-3 py-1.5 text-xs font-bold disabled:opacity-30"
                >
                  {v.size}
                  <span className="text-[10px] font-normal text-[#5C5C5C]">{available > 0 ? `${available} disp.` : 'Agotada'}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}