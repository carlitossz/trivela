import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../../components/ui'
import { api } from '../../lib/api'
import { orderTotal } from '../../lib/format'
import type { PendingOrder } from '../../lib/types'

/** Cada cuánto se revisa si llegaron pedidos nuevos */
const CHECK_EVERY_MS = 15_000

type Permission = NotificationPermission | 'unsupported'

interface AlertsCtx {
  /** Pedidos por confirmar ahora mismo */
  pending: PendingOrder[]
  /** Sube en 1 cada vez que llega un pedido nuevo: las pantallas lo usan para recargarse */
  tick: number
  permission: Permission
  enableNotifications(): Promise<void>
}

const Ctx = createContext<AlertsCtx | null>(null)

export function useOrderAlerts() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useOrderAlerts fuera de OrderAlertsProvider')
  return c
}

// ---------- Sonido ----------
// Un "ding" de dos notas hecho con el navegador, sin archivos de audio.
let audio: AudioContext | null = null

function unlockAudio() {
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') void audio.resume()
  } catch {
    /* sin audio */
  }
}

function ding() {
  try {
    unlockAudio()
    if (!audio) return
    const now = audio.currentTime
    ;[880, 1320].forEach((freq, i) => {
      const osc = audio!.createOscillator()
      const gain = audio!.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = now + i * 0.16
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45)
      osc.connect(gain).connect(audio!.destination)
      osc.start(t)
      osc.stop(t + 0.5)
    })
  } catch {
    /* sin audio */
  }
}

function currentPermission(): Permission {
  return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
}

export function OrderAlertsProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [pending, setPending] = useState<PendingOrder[]>([])
  const [tick, setTick] = useState(0)
  const [toast, setToast] = useState<PendingOrder[]>([])
  const [permission, setPermission] = useState<Permission>(currentPermission)
  const seen = useRef<Set<string> | null>(null)

  const check = useCallback(async () => {
    let list: PendingOrder[]
    try {
      list = await api.pendingOrders()
    } catch {
      return // sin conexión: se intenta en la próxima vuelta
    }
    setPending(list)

    // La primera vez solo se memorizan los que ya había: no se avisa de pedidos viejos
    if (!seen.current) {
      seen.current = new Set(list.map((o) => o.id))
      return
    }
    const fresh = list.filter((o) => !seen.current!.has(o.id))
    if (!fresh.length) return
    fresh.forEach((o) => seen.current!.add(o.id))

    ding()
    setTick((t) => t + 1)
    setToast((prev) => [...fresh, ...prev].slice(0, 3))

    if (currentPermission() === 'granted') {
      for (const o of fresh) {
        try {
          const n = new Notification(`Nuevo pedido ${o.code}`, {
            body: `${o.customer_name} · ${orderTotal(o)}`,
            icon: `${import.meta.env.BASE_URL}icon-192.png`,
            tag: o.id
          })
          n.onclick = () => {
            window.focus()
            navigate('/admin/pedidos')
            n.close()
          }
        } catch {
          /* algunos teléfonos solo permiten notificaciones desde la app instalada */
        }
      }
    }
  }, [navigate])

  // Revisión periódica, y al volver a la pestaña
  useEffect(() => {
    void check()
    const t = setInterval(() => void check(), CHECK_EVERY_MS)
    const onVisible = () => document.visibilityState === 'visible' && void check()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [check])

  // El navegador solo deja sonar audio después de un toque en la página
  useEffect(() => {
    const unlock = () => unlockAudio()
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  // Contador en el título de la pestaña: "(2) Trivela · Panel"
  useEffect(() => {
    const before = document.title
    document.title = pending.length ? `(${pending.length}) Trivela · Panel` : 'Trivela · Panel'
    return () => {
      document.title = before
    }
  }, [pending.length])

  // El aviso en pantalla se va solo a los 12 segundos
  useEffect(() => {
    if (!toast.length) return
    const t = setTimeout(() => setToast([]), 12_000)
    return () => clearTimeout(t)
  }, [toast])

  const enableNotifications = useCallback(async () => {
    if (!('Notification' in window)) return
    unlockAudio()
    try {
      setPermission(await Notification.requestPermission())
    } catch {
      setPermission(currentPermission())
    }
  }, [])

  return (
    <Ctx.Provider value={{ pending, tick, permission, enableNotifications }}>
      {children}
      {toast.length > 0 && (
        <div role="status" aria-live="assertive" className="fixed inset-x-3 top-3 z-50 flex flex-col gap-2 md:left-auto md:right-6 md:top-6 md:w-96">
          {toast.map((o) => (
            <div key={o.id} className="flex items-center gap-3 rounded-2xl bg-ink p-3 pl-4 text-white shadow-2xl ring-1 ring-white/10">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-wa text-ink">
                <Icon name="bag" size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">Nuevo pedido {o.code}</p>
                <p className="truncate text-xs text-soft">
                  {o.customer_name} · {orderTotal(o)}
                </p>
              </div>
              <button
                type="button"
                className="h-9 rounded-lg bg-white px-3 text-xs font-bold text-ink"
                onClick={() => {
                  setToast([])
                  navigate('/admin/pedidos')
                }}
              >
                Ver
              </button>
              <button type="button" aria-label="Cerrar aviso" className="grid h-9 w-9 place-items-center rounded-lg text-soft" onClick={() => setToast((p) => p.filter((x) => x.id !== o.id))}>
                <Icon name="x" size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Ctx.Provider>
  )
}
