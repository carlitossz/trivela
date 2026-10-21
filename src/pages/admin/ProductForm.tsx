import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Icon, JerseyImage, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import { errorMessage } from '../../lib/format'
import { BADGES, CATEGORIES, COLLECTIONS, KITS, SIZES, variantKey, type ProductInput } from '../../lib/types'
import { ErrorBox, PageTitle, useConfirm } from './shared'

const EMPTY: ProductInput = {
  name: '',
  category: 'Selección',
  kit: 'Local',
  collection: '',
  badge: 'Bordada',
  description: '',
  price_usd: 25,
  price_cop: 75000,
  image_url: null,
  active: true,
  dorsals: [],
  stock: Object.fromEntries(SIZES.map((s) => [s, 0]))
}

export default function ProductForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState<ProductInput | null>(id ? null : EMPTY)
  // "Colección" tiene opciones fijas + un espacio libre para una que no esté en la lista
  const [customCollection, setCustomCollection] = useState(false)
  const [newDorsal, setNewDorsal] = useState('')
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const { confirm, dialog } = useConfirm()

  useEffect(() => {
    if (!id) return
    api
      .getProduct(id)
      .then((p) => {
        if (!p) return setLoadError('Esa franela no existe')
        setForm({
          id: p.id,
          name: p.name,
          category: p.category,
          kit: p.kit,
          collection: p.collection,
          badge: p.badge,
          description: p.description,
          price_usd: p.price_usd,
          price_cop: p.price_cop,
          image_url: p.image_url,
          active: p.active,
          dorsals: p.dorsals,
          stock: Object.fromEntries(p.variants.map((v) => [variantKey(v.dorsal, v.size), v.stock]))
        })
        setCustomCollection(p.collection !== '' && !(COLLECTIONS as readonly string[]).includes(p.collection))
      })
      .catch((e) => setLoadError(errorMessage(e)))
  }, [id])

  if (loadError) return <ErrorBox message={loadError} />
  if (!form) return <div className="grid place-items-center py-20"><Spinner dark /></div>

  const set = <K extends keyof ProductInput>(k: K, v: ProductInput[K]) => setForm((f) => (f ? { ...f, [k]: v } : f))

  function addDorsal() {
    const d = newDorsal.trim()
    if (!d || form?.dorsals.includes(d)) return setNewDorsal('')
    set('dorsals', [...(form?.dorsals ?? []), d])
    setNewDorsal('')
  }
  function removeDorsal(d: string) {
    set('dorsals', (form?.dorsals ?? []).filter((x) => x !== d))
  }
  const setCell = (dorsal: string, size: string, v: string) =>
    setForm((f) => (f ? { ...f, stock: { ...f.stock, [variantKey(dorsal, size)]: Math.max(0, Math.floor(Number(v) || 0)) } } : f))

  async function onFile(file: File | undefined) {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      set('image_url', await api.uploadImage(file))
    } catch (e) {
      setError(`No se pudo subir la foto: ${errorMessage(e)}`)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!form) return
    if (!form.name.trim()) return setError('Ponle un nombre a la franela.')
    if (!(form.price_usd > 0) || !(form.price_cop > 0)) return setError('Revisa los precios.')
    setSaving(true)
    setError('')
    try {
      await api.saveProduct({ ...form, name: form.name.trim() })
      navigate('/admin/franelas')
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  async function remove() {
    if (!form?.id) return
    if (!(await confirm(`¿Borrar "${form.name}"? Si solo quieres que no salga en la tienda, mejor desmarca "Mostrar en la tienda".`, 'Sí, borrar'))) return
    try {
      await api.deleteProduct(form.id)
      navigate('/admin/franelas')
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <PageTitle
        title={id ? 'Editar franela' : 'Nueva franela'}
        actions={
          <Link to="/admin/franelas" className="a-btn">
            Volver
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <section className="a-card flex flex-col gap-3 p-4">
          <h2 className="font-bold">Foto</h2>
          <div className="grid h-72 place-items-center overflow-hidden rounded-xl bg-[#F0F0EC]">
            {uploading ? <Spinner dark /> : <JerseyImage src={form.image_url} alt="Foto de la franela" className="h-64 w-full" />}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" id="foto" onChange={(e) => onFile(e.target.files?.[0])} />
          <label htmlFor="foto" className="a-btn cursor-pointer">
            <Icon name="up" size={16} /> {form.image_url ? 'Cambiar foto' : 'Subir foto'}
          </label>
          <p className="text-xs text-[#5C5C5C]">Mejor una foto con fondo limpio, de frente. Se ve en el catálogo y en el detalle.</p>
        </section>

        <div className="flex flex-col gap-4">
          <section className="a-card grid gap-3 p-4 sm:grid-cols-2">
            <label className="a-label sm:col-span-2">
              Nombre
              <input className="a-field" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej. Argentina Visitante" />
            </label>
            <label className="a-label">
              Tipo
              <span className="relative">
                <select className="a-select" value={form.kit} onChange={(e) => set('kit', e.target.value)}>
                  {KITS.map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
                <Icon name="chevron" size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C]" />
              </span>
            </label>
            <label className="a-label">
              Categoría
              <span className="relative">
                <select className="a-select" value={form.category} onChange={(e) => set('category', e.target.value)}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <Icon name="chevron" size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C]" />
              </span>
            </label>
            <label className="a-label">
              Colección
              <span className="relative">
                <select
                  className="a-select"
                  value={customCollection ? '__otra__' : form.collection}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === '__otra__') {
                      setCustomCollection(true)
                      set('collection', '')
                    } else {
                      setCustomCollection(false)
                      set('collection', v)
                    }
                  }}
                >
                  <option value="" disabled>Elige una colección</option>
                  {COLLECTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="__otra__">Otra (escribir)…</option>
                </select>
                <Icon name="chevron" size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C]" />
              </span>
              {customCollection && (
                <input
                  className="a-field border-l-[3px] border-l-ink"
                  value={form.collection}
                  onChange={(e) => set('collection', e.target.value)}
                  placeholder="Escribe la colección"
                  autoFocus
                />
              )}
            </label>
            <label className="a-label">
              Etiqueta
              <span className="relative">
                <select className="a-select" value={form.badge} onChange={(e) => set('badge', e.target.value)}>
                  {BADGES.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <Icon name="chevron" size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C]" />
              </span>
            </label>
            <label className="a-label">
              Precio en dólares
              <input className="a-field" type="number" inputMode="decimal" min="0" step="0.5" value={form.price_usd} onChange={(e) => set('price_usd', Number(e.target.value))} />
            </label>
            <label className="a-label">
              Precio en pesos (COP)
              <input className="a-field" type="number" inputMode="numeric" min="0" step="1000" value={form.price_cop} onChange={(e) => set('price_cop', Number(e.target.value))} />
            </label>
            <label className="a-label sm:col-span-2">
              Descripción (opcional)
              <textarea className="a-field h-20 py-2" value={form.description} onChange={(e) => set('description', e.target.value)} />
            </label>
            <label className="flex items-center gap-3 text-sm font-semibold sm:col-span-2">
              <input type="checkbox" className="h-5 w-5 accent-ink" checked={form.active} onChange={(e) => set('active', e.target.checked)} />
              Mostrar en la tienda
            </label>
          </section>

          <section className="a-card flex flex-col gap-3 p-4">
            <h2 className="font-bold">Dorsales (opcional)</h2>
            <p className="text-xs text-[#5C5C5C]">
              Si esta franela se vende con nombre y número (ej. "Lamine Yamal 10"), agrégalos aquí. Al cliente solo le van a salir para elegir los que tengan stock; los
              demás quedan ocultos solos.
            </p>
            <div className="flex gap-2">
              <input
                className="a-field"
                value={newDorsal}
                onChange={(e) => setNewDorsal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addDorsal()
                  }
                }}
                placeholder="Ej. Lamine Yamal 10"
              />
              <button type="button" className="a-btn h-11 shrink-0" onClick={addDorsal}>
                <Icon name="plus" size={16} /> Agregar
              </button>
            </div>
            {form.dorsals.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.dorsals.map((d) => (
                  <span key={d} className="flex items-center gap-2 rounded-full border border-[#D6D6D2] bg-[#F7F7F4] py-1 pl-3 pr-1 text-sm font-semibold">
                    {d}
                    <button
                      type="button"
                      aria-label={`Quitar ${d}`}
                      className="grid h-6 w-6 place-items-center rounded-full text-[#7A2318] hover:bg-[#F0DAD6]"
                      onClick={() => removeDorsal(d)}
                    >
                      <Icon name="x" size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className="a-card flex flex-col gap-3 p-4">
            <h2 className="font-bold">{form.dorsals.length > 0 ? 'Stock por dorsal y talla' : 'Stock por talla'}</h2>
            {form.dorsals.length === 0 ? (
              <div className="grid grid-cols-5 gap-2">
                {SIZES.map((s) => (
                  <label key={s} className="a-label items-center text-center">
                    {s}
                    <input
                      className="a-field px-1 text-center text-base font-bold"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      value={form.stock[s] ?? 0}
                      onChange={(e) => setCell('', s, e.target.value)}
                    />
                  </label>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] border-separate border-spacing-y-1 text-sm">
                  <thead>
                    <tr className="text-left text-xs text-[#5C5C5C]">
                      <th className="px-2 font-semibold">Dorsal</th>
                      {SIZES.map((s) => (
                        <th key={s} className="px-1 text-center font-semibold">{s}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {['', ...form.dorsals].map((d) => (
                      <tr key={d || '__blank__'}>
                        <td className="whitespace-nowrap rounded-l-lg bg-[#F7F7F4] px-2 py-2 font-semibold">{d || 'Sin nombre/número'}</td>
                        {SIZES.map((s, i) => (
                          <td key={s} className={`bg-[#F7F7F4] px-1 py-1 ${i === SIZES.length - 1 ? 'rounded-r-lg' : ''}`}>
                            <input
                              className="a-field w-16 px-1 text-center text-base font-bold"
                              type="number"
                              inputMode="numeric"
                              min="0"
                              value={form.stock[variantKey(d, s)] ?? 0}
                              onChange={(e) => setCell(d, s, e.target.value)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {error && <ErrorBox message={error} />}

          <div className="flex flex-wrap items-center justify-between gap-2">
            {id ? (
              <button type="button" onClick={remove} className="a-btn text-[#7A2318]">
                <Icon name="trash" size={16} /> Borrar
              </button>
            ) : (
              <span />
            )}
            <button type="submit" disabled={saving || uploading} className="a-btn-dark h-12 px-6 text-base">
              {saving ? 'Guardando…' : 'Guardar franela'}
            </button>
          </div>
        </div>
      </div>
      {dialog}
    </form>
  )
}
