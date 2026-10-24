import { useState, type ReactNode, type SVGProps } from 'react'
import { Link } from 'react-router-dom'
import { api, configError } from '../lib/api'

export function Logo({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <span className={`flex flex-col font-extrabold leading-[0.9] tracking-wide ${className}`} style={{ fontSize: size }}>
      <span className="flex items-center gap-[3px]">
        TRI
        <Ball width={size * 0.78} height={size * 0.78} />
      </span>
      <span>VELA</span>
    </span>
  )
}

/** Balón simple (círculo blanco + pentágono oscuro): fijo a blanco/negro para que se lea igual sobre fondo oscuro o claro */
function Ball(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="10" fill="#fff" stroke="#111" strokeWidth={1} />
      <path d="M12 6.2 15.9 9 14.4 13.6 9.6 13.6 8.1 9Z" fill="#111" />
    </svg>
  )
}

type IconName = 'back' | 'bag' | 'search' | 'wa' | 'plus' | 'minus' | 'trash' | 'check' | 'x' | 'home' | 'box' | 'shirt' | 'list' | 'gear' | 'out' | 'up' | 'edit' | 'refresh' | 'pin' | 'truck' | 'card' | 'chevron' | 'copy'

const PATHS: Record<IconName, ReactNode> = {
  back: <path d="M15 5l-7 7 7 7" />,
  bag: (
    <>
      <path d="M6 7h12l-1 13H7L6 7z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </>
  ),
  wa: (
    <>
      <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z" />
      <path d="M9 9.5c.5 2 2.5 4 4.5 4.5l1.2-1.2 2 .9c-.2 1.3-1.3 2-2.5 1.8C11 15 9 13 8.5 10.3 8.3 9 9 8 10.3 7.8l.9 2z" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  trash: (
    <>
      <path d="M4 7h16M10 11v6M14 11v6" />
      <path d="M6 7l1 13h10l1-13M9 7V4h6v3" />
    </>
  ),
  check: <path d="M5 12l5 5L20 7" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  home: <path d="M4 11l8-7 8 7v9H4z" />,
  box: (
    <>
      <path d="M3 7l9-4 9 4-9 4z" />
      <path d="M3 7v10l9 4 9-4V7" />
    </>
  ),
  shirt: <path d="M8 3L4 6l2 4 2-1v12h8V9l2 1 2-4-4-3c-.5 1.5-2 2.5-4 2.5S8.5 4.5 8 3z" />,
  list: <path d="M6 4h12v16l-3-2-3 2-3-2-3 2zM9 9h6M9 13h4" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" />
    </>
  ),
  out: <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />,
  up: (
    <>
      <path d="M12 15V3M7 8l5-5 5 5" />
      <path d="M4 15v5h16v-5" />
    </>
  ),
  edit: <path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4" />,
  refresh: <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" />,
  pin: (
    <>
      <path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18M7 15h4" />
    </>
  ),
  truck: (
    <>
      <path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" />
      <circle cx="7" cy="18" r="1.8" />
      <circle cx="17" cy="18" r="1.8" />
    </>
  ),
  chevron: <path d="M6 9l6 6 6-6" />,
  copy: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </>
  )
}

export function Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {PATHS[name]}
    </svg>
  )
}

export function Spinner({ dark = false }: { dark?: boolean }) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={`inline-block h-7 w-7 animate-spin rounded-full border-[3px] ${dark ? 'border-[#D6D6D2] border-t-ink' : 'border-line2 border-t-white'}`}
    />
  )
}

export function BackButton({ to, label = 'Volver' }: { to: string; label?: string }) {
  return (
    <Link to={to} aria-label={label} className="grid h-11 w-11 place-items-center rounded-full border border-line bg-panel text-white">
      <Icon name="back" />
    </Link>
  )
}

export function JerseyImage({ src, alt, className = '' }: { src: string | null; alt: string; className?: string }) {
  if (!src) {
    return (
      <div className={`grid place-items-center text-line2 ${className}`} aria-label={alt}>
        <Icon name="shirt" size={64} />
      </div>
    )
  }
  return <img src={src} alt={alt} loading="lazy" className={`object-contain ${className}`} />
}

/** Muestra los datos de un método de pago: una nota libre + renglones etiquetados, cada uno con botón de copiar solo si corresponde */
export function PaymentDetailsBox({ note, fields, cash }: { note: string; fields: { label: string; value: string; copyable: boolean }[]; cash: boolean }) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  if (!note && fields.length === 0) return null

  async function copy(value: string, i: number) {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      /* el navegador no dejó copiar; el texto sigue visible para copiarlo a mano */
    }
    setCopiedIdx(i)
    setTimeout(() => setCopiedIdx((c) => (c === i ? null : c)), 1500)
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-panel2 p-3">
      <span className="text-[11px] font-bold uppercase tracking-wide text-soft">Datos para pagar</span>
      {note && <p className="text-xs text-muted">{note}</p>}
      {fields.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {fields.map((f, i) =>
            f.copyable ? (
              <button
                key={i}
                type="button"
                onClick={() => copy(f.value, i)}
                className="flex items-center justify-between gap-2 rounded-lg border border-line2 bg-panel px-3 py-2 text-left"
              >
                <span className="truncate text-sm">
                  {f.label && <span className="text-muted">{f.label}: </span>}
                  <span className="font-semibold">{f.value}</span>
                </span>
                <span className={`flex shrink-0 items-center gap-1 text-[11px] font-bold ${copiedIdx === i ? 'text-wa' : 'text-soft'}`}>
                  <Icon name={copiedIdx === i ? 'check' : 'copy'} size={14} />
                  {copiedIdx === i ? 'Copiado' : 'Copiar'}
                </span>
              </button>
            ) : (
              <div key={i} className="rounded-lg px-3 py-1.5 text-sm">
                {f.label && <span className="text-muted">{f.label}: </span>}
                <span className="font-semibold">{f.value}</span>
              </div>
            )
          )}
        </div>
      )}
      {!cash && (
        <p className="flex items-start gap-1.5 rounded-lg bg-[#132B1C] px-3 py-2 text-[12px] font-semibold leading-snug text-[#7FDB9C]">
          <Icon name="wa" size={14} className="mt-0.5 shrink-0" />
          Después de pagar, envía la captura del comprobante por WhatsApp para que te confirmemos más rápido.
        </p>
      )}
    </div>
  )
}

export function DemoBanner({ light = false }: { light?: boolean }) {
  if (configError) {
    return <div className="bg-[#7A2318] px-4 py-2 text-center text-xs font-semibold text-white">{configError} Mientras tanto la app corre en modo prueba.</div>
  }
  if (api.mode !== 'demo') return null
  return (
    <div className={`px-4 py-1.5 text-center text-[11px] font-semibold ${light ? 'bg-[#FFF1C2] text-[#5C4100]' : 'bg-[#2A2410] text-[#F2D27A]'}`}>
      Versión de prueba · los datos se guardan solo en este navegador
    </div>
  )
}
