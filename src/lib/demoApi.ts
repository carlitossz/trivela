// Modo demo: todo se guarda en el navegador. Sirve para enseñar la app sin base de datos.
import type { Api, Order, OrderResult, Product, Settings } from './types'
import { SIZES, variantKey } from './types'

export const DEMO_PASSWORD = 'trivela2026'

const KEY = 'trivela-demo-v1'
const SESSION_KEY = 'trivela-demo-session'

interface DemoDb {
  settings: Settings
  products: Product[]
  orders: Order[]
  nextCode: number
}

const img = (file: string) => `${import.meta.env.BASE_URL}demo/${file}`

function seed(): DemoDb {
  const catalog: [string, string, string, string[]][] = [
    ['Argentina Visitante', 'Visitante', 'argentina-visitante.webp', ['XL', '2XL']],
    ['Colombia Visitante', 'Visitante', 'colombia-visitante.webp', ['XL']],
    ['Brasil Local', 'Local', 'brasil-local.webp', ['XL']],
    ['España Local', 'Local', 'espana-local.webp', ['L', '2XL']],
    ['Alemania Local', 'Local', 'alemania-local.webp', ['M']],
    ['Francia Local', 'Local', 'francia-local.webp', ['L']],
    ['Portugal Local', 'Local', 'portugal-local.webp', ['XL']]
  ]
  const now = Date.now()
  const products: Product[] = catalog.map(([name, kit, file, sizes], i) => {
    const id = `p${i + 1}`
    return {
      id,
      name,
      category: 'Selección',
      kit,
      collection: 'Mundial 2026',
      badge: 'Bordada',
      description: '',
      price_usd: 25,
      price_cop: 75000,
      image_url: img(file),
      active: true,
      created_at: new Date(now - i * 60000).toISOString(),
      dorsals: [],
      variants: SIZES.map((size) => ({ id: `${id}-${size}`, product_id: id, size, dorsal: '', stock: sizes.includes(size) ? 1 : 0 }))
    }
  })
  return {
    settings: {
      store_name: 'Trivela',
      whatsapp: '',
      bs_rate: null,
      reserve_hours: 24,
      pickup_info: 'Coordinamos el punto de entrega por WhatsApp.',
      delivery_info: 'El costo depende de la zona; te lo confirmamos por WhatsApp.',
      payment_methods: [
        { name: 'Efectivo $', currency: 'USD', note: 'Pagas en dólares al recibir.', fields: [], enabled: true, cash: true },
        { name: 'Efectivo pesos', currency: 'COP', note: 'Pagas en pesos al recibir.', fields: [], enabled: true, cash: true },
        {
          name: 'Bolívares',
          currency: 'BS',
          note: 'Pago Móvil a la tasa del día.',
          fields: [
            { label: 'Banco', value: 'Banesco', copyable: false },
            { label: 'Teléfono', value: '0414-1234567', copyable: true },
            { label: 'Cédula', value: 'V-12345678', copyable: true }
          ],
          enabled: true,
          cash: false
        },
        { name: 'Binance', currency: 'USD', note: '', fields: [{ label: 'ID Binance Pay', value: '123456789', copyable: true }], enabled: true, cash: false },
        {
          name: 'Bancolombia',
          currency: 'COP',
          note: '',
          fields: [
            { label: 'Banco', value: 'Bancolombia', copyable: false },
            { label: 'Número de cuenta', value: '000-000000-00', copyable: true },
            { label: 'Titular', value: 'Nombre del titular', copyable: false }
          ],
          enabled: true,
          cash: false
        },
        { name: 'Zinli', currency: 'USD', note: '', fields: [{ label: 'Correo', value: 'correo@ejemplo.com', copyable: true }], enabled: true, cash: false }
      ]
    },
    products,
    orders: [],
    nextCode: 1
  }
}

// Respaldo en memoria por si el navegador bloquea el almacenamiento
let memory: DemoDb | null = null
let memorySession = false

