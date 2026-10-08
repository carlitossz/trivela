import { Link } from 'react-router-dom'
import { ShopShell } from '../../components/ShopLayout'
import { BackButton, Icon, JerseyImage } from '../../components/ui'
import { api } from '../../lib/api'
import { cop, usd } from '../../lib/format'
import { useAsync, useCart } from '../../lib/store'

export default function CartPage() {
  const cart = useCart()
  // Stock actual para no dejar pedir más de lo que hay
  const { data: products } = useAsync(() => api.listProducts(), [])
  const stockOf = (variantId: string) => {
    if (!products) return Infinity
    for (const p of products) {
      const v = p.variants.find((x) => x.id === variantId)
      if (v) return v.stock
    }
    return 0
  }
  const problems = cart.items.filter((i) => i.qty > stockOf(i.variant_id))

  return (
    <ShopShell header={false}>
      <header className="flex items-center gap-3 px-5 pb-2 pt-4">
        <BackButton to="/" label="Seguir viendo franelas" />
        <h1 className="text-[22px] font-extrabold uppercase">Tu carrito</h1>
      </header>

      {cart.items.length === 0 ? (
        <div className="flex flex-col items-start gap-3 px-5 py-10">
          <p className="text-lg font-bold">Tu carrito está vacío</p>
          <p className="text-sm text-soft">Elige una franela y tu talla para empezar.</p>
          <Link to="/" className="chip chip-on">
            Ver franelas
          </Link>
        </div>
      ) : (
        <>
          <main className="flex flex-col gap-3 px-5 pb-40 pt-2">
            {cart.items.map((i) => (
              <div key={i.variant_id} className="flex items-center gap-3 rounded-2xl border border-line bg-panel p-3">
                <Link to={`/franela/${i.product_id}`} className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-panel2">
                  <JerseyImage src={i.image_url} alt={i.name} className="h-14 w-full" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm font-bold">{i.name}</span>
                  <span className="text-xs text-muted">Talla {i.size}</span>
                  <span className="text-sm font-bold">{usd(i.price_usd * i.qty)}</span>
                  {i.qty > stockOf(i.variant_id) && (
                    <span className="text-xs font-semibold text-[#F2A07A]">
                      {stockOf(i.variant_id) === 0 ? 'Se agotó esta talla' : `Solo queda${stockOf(i.variant_id) === 1 ? '' : 'n'} ${stockOf(i.variant_id)}`}
                    </span>
                  )}
                </div>
                <div className="flex items-center rounded-xl border border-line2">
                  <button
                    type="button"
                    aria-label={i.qty === 1 ? `Quitar ${i.name}` : `Restar una ${i.name}`}
                    onClick={() => cart.setQty(i.variant_id, i.qty - 1)}
                    className="grid h-11 w-10 place-items-center text-soft"
                  >
                    <Icon name={i.qty === 1 ? 'trash' : 'minus'} size={18} />
                  </button>
                  <span className="w-5 text-center text-sm font-bold">{i.qty}</span>
                  <button
                    type="button"
                    aria-label={`Sumar una ${i.name}`}
                    onClick={() => cart.setQty(i.variant_id, i.qty + 1)}
                    disabled={i.qty >= stockOf(i.variant_id)}
                    className="grid h-11 w-10 place-items-center text-soft disabled:opacity-30"
                  >
                    <Icon name="plus" size={18} />
                  </button>
                </div>
              </div>
            ))}
            <Link to="/" className="self-start text-sm font-semibold text-soft underline">
              Agregar otra franela
            </Link>
          </main>

          <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-[#141414]">
            <div className="mx-auto flex max-w-[34rem] flex-col gap-3 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-soft">
                  {cart.count} {cart.count === 1 ? 'franela' : 'franelas'}
                </span>
                <span className="text-right">
                  <span className="text-[22px] font-extrabold">{usd(cart.totalUsd)}</span>
                  <span className="block text-xs text-soft">o {cop(cart.totalCop)}</span>
                </span>
              </div>
              {problems.length > 0 ? (
                <span className="btn-primary w-full bg-line text-center text-sm text-soft">Ajusta las tallas marcadas para continuar</span>
              ) : (
                <Link to="/pedido" className="btn-primary w-full">
                  Continuar con el pedido
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </ShopShell>
  )
}
