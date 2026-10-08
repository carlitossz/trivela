import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CartButton, ShopShell } from '../../components/ShopLayout'
import { BackButton, Icon, JerseyImage, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import { cop, usd } from '../../lib/format'
import { useAsync, useCart, useSettings } from '../../lib/store'
import { waLink } from '../../lib/whatsapp'

export default function ProductDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data: p, loading } = useAsync(() => api.getProduct(id), [id])
  const { settings } = useSettings()
  const cart = useCart()
  const [picked, setPicked] = useState('')

  useEffect(() => {
    if (p && !picked) {
      const first = p.variants.find((v) => v.stock > 0)
      if (first) setPicked(first.size)
    }
  }, [p, picked])

  if (loading && !p) {
    return (
      <ShopShell header={false}>
        <div className="grid min-h-screen place-items-center">
          <Spinner />
        </div>
      </ShopShell>
    )
  }

  if (!p || !p.active) {
    return (
      <ShopShell>
        <div className="flex flex-col items-start gap-3 px-5 py-10">
          <h1 className="text-xl font-bold">Esta franela ya no está disponible</h1>
          <Link to="/" className="chip chip-on">
            Ver el catálogo
          </Link>
        </div>
      </ShopShell>
    )
  }

  const variant = p.variants.find((v) => v.size === picked)
  const inCart = cart.items.find((i) => i.variant_id === variant?.id)?.qty ?? 0
  const available = variant ? variant.stock - inCart : 0
  const soldOut = p.variants.every((v) => v.stock === 0)

  function addToCart() {
    if (!variant || available <= 0) return
    cart.add({ variant_id: variant.id, product_id: p!.id, name: p!.name, size: variant.size, image_url: p!.image_url, price_usd: p!.price_usd, price_cop: p!.price_cop })
    navigate('/carrito')
  }

  const askText = `Hola, ¿les va a llegar la ${p.name}${picked ? ` en talla ${picked}` : ''}?`

  return (
    <ShopShell header={false}>
      <div className="relative grid h-[360px] place-items-center overflow-hidden bg-panel">
        <span aria-hidden="true" className="absolute select-none text-center text-[120px] font-extrabold leading-[0.85] text-[#232323]">
          TRI
          <br />
          VELA
        </span>
        <JerseyImage src={p.image_url} alt={p.name} className="relative h-[310px] w-full" />
        <div className="absolute left-4 right-4 top-4 flex justify-between">
          <BackButton to="/" label="Volver al catálogo" />
          <CartButton />
        </div>
      </div>

      <main className="flex flex-col gap-5 px-5 pb-36 pt-5">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap gap-1.5">
            {p.badge && <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-ink">{p.badge}</span>}
            {p.collection && <span className="rounded-md border border-line2 px-2 py-0.5 text-[11px] font-semibold text-soft">{p.collection}</span>}
          </div>
          <h1 className="text-[28px] font-extrabold uppercase leading-tight">{p.name}</h1>
          <p className="flex items-baseline gap-2.5">
            <span className="text-[28px] font-extrabold">{usd(p.price_usd)}</span>
            <span className="text-[15px] font-medium text-soft">o {cop(p.price_cop)}</span>
          </p>
          {p.description && <p className="text-sm leading-relaxed text-soft">{p.description}</p>}
        </div>

        <section className="flex flex-col gap-2.5">
          <h2 className="text-[15px] font-bold">Talla</h2>
          <div role="radiogroup" aria-label="Talla" className="grid grid-cols-5 gap-2">
            {p.variants.map((v) => {
              const out = v.stock === 0
              const on = v.size === picked
              return (
                <button
                  key={v.size}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setPicked(v.size)}
                  className={`flex h-[54px] flex-col items-center justify-center rounded-xl text-[15px] font-bold ${
                    on && !out
                      ? 'border-2 border-white bg-white text-ink'
                      : out
                        ? `border border-dashed ${on ? 'border-soft' : 'border-line2'} text-[#7A7A7A]`
                        : 'border border-[#5A5A5A] text-white'
                  }`}
                >
                  <span className={out ? 'line-through' : ''}>{v.size}</span>
                  <span className={`text-[10px] font-semibold ${on && !out ? 'text-[#4A4A4A]' : 'text-soft'}`}>
                    {out ? 'Agotada' : v.stock === 1 ? 'Última' : 'Disponible'}
                  </span>
                </button>
              )
            })}
          </div>
          {variant && variant.stock > 0 && inCart > 0 && (
            <p className="text-xs text-soft">
              Ya tienes {inCart} en el carrito{available <= 0 ? ' · no quedan más en esta talla' : ''}.
            </p>
          )}
        </section>

        {variant && variant.stock === 0 && (
          <div className="flex flex-col gap-3 rounded-2xl border border-line2 bg-panel p-4">
            <span className="text-sm font-bold">No tenemos la {picked} ahora</span>
            <span className="text-[13px] text-soft">Escríbenos y te avisamos apenas llegue.</span>
            <a href={waLink(settings?.whatsapp ?? '', askText)} target="_blank" rel="noreferrer" className="btn-wa h-12 text-sm">
              <Icon name="wa" /> Preguntar por WhatsApp
            </a>
          </div>
        )}

        {settings && (
          <section className="flex flex-col gap-2.5">
            <h2 className="text-[15px] font-bold">Entrega</h2>
            <div className="grid grid-cols-2 gap-2 text-[13px]">
              <div className="flex flex-col gap-0.5 rounded-xl border border-line bg-panel p-3">
                <span className="flex items-center gap-1.5 font-bold">
                  <Icon name="pin" size={16} /> Pickup
                </span>
                <span className="text-soft">{settings.pickup_info || 'Retiras tú.'}</span>
              </div>
              <div className="flex flex-col gap-0.5 rounded-xl border border-line bg-panel p-3">
                <span className="flex items-center gap-1.5 font-bold">
                  <Icon name="truck" size={16} /> Delivery
                </span>
                <span className="text-soft">{settings.delivery_info || 'Te la llevamos.'}</span>
              </div>
            </div>
            <p className="text-[13px] leading-relaxed text-soft">
              Pagas con {settings.payment_methods.filter((m) => m.enabled).map((m) => m.name).join(', ')}.
            </p>
          </section>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-[#141414]">
        <div className="mx-auto max-w-[34rem] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3.5">
          {soldOut ? (
            <span className="btn-primary w-full bg-line text-muted">Agotada en todas las tallas</span>
          ) : variant && variant.stock > 0 && available > 0 ? (
            <button type="button" onClick={addToCart} className="btn-primary w-full">
              Agregar talla {picked} · {usd(p.price_usd)}
            </button>
          ) : variant && variant.stock > 0 ? (
            <Link to="/carrito" className="btn-primary w-full">
              Ir al carrito
            </Link>
          ) : (
            <span className="btn-primary w-full bg-line text-muted">Elige una talla disponible</span>
          )}
        </div>
      </div>
    </ShopShell>
  )
}
