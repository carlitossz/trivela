import { Link } from 'react-router-dom'
import { Icon, JerseyImage, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import { cop, sizesInStock, usd } from '../../lib/format'
import { useAsync } from '../../lib/store'
import { ErrorBox, PageTitle } from './shared'

export default function Products() {
  const { data: products, error, loading, reload } = useAsync(() => api.listProducts({ includeInactive: true }))

  return (
    <>
      <PageTitle
        title="Franelas"
        subtitle="Agrega modelos nuevos, cambia fotos y precios, u ocúltalos de la tienda."
        actions={
          <Link to="/admin/franelas/nueva" className="a-btn-dark">
            <Icon name="plus" size={16} /> Nueva franela
          </Link>
        }
      />
      {loading && !products && <div className="grid place-items-center py-16"><Spinner dark /></div>}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {products && products.length === 0 && (
        <div className="a-card flex flex-col items-start gap-3 p-6 text-sm">
          <p>Todavía no hay franelas.</p>
          <Link to="/admin/franelas/nueva" className="a-btn-dark">
            Agregar la primera
          </Link>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {products?.map((p) => {
          const sizes = sizesInStock(p)
          return (
            <Link key={p.id} to={`/admin/franelas/${p.id}`} className="a-card flex flex-col gap-2 p-2.5 transition hover:border-[#BDBDB8]">
              <div className="relative grid h-36 place-items-center overflow-hidden rounded-xl bg-[#F0F0EC]">
                <JerseyImage src={p.image_url} alt={p.name} className="h-32 w-full" />
                {!p.active && <span className="absolute left-2 top-2 rounded-md bg-ink px-1.5 py-0.5 text-[10px] font-bold text-white">OCULTA</span>}
              </div>
              <div className="flex flex-col gap-0.5 px-1 pb-1">
                <span className="text-sm font-bold leading-tight">{p.name}</span>
                <span className="text-xs text-[#5C5C5C]">
                  {usd(p.price_usd)} · {cop(p.price_cop)}
                </span>
                <span className="text-xs text-[#5C5C5C]">{sizes.length ? `Tallas: ${sizes.join(', ')}` : 'Agotada'}</span>
                {p.dorsals.length > 0 && <span className="text-xs text-[#5C5C5C]">{p.dorsals.length} {p.dorsals.length === 1 ? 'dorsal' : 'dorsales'}</span>}
              </div>
            </Link>
          )
        })}
      </div>
    </>
  )
}
