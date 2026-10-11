import { useEffect, useState, type FormEvent } from 'react'
import { Icon, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import { resetDemo } from '../../lib/demoApi'
import { digits, errorMessage, hoursText } from '../../lib/format'
import { useSettings } from '../../lib/store'
import type { Currency, Settings } from '../../lib/types'
import { ErrorBox, PageTitle, Toast, useConfirm } from './shared'

const CURRENCY_LABEL: Record<Currency, string> = { USD: 'Dólares', COP: 'Pesos', BS: 'Bolívares' }

export default function SettingsPage() {
  const { settings, reload } = useSettings()
  const [form, setForm] = useState<Settings | null>(settings)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const { confirm, dialog } = useConfirm()

  useEffect(() => {
    if (settings && !form) setForm(settings)
  }, [settings, form])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2500)
    return () => clearTimeout(t)
  }, [toast])

  if (!form) return <div className="grid place-items-center py-20"><Spinner dark /></div>

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setForm((f) => (f ? { ...f, [k]: v } : f))
  const setMethod = (i: number, patch: Partial<Settings['payment_methods'][number]>) =>
    set(
      'payment_methods',
      form.payment_methods.map((m, j) => (j === i ? { ...m, ...patch } : m))
    )

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!form) return
    const methods = form.payment_methods.filter((m) => m.name.trim())
    if (!methods.some((m) => m.enabled)) return setError('Deja al menos un método de pago activo.')
    if (new Set(methods.map((m) => m.name.trim())).size !== methods.length) return setError('Hay dos métodos de pago con el mismo nombre.')
    setSaving(true)
    setError('')
    try {
      await api.saveSettings({ ...form, whatsapp: digits(form.whatsapp), payment_methods: methods.map((m) => ({ ...m, name: m.name.trim() })) })
      await reload()
      setToast('Ajustes guardados')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <PageTitle title="Ajustes" subtitle="Lo que ven los clientes al hacer su pedido." />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="a-card flex flex-col gap-3 p-4">
          <h2 className="font-bold">Tienda</h2>
          <label className="a-label">
            Nombre de la tienda
            <input className="a-field" value={form.store_name} onChange={(e) => set('store_name', e.target.value)} />
          </label>
          <label className="a-label">
            WhatsApp donde llegan los pedidos
            <input className="a-field" type="tel" inputMode="tel" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="573001234567" />
            <span className="font-normal text-[#5C5C5C]">Con código de país y sin espacios: 57 para Colombia, 58 para Venezuela.</span>
          </label>
          {!digits(form.whatsapp) && (
            <p className="rounded-xl bg-[#FFF1C2] px-3 py-2 text-xs font-semibold text-[#5C4100]">Falta el número: sin él, el cliente tiene que elegir a quién enviar el pedido.</p>
          )}
          <label className="a-label">
            Tasa del día (bolívares por 1 dólar)
            <input
              className="a-field"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={form.bs_rate ?? ''}
              onChange={(e) => set('bs_rate', e.target.value === '' ? null : Number(e.target.value))}
              placeholder="Vacío = se muestra el precio en $"
            />
          </label>
        </section>

        <section className="a-card flex flex-col gap-3 p-4">
          <h2 className="font-bold">Entrega y apartado</h2>
          <label className="a-label">
            Pickup: dónde y cuándo se retira
            <textarea className="a-field h-20 py-2" value={form.pickup_info} onChange={(e) => set('pickup_info', e.target.value)} />
          </label>
          <label className="a-label">
            Delivery: zonas y costo
            <textarea className="a-field h-20 py-2" value={form.delivery_info} onChange={(e) => set('delivery_info', e.target.value)} />
          </label>
          <label className="a-label">
            Horas que se apartan las franelas
            <input
              className="a-field"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={form.reserve_hours}
              onChange={(e) => set('reserve_hours', Math.max(0, Math.floor(Number(e.target.value) || 0)))}
            />
            <span className="font-normal text-[#5C5C5C]">
              {form.reserve_hours > 0
                ? `Si un pedido sigue "Por confirmar" después de ${hoursText(form.reserve_hours)}, se cancela solo y sus tallas vuelven a la tienda.`
                : 'Con 0, los pedidos sin pagar quedan apartados hasta que los canceles a mano.'}
            </span>
          </label>
        </section>

        <section className="a-card flex flex-col gap-3 p-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Métodos de pago</h2>
            <button
              type="button"
              className="a-btn h-9"
              onClick={() => set('payment_methods', [...form.payment_methods, { name: '', currency: 'USD', details: '', enabled: true }])}
            >
              <Icon name="plus" size={16} /> Agregar
            </button>
          </div>
          <div className="flex flex-col divide-y divide-[#EEEEEA]">
            {form.payment_methods.map((m, i) => (
              <div key={i} className="grid gap-2 py-3 sm:grid-cols-[auto_1fr_140px_2fr_auto] sm:items-center">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" className="h-5 w-5 accent-ink" checked={m.enabled} onChange={(e) => setMethod(i, { enabled: e.target.checked })} />
                  <span className="sm:sr-only">Activo</span>
                </label>
                <input className="a-field" aria-label="Nombre del método" value={m.name} onChange={(e) => setMethod(i, { name: e.target.value })} placeholder="Nombre" />
                <select className="a-field" aria-label="Moneda" value={m.currency} onChange={(e) => setMethod(i, { currency: e.target.value as Currency })}>
                  {(Object.keys(CURRENCY_LABEL) as Currency[]).map((c) => (
                    <option key={c} value={c}>
                      {CURRENCY_LABEL[c]}
                    </option>
                  ))}
                </select>
                <input className="a-field" aria-label="Instrucciones para el cliente" value={m.details} onChange={(e) => setMethod(i, { details: e.target.value })} placeholder="Lo que ve el cliente al elegirlo" />
                <button
                  type="button"
                  aria-label={`Quitar ${m.name || 'método'}`}
                  className="grid h-11 w-11 place-items-center rounded-xl border border-[#D6D6D2] text-[#7A2318]"
                  onClick={() => set('payment_methods', form.payment_methods.filter((_, j) => j !== i))}
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#5C5C5C]">La moneda define en qué se le muestra el total al cliente: dólares, pesos, o bolívares con la tasa del día.</p>
        </section>
      </div>

      {error && <div className="mt-4"><ErrorBox message={error} /></div>}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        {api.mode === 'demo' ? (
          <button
            type="button"
            className="a-btn text-[#7A2318]"
            onClick={async () => {
              if (await confirm('¿Borrar los pedidos de prueba y volver al catálogo inicial?', 'Sí, reiniciar')) {
                resetDemo()
                window.location.reload()
              }
            }}
          >
            Reiniciar datos de prueba
          </button>
        ) : (
          <span />
        )}
        <button type="submit" disabled={saving} className="a-btn-dark h-12 px-6 text-base">
          {saving ? 'Guardando…' : 'Guardar ajustes'}
        </button>
      </div>
      <Toast text={toast} />
      {dialog}
    </form>
  )
}