function load(): DemoDb {
  let db: DemoDb | null = null
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) db = JSON.parse(raw) as DemoDb
  } catch {
    /* sin almacenamiento */
  }
  if (!db) {
    if (!memory) memory = seed()
    db = memory
  }
  // Datos de prueba guardados antes de que existieran las horas de apartado
  if (db.settings.reserve_hours == null) db.settings.reserve_hours = 24
  return db
}

/** Igual que release_expired_orders() en la base de datos */
function releaseExpired(db: DemoDb) {
  const hours = db.settings.reserve_hours
  if (!hours) return 0
  const limit = Date.now() - hours * 3600_000
  let count = 0
  for (const o of db.orders) {
    if (o.status !== 'pendiente' || new Date(o.created_at).getTime() >= limit) continue
    for (const it of o.items) {
      const v = db.products.flatMap((p) => p.variants).find((x) => x.id === it.variant_id)
      if (v) v.stock += it.qty
    }
    o.status = 'cancelado'
    o.notes = `${o.notes} Liberado automáticamente: no se confirmó el pago en ${hours} h.`.trim()
    count += 1
  }
  if (count) save(db)
  return count
}

function loadFresh() {
  const db = load()
  releaseExpired(db)
  return db
}

function save(db: DemoDb) {
  memory = db
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch {
    /* sin almacenamiento */
  }
}

const wait = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), 120))
const uid = () => Math.random().toString(36).slice(2, 10)

