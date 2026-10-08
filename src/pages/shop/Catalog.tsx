import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShopShell, WhatsAppFab } from '../../components/ShopLayout'
import { Icon, JerseyImage, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import { cop, sizesInStock, totalStock, usd } from '../../lib/format'
import { useAsync } from '../../lib/store'
import { SIZES, type Product } from '../../lib/types'

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function Catalog() {
  const { data: products, loading, error, reload } = useAsync(() => api.listProducts())
  const [query, setQuery] = useState('')
  const [kit, setKit] = useState('Todas')
  const [size, setSize] = useState('')

  const kits = useMemo(() => {
    const set = new Set((products ?? []).map((p) => p.kit).filter(Boolean))
    return ['Todas', ...Array.from(set)]
  }, [products])

  const shown = useMemo(() => {
    const q = norm(query.trim())
    return (products ?? [])
      .filter((p) => kit === 'Todas' || p.kit === kit)
      .filter((p) => !size || p.variants.some((v) => v.size === size && v.stock > 0))
      .filter((p) => !q || norm(`${p.name} ${p.category} ${p.kit} ${p.collection}`).includes(q))
      .sort((a, b) => Number(totalStock(b) > 0) - Number(totalStock(a) > 0))
  }, [products, kit, size, query])

  const featured = (products ?? []).find((p) => totalStock(p) > 0 && p.image_url)
  const collection = featured?.collection || 'Nuevas llegadas'
  const price = products?.[0]
  const samePrice = !!products?.length && products.every((p) => p.price_usd === price!.price_usd && p.price_cop === price!.price_cop)

  return (
    <ShopShell>
      <main className="flex flex-col gap-4 px-5 pb-28">
        <label className="flex h-12 items-center gap-2.5 rounded-xl border border-line bg-panel px-3.5 text-muted">
          <Icon name="search" size={18} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busca una selección o equipo"
            aria-label="Buscar franelas"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-muted"
          />
        </label>

        {featured && !query && (
          <section className="relative min-h-[190px] overflow-hidden rounded-[18px] border border-line bg-panel p-5">
            <div className="relative z-[1] flex max-w-[60%] flex-col gap-2.5">
              {featured.badge && (
                <span className="self-start rounded-md bg-white px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-ink">{featured.badge}</span>
              )}
              <h1 className="text-[28px] font-extrabold uppercase leading-[1.02]">{collection}</h1>
              {samePrice && (
                <p className="text-base font-bold">
                  {usd(price!.price_usd)} <span className="text-[13px] font-medium text-soft">· {cop(price!.price_cop)}</span>
                </p>
              )}
            </div>
            <img src={featured.image_url!} alt="" className="absolute -bottom-6 -right-3 w-[150px] -rotate-[8deg]" />
          </section>
        )}

        <div className="flex flex-col gap-2.5">
          {kits.length > 2 && (
            <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5" role="group" aria-label="Tipo de franela">
              {kits.map((k) => (
                <button key={k} type="button" aria-pressed={kit === k} onClick={() => setKit(k)} className={`chip ${kit === k ? 'chip-on' : ''}`}>
                  {k}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1.5" role="group" aria-label="Filtrar por talla">
            <span className="mr-0.5 text-xs text-muted">Mi talla</span>
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={size === s}
                onClick={() => setSize(size === s ? '' : s)}
                className={`h-9 min-w-11 rounded-[10px] border px-2 text-[13px] font-bold ${size === s ? 'border-white bg-white text-ink' : 'border-line2 text-white'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {loading && !products && (
          <div className="grid place-items-center py-16">
            <Spinner />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-start gap-2 rounded-2xl border border-line bg-panel p-4 text-sm">
            <span className="font-semibold">No pudimos cargar el catálogo.</span>
            <button type="button" className="chip" onClick={reload}>
              Reintentar
            </button>
          </div>
        )}

        {products && (
          <>
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-bold">{shown.filter((p) => totalStock(p) > 0).length} disponibles</h2>
              {(size || kit !== 'Todas' || query) && (
                <button
                  type="button"
                  className="text-xs font-semibold text-soft underline"
                  onClick={() => {
                    setSize('')
                    setKit('Todas')
                    setQuery('')
                  }}
                >
                  Quitar filtros
                </button>
              )}
            </div>

            {shown.length === 0 ? (
              <div className="flex flex-col gap-1.5 rounded-2xl border border-dashed border-line2 bg-panel p-5 text-sm">
                <span className="font-bold">{size ? `No hay franelas en talla ${size} ahora` : 'No encontramos esa franela'}</span>
                <span className="text-soft">Escríbenos por WhatsApp y te avisamos cuando llegue.</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {shown.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
      <WhatsAppFab />
    </ShopShell>
  )
}

function ProductCard({ product: p }: { product: Product }) {
  const sizes = sizesInStock(p)
  const soldOut = sizes.length === 0
  return (
    <Link to={`/franela/${p.id}`} className={`flex flex-col gap-2 rounded-2xl border border-line bg-panel p-2 pb-3 ${soldOut ? 'opacity-55' : ''}`}>
      <div className="relative grid h-[150px] place-items-center overflow-hidden rounded-[10px] bg-panel2">
        <JerseyImage src={p.image_url} alt={p.name} className="h-[136px] w-full" />
        {soldOut ? (
          <span className="absolute left-2 top-2 rounded-[5px] bg-ink px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-soft">AGOTADA</span>
        ) : (
          p.badge && <span className="absolute left-2 top-2 rounded-[5px] bg-ink px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">{p.badge}</span>
        )}
      </div>
      <div className="flex flex-col gap-1 px-1">
        <span className="text-[13px] font-bold leading-tight">{p.name}</span>
        {p.collection && <span className="text-[11px] text-muted">{p.collection}</span>}
        <span className="text-base font-bold">
          {usd(p.price_usd)} <span className="text-[11px] font-medium text-muted">{cop(p.price_cop)}</span>
        </span>
        <div className="flex flex-wrap gap-1">
          {sizes.map((s) => (
            <span key={s} className="grid h-[22px] min-w-[26px] place-items-center rounded-md border border-[#5A5A5A] px-1 text-[11px] font-bold">
              {s}
            </span>
          ))}
        </div>
      </div>
    </Link>
  )
}
