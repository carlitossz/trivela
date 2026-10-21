import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon, JerseyImage, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import { errorMessage, totalStock } from '../../lib/format'
import { useAsync } from '../../lib/store'
import type { Product } from '../../lib/types'
import { ErrorBox, PageTitle, Toast } from './shared'

export default function Inventory() {
  const { data: products, error, loading, reload, setData } = useAsync(() => api.listProducts({ includeInactive: true }))
  const [filter, setFilter] = useState<'todas' | 'ultima' | 'agotadas'>('todas')
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState('')
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2000)
    return () => clearTimeout(t)
  }, [toast])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (products ?? [])
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .filter((p) => (filter === 'ultima' ? p.variants.some((v) => v.stock === 1) : filter === 'agotadas' ? totalStock(p) === 0 : true))
  }, [products, filter, query])

  const total = (products ?? []).filter((p) => p.active).reduce((a, p) => a + totalStock(p), 0)

  // Cambia el número en pantalla al instante y guarda medio segundo después del último toque
  function bump(p: Product, variantId: string, delta: number) {
    const v = p.variants.find((x) => x.id === variantId)
    if (!v) return
    const next = Math.max(0, v.stock + delta)
    if (next === v.stock) return
    setData((prev) =>
      prev?.map((x) => (x.id === p.id ? { ...x, variants: x.variants.map((y) => (y.id === variantId ? { ...y, stock: next } : y)) } : x)) ?? prev
    )
    clearTimeout(timers.current[variantId])
    timers.current[variantId] = setTimeout(async () => {
      try {
        await api.setStock(variantId, next)
        setToast(`Guardado · ${p.name} ${v.size}${v.dorsal ? ` ${v.dorsal}` : ''}: ${next}`)
      } catch (e) {
        setToast(`No se guardó: ${errorMessage(e)}`)
        reload()
      }
    }, 500)
  }

  return (
    <>
      <PageTitle
        title="Inventario"
        subtitle={`${total} franelas en stock · toca + o − y se guarda solo`}
        actions={
          <Link to="/admin/franelas/nueva" className="a-btn-dark">
            <Icon name="plus" size={16} /> Nueva franela
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input className="a-field max-w-xs" type="search" placeholder="Buscar franela" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar franela" />
        {(
          [
            ['todas', 'Todas'],
            ['ultima', 'Última unidad'],
            ['agotadas', 'Agotadas']
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            aria-pressed={filter === k}
            onClick={() => setFilter(k)}
            className={`h-10 rounded-full border px-4 text-sm font-semibold ${filter === k ? 'border-ink bg-ink text-white' : 'border-[#D6D6D2] bg-white'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && !products && <div className="grid place-items-center py-16"><Spinner dark /></div>}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {products && shown.length === 0 && <div className="a-card p-6 text-sm text-[#5C5C5C]">No hay franelas en esta lista.</div>}

      <div className="grid gap-3 xl:grid-cols-2">
        {shown.map((p) => (
          <article key={p.id} className={`a-card flex flex-col gap-3 p-4 ${p.active ? '' : 'opacity-60'}`}>
            <div className="flex items-center gap-3">
              <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#F0F0EC]">
                <JerseyImage src={p.image_url} alt="" className="h-12 w-full" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{p.name}</p>
                <p className="text-xs text-[#5C5C5C]">
                  {[p.collection, p.kit].filter(Boolean).join(' · ')}
                  {!p.active && ' · Oculta en la tienda'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-extrabold leading-none">{totalStock(p)}</p>
                <p className="text-[11px] text-[#5C5C5C]">total</p>
              </div>
              <Link to={`/admin/franelas/${p.id}`} aria-label={`Editar ${p.name}`} className="grid h-10 w-10 place-items-center rounded-xl border border-[#D6D6D2]">
                <Icon name="edit" size={16} />
              </Link>
            </div>
            {p.dorsals.length === 0 ? (
              <VariantGrid product={p} variants={p.variants} bump={bump} />
            ) : (
              <div className="flex flex-col gap-2">
                {['', ...p.dorsals].map((d) => {
                  const group = p.variants.filter((v) => v.dorsal === d)
                  if (!group.length) return null
                  return (
                    <div key={d || '__blank__'} className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-[#5C5C5C]">{d || 'Sin nombre/número'}</span>
                      <VariantGrid product={p} variants={group} bump={bump} />
                    </div>
                  )
                })}
              </div>
            )}
          </article>
        ))}
      </div>
      <Toast text={toast} />
    </>
  )
}

function VariantGrid({ product, variants, bump }: { product: Product; variants: Product['variants']; bump: (p: Product, variantId: string, delta: number) => void }) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {variants.map((v) => (
        <div
          key={v.id}
          className={`flex flex-col items-center rounded-xl border pt-1.5 ${
            v.stock === 0 ? 'border-dashed border-[#BDBDB8] bg-[#F7F7F5]' : v.stock === 1 ? 'border-[#E3C766] bg-[#FFF1C2]' : 'border-[#D6D6D2] bg-white'
          }`}
        >
          <span className="text-[11px] font-semibold text-[#5C5C5C]">{v.size}</span>
          <span className={`text-lg font-extrabold leading-tight ${v.stock === 0 ? 'text-[#8C8C8C]' : ''}`}>{v.stock}</span>
          <div className="grid w-full grid-cols-2 border-t border-black/5">
            <button
              type="button"
              aria-label={`Restar una ${product.name} talla ${v.size}${v.dorsal ? ` ${v.dorsal}` : ''}`}
              onClick={() => bump(product, v.id, -1)}
              className="grid h-10 place-items-center text-[#5C5C5C] disabled:opacity-30"
              disabled={v.stock === 0}
            >
              <Icon name="minus" size={16} />
            </button>
            <button
              type="button"
              aria-label={`Sumar una ${product.name} talla ${v.size}${v.dorsal ? ` ${v.dorsal}` : ''}`}
              onClick={() => bump(product, v.id, 1)}
              className="grid h-10 place-items-center border-l border-black/5 text-ink"
            >
              <Icon name="plus" size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