export function createDemoApi(): Api {
  return {
    mode: 'demo',

    getSettings: () => wait(load().settings),

    listProducts: (opts) => {
      const all = loadFresh().products
      return wait(opts?.includeInactive ? all : all.filter((p) => p.active))
    },

    getProduct: (id) => wait(loadFresh().products.find((p) => p.id === id) ?? null),

    async createOrder(o) {
      const db = loadFresh()
      if (!o.customer_name.trim() || !o.customer_phone.trim()) throw new Error('Escribe tu nombre y tu WhatsApp')
      if (o.delivery === 'delivery' && !o.address.trim()) throw new Error('Escribe la dirección de entrega')
      if (!o.items.length) throw new Error('El carrito está vacío')
      const pm = db.settings.payment_methods.find((m) => m.name === o.payment_method && m.enabled)
      if (!pm) throw new Error('Ese método de pago no está disponible')
      if (o.cash_amount != null && !pm.cash) throw new Error('Ese método de pago no es en efectivo')

      const items: Order['items'] = []
      let tUsd = 0
      let tCop = 0
      for (const it of o.items) {
        const p = db.products.find((x) => x.variants.some((v) => v.id === it.variant_id))
        const v = p?.variants.find((x) => x.id === it.variant_id)
        if (!p || !v || !p.active) throw new Error('Una de las franelas ya no está disponible')
        if (v.stock < it.qty) throw new Error(`Ya no queda stock de ${p.name} talla ${v.size}${v.dorsal ? ` (${v.dorsal})` : ''}`)
      }
      for (const it of o.items) {
        const p = db.products.find((x) => x.variants.some((v) => v.id === it.variant_id))!
        const v = p.variants.find((x) => x.id === it.variant_id)!
        v.stock -= it.qty
        items.push({ id: uid(), product_id: p.id, variant_id: v.id, product_name: p.name, size: v.size, dorsal: v.dorsal, qty: it.qty, unit_usd: p.price_usd, unit_cop: p.price_cop })
        tUsd += p.price_usd * it.qty
        tCop += p.price_cop * it.qty
      }
      const code = `TV-${String(db.nextCode).padStart(4, '0')}`
      db.nextCode += 1
      const tBs = db.settings.bs_rate != null ? Math.round(tUsd * db.settings.bs_rate * 100) / 100 : null
      const total = pm.currency === 'COP' ? tCop : pm.currency === 'BS' ? (tBs ?? tUsd) : tUsd
      if (o.cash_amount != null && o.cash_amount < total) throw new Error('Ese monto no alcanza para pagar el total')
      db.orders.unshift({
        id: uid(),
        code,
        customer_name: o.customer_name.trim(),
        customer_phone: o.customer_phone.trim(),
        delivery: o.delivery,
        address: o.address.trim(),
        payment_method: o.payment_method,
        currency: pm.currency,
        total_usd: tUsd,
        total_cop: tCop,
        total_bs: tBs,
        cash_amount: o.cash_amount,
        status: 'pendiente',
        notes: '',
        created_at: new Date().toISOString(),
        items
      })
      save(db)
      const result: OrderResult = { code, total_usd: tUsd, total_cop: tCop, total_bs: tBs, currency: pm.currency }
      return wait(result)
    },

    async getSessionEmail() {
      try {
        return sessionStorage.getItem(SESSION_KEY) ? 'demo@trivela' : null
      } catch {
        return memorySession ? 'demo@trivela' : null
      }
    },

    async signIn(_email, password) {
      if (password !== DEMO_PASSWORD) throw new Error('Contraseña incorrecta')
      memorySession = true
      try {
        sessionStorage.setItem(SESSION_KEY, '1')
      } catch {
        /* sin almacenamiento */
      }
    },

    async signOut() {
      memorySession = false
      try {
        sessionStorage.removeItem(SESSION_KEY)
      } catch {
        /* sin almacenamiento */
      }
    },

    listOrders: () => wait(loadFresh().orders),

    pendingOrders: () =>
      wait(
        loadFresh()
          .orders.filter((o) => o.status === 'pendiente')
          .map(({ id, code, customer_name, currency, total_usd, total_cop, total_bs, created_at }) => ({ id, code, customer_name, currency, total_usd, total_cop, total_bs, created_at }))
      ),

    async setOrderStatus(orderId, status) {
      const db = load()
      const o = db.orders.find((x) => x.id === orderId)
      if (!o) throw new Error('Pedido no encontrado')
      if (o.status === 'cancelado') throw new Error('Un pedido cancelado no se puede reabrir; crea uno nuevo')
      if (status === 'cancelado') {
        for (const it of o.items) {
          const v = db.products.flatMap((p) => p.variants).find((x) => x.id === it.variant_id)
          if (v) v.stock += it.qty
        }
      }
      o.status = status
      save(db)
    },

    async setStock(variantId, stock) {
      const db = load()
      const v = db.products.flatMap((p) => p.variants).find((x) => x.id === variantId)
      if (v) v.stock = Math.max(0, stock)
      save(db)
    },

    async saveProduct(input) {
      const db = load()
      const { stock, id, ...fields } = input
      let p = id ? db.products.find((x) => x.id === id) : undefined
      if (!p) {
        const newId = `p${uid()}`
        p = { ...fields, id: newId, created_at: new Date().toISOString(), variants: [] }
        db.products.unshift(p)
      } else {
        Object.assign(p, fields)
      }
      const prod = p
      const allowed = ['', ...input.dorsals]
      prod.variants = allowed.flatMap((dorsal) =>
        SIZES.map((size) => {
          const existing = prod.variants.find((v) => v.size === size && v.dorsal === dorsal)
          return { id: existing?.id ?? `${prod.id}-${dorsal || 'base'}-${size}`, product_id: prod.id, size, dorsal, stock: Math.max(0, stock[variantKey(dorsal, size)] ?? 0) }
        })
      )
      save(db)
      return prod.id
    },

    async deleteProduct(id) {
      const db = load()
      db.products = db.products.filter((p) => p.id !== id)
      save(db)
    },

    uploadImage(file) {
      // En la demo la foto se guarda reducida dentro del navegador
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => reject(new Error('No se pudo leer la foto'))
        reader.onload = () => {
          const image = new Image()
          image.onerror = () => reject(new Error('Ese archivo no es una imagen'))
          image.onload = () => {
            const scale = Math.min(1, 600 / Math.max(image.width, image.height))
            const canvas = document.createElement('canvas')
            canvas.width = Math.round(image.width * scale)
            canvas.height = Math.round(image.height * scale)
            canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height)
            resolve(canvas.toDataURL('image/webp', 0.8))
          }
          image.src = String(reader.result)
        }
        reader.readAsDataURL(file)
      })
    },

    async saveSettings(s) {
      const db = load()
      db.settings = s
      save(db)
    }
  }
}

export function resetDemo() {
  memory = null
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* sin almacenamiento */
  }
}
