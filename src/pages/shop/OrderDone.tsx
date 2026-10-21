import { Link, useLocation, useParams } from 'react-router-dom'
import { ShopShell } from '../../components/ShopLayout'
import { Icon, PaymentDetailsBox } from '../../components/ui'
import { hoursText } from '../../lib/format'
import { useSettings } from '../../lib/store'
import type { PaymentField } from '../../lib/types'
import { waLink } from '../../lib/whatsapp'
import { LAST_ORDER_KEY } from './Checkout'

interface Done {
  code: string
  message: string
  total: string
  paymentNote: string
  paymentFields: PaymentField[]
  paymentCash: boolean
  reserveHours?: number
}

function readDone(code: string, state: unknown): Done | null {
  if (state && typeof state === 'object' && (state as Done).code === code) return state as Done
  try {
    const d = JSON.parse(sessionStorage.getItem(LAST_ORDER_KEY) || 'null') as Done | null
    return d && d.code === code ? d : null
  } catch {
    return null
  }
}

export default function OrderDone() {
  const { code = '' } = useParams()
  const { state } = useLocation()
  const { settings } = useSettings()
  const done = readDone(code, state)

  return (
    <ShopShell>
      <main className="flex flex-col gap-5 px-5 pb-12 pt-4">
        <div className="flex flex-col items-start gap-3">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-wa text-ink">
            <Icon name="check" size={30} />
          </span>
          <h1 className="text-[26px] font-extrabold uppercase leading-tight">Tus franelas están apartadas</h1>
          <p className="text-[15px] text-soft">
            Pedido <span className="font-bold text-white">{code}</span>
            {done && (
              <>
                {' '}
                · Total <span className="font-bold text-white">{done.total}</span>
              </>
            )}
          </p>
        </div>

        {done ? (
          <>
            <div className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold">Último paso: envíanos el pedido por WhatsApp</span>
                <span className="text-[13px] text-soft">Ahí te confirmamos el pago y la entrega.</span>
              </div>
              <PaymentDetailsBox note={done.paymentNote} fields={done.paymentFields} cash={done.paymentCash} />
              {!!done.reserveHours && (
                <span className="text-[13px] font-semibold text-[#F2D27A]">
                  Tus franelas quedan apartadas por {hoursText(done.reserveHours)}. Si no se confirma el pago en ese tiempo, se liberan para otros clientes.
                </span>
              )}
            </div>
            <a href={waLink(settings?.whatsapp ?? '', done.message)} target="_blank" rel="noreferrer" className="btn-wa w-full">
              <Icon name="wa" size={22} /> Enviar pedido por WhatsApp
            </a>
            <details className="rounded-2xl border border-line bg-panel p-4 text-sm">
              <summary className="cursor-pointer font-semibold">Ver el mensaje</summary>
              <pre className="mt-3 whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-soft">{done.message}</pre>
            </details>
          </>
        ) : (
          <a href={waLink(settings?.whatsapp ?? '', `Hola, hice el pedido ${code}`)} target="_blank" rel="noreferrer" className="btn-wa w-full">
            <Icon name="wa" size={22} /> Escribir por WhatsApp
          </a>
        )}

        <Link to="/" className="text-center text-sm font-semibold text-soft underline">
          Volver al catálogo
        </Link>
      </main>
    </ShopShell>
  )
}
