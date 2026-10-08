import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useCart, useSettings } from '../lib/store'
import { waLink } from '../lib/whatsapp'
import { DemoBanner, Icon, Logo } from './ui'

export function CartButton() {
  const { count } = useCart()
  return (
    <Link
      to="/carrito"
      aria-label={count ? `Ver carrito, ${count} franelas` : 'Ver carrito'}
      className="relative grid h-11 w-11 place-items-center rounded-xl border border-line bg-panel text-white"
    >
      <Icon name="bag" size={22} />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[11px] font-bold text-ink">{count}</span>
      )}
    </Link>
  )
}

export function WhatsAppFab() {
  const { settings } = useSettings()
  const href = waLink(settings?.whatsapp ?? '', `Hola ${settings?.store_name ?? 'Trivela'}, tengo una pregunta`)
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Escribir por WhatsApp"
      className="fixed bottom-5 right-4 z-20 grid h-14 w-14 place-items-center rounded-full bg-wa text-ink shadow-[0_6px_20px_rgba(0,0,0,0.5)] md:right-[max(1rem,calc(50%-15rem))]"
    >
      <Icon name="wa" size={26} />
    </a>
  )
}

/** Contenedor de la tienda: ancho de teléfono, centrado en pantallas grandes */
export function ShopShell({ children, header = true }: { children: ReactNode; header?: boolean }) {
  return (
    <div className="min-h-screen bg-ink">
      <DemoBanner />
      <div className="mx-auto min-h-screen max-w-[34rem]">
        {header && (
          <header className="sticky top-0 z-10 flex items-center justify-between bg-ink/95 px-5 pb-3 pt-4 backdrop-blur">
            <Link to="/" aria-label="Inicio">
              <Logo size={19} />
            </Link>
            <CartButton />
          </header>
        )}
        {children}
      </div>
    </div>
  )
}
