import { useCallback, useRef, useState, type ReactNode } from 'react'
import { STATUS_LABEL } from '../../lib/format'
import type { OrderStatus } from '../../lib/types'

export function PageTitle({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[26px] font-extrabold leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-[#5C5C5C]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  pendiente: 'bg-[#FFF1C2] text-[#5C4100]',
  pagado: 'bg-[#DCF5E5] text-[#0B5A31]',
  entregado: 'bg-[#EEEEEA] text-[#333]',
  cancelado: 'bg-[#FBE3DE] text-[#7A2318]'
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`whitespace-nowrap rounded-md px-2 py-1 text-xs font-bold ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E8B4A8] bg-[#FBE3DE] p-4 text-sm text-[#7A2318]">
      <span className="font-semibold">{message}</span>
      {onRetry && (
        <button type="button" className="a-btn h-9" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  )
}

/** Confirmación dentro de la app (sin ventanas del navegador) */
export function useConfirm() {
  const [ask, setAsk] = useState<{ text: string; ok: string } | null>(null)
  const resolver = useRef<(v: boolean) => void>()

  const confirm = useCallback((text: string, ok = 'Sí, continuar') => {
    setAsk({ text, ok })
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const close = (v: boolean) => {
    resolver.current?.(v)
    setAsk(null)
  }

  const dialog = ask ? (
    <div className="fixed inset-0 z-40 grid place-items-end bg-black/40 p-4 sm:place-items-center" onClick={() => close(false)}>
      <div role="alertdialog" aria-modal="true" aria-label={ask.text} className="w-full max-w-sm rounded-2xl bg-white p-5 text-ink shadow-xl" onClick={(e) => e.stopPropagation()}>
        <p className="text-[15px] font-semibold leading-snug">{ask.text}</p>
        <div className="mt-5 flex gap-2">
          <button type="button" className="a-btn flex-1" onClick={() => close(false)} autoFocus>
            No
          </button>
          <button type="button" className="a-btn-dark flex-1 bg-[#7A2318] hover:bg-[#5E1A12]" onClick={() => close(true)}>
            {ask.ok}
          </button>
        </div>
      </div>
    </div>
  ) : null

  return { confirm, dialog }
}

/** Mensaje corto que aparece y se va */
export function Toast({ text }: { text: string }) {
  if (!text) return null
  return (
    <div role="status" className="fixed bottom-20 left-1/2 z-30 -translate-x-1/2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-lg md:bottom-6">
      {text}
    </div>
  )
}
