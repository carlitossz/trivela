import type { ReactNode, SVGProps } from 'react'
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

function Ball(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 7l4 3-1.5 4.5h-5L8 10z" fill="currentColor" />
      <path d="M12 2v5M16 10l5-2M14.5 14.5l3 5M9.5 14.5l-3 5M8 10L3 8" />
    </svg>
  )
}

type IconName = 'back' | 'bag' | 'search' | 'wa' | 'plus' | 'minus' | 'trash' | 'check' | 'x' | 'home' | 'box' | 'shirt' | 'list' | 'gear' | 'out' | 'up' | 'edit' | 'refresh' | 'pin' | 'truck'

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
  truck: (
    <>
      <path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" />
      <circle cx="7" cy="18" r="1.8" />
      <circle cx="17" cy="18" r="1.8" />
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
