export const SIZES = ['S', 'M', 'L', 'XL', '2XL'] as const

/** Opciones fijas para la ficha de la franela (panel admin) */
export const KITS = ['Local', 'Visitante', 'Alternativa', 'Cuarta Equipación', 'Especial / Conmemorativa', 'Equipación Portero', 'Entrenamiento'] as const
export const CATEGORIES = ['Club', 'Selección'] as const
export const COLLECTIONS = ['Champions League', 'Europa League', 'Conference League', 'Copa Libertadores', 'Copa Sudamericana', 'Liga', 'Mundial'] as const
export const BADGES = ['Bordada', 'Termosellada', 'Parche de goma / silicona'] as const

export type Currency = 'USD' | 'COP' | 'BS'

export interface Variant {
  id: string
  product_id: string
  size: string
  /** Dorsal (nombre y número) de esta unidad. '' = sin dorsal / en blanco */
  dorsal: string
  stock: number
}

export interface Product {
  id: string
  name: string
  category: string
  kit: string
  collection: string
  badge: string
  description: string
  price_usd: number
  price_cop: number
  image_url: string | null
  active: boolean
  created_at: string
  /** Dorsales que se pueden elegir en esta franela (ej. "Lamine Yamal 10"). Vacío = no aplica */
  dorsals: string[]
  variants: Variant[]
}

/** Clave para guardar/leer el stock de una combinación talla+dorsal en ProductInput.stock */
export const variantKey = (dorsal: string, size: string) => (dorsal ? `${dorsal}\u0001${size}` : size)

export interface PaymentField {
  /** Ej. "Banco", "Teléfono", "Cédula" */
  label: string
  value: string
  /** Si debe salirle al cliente con botón de copiar (ej. teléfono, cuenta) o solo como texto (ej. nombre del banco) */
  copyable: boolean
}

export interface PaymentMethod {
  name: string
  currency: Currency
  /** Texto corto, no copiable, ej. "Pago Móvil a la tasa del día" */
  note: string
  /** Datos estructurados que ve el cliente, cada uno con su propia etiqueta y si es copiable */
  fields: PaymentField[]
  enabled: boolean
  /** Es pago en efectivo en mano: el cliente puede decir con qué billete paga para que le preparen el vuelto */
  cash: boolean
}

export interface Settings {
  store_name: string
  whatsapp: string
  bs_rate: number | null
  pickup_info: string
  delivery_info: string
  payment_methods: PaymentMethod[]
  /** Horas que un pedido sin pagar mantiene apartadas sus tallas. 0 = no se libera solo */
  reserve_hours: number
}

export type OrderStatus = 'pendiente' | 'pagado' | 'entregado' | 'cancelado'
export type Delivery = 'pickup' | 'delivery'

export interface OrderItem {
  id: string
  product_id: string | null
  variant_id: string | null
  product_name: string
  size: string
  /** Dorsal pedido, copiado al momento de la compra. '' = sin dorsal */
  dorsal: string
  qty: number
  unit_usd: number
  unit_cop: number
}

export interface Order {
  id: string
  code: string
  customer_name: string
  customer_phone: string
  delivery: Delivery
  address: string
  payment_method: string
  currency: Currency
  total_usd: number
  total_cop: number
  total_bs: number | null
  cash_amount: number | null
  status: OrderStatus
  notes: string
  created_at: string
  items: OrderItem[]
}

export type PendingOrder = Pick<Order, 'id' | 'code' | 'customer_name' | 'currency' | 'total_usd' | 'total_cop' | 'total_bs' | 'created_at'>

export interface NewOrder {
  customer_name: string
  customer_phone: string
  delivery: Delivery
  address: string
  payment_method: string
  items: { variant_id: string; qty: number }[]
  /** Con cuánto va a pagar el cliente (solo métodos en efectivo), para calcular el vuelto. null = paga exacto o no aplica */
  cash_amount: number | null
}

export interface OrderResult {
  code: string
  total_usd: number
  total_cop: number
  total_bs: number | null
  currency: Currency
}

/** Datos para crear o editar una franela desde el panel */
export interface ProductInput {
  id?: string
  name: string
  category: string
  kit: string
  collection: string
  badge: string
  description: string
  price_usd: number
  price_cop: number
  image_url: string | null
  active: boolean
  dorsals: string[]
  /** Stock por combinación. Clave: variantKey(dorsal, size) */
  stock: Record<string, number>
}

export interface Api {
  mode: 'supabase' | 'demo'
  getSettings(): Promise<Settings>
  listProducts(opts?: { includeInactive?: boolean }): Promise<Product[]>
  getProduct(id: string): Promise<Product | null>
  createOrder(order: NewOrder): Promise<OrderResult>
  // Admin
  getSessionEmail(): Promise<string | null>
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  listOrders(): Promise<Order[]>
  /** Pedidos por confirmar, sin detalle: lo usa el aviso de pedidos nuevos */
  pendingOrders(): Promise<PendingOrder[]>
  setOrderStatus(orderId: string, status: OrderStatus): Promise<void>
  setStock(variantId: string, stock: number): Promise<void>
  saveProduct(input: ProductInput): Promise<string>
  deleteProduct(id: string): Promise<void>
  uploadImage(file: File): Promise<string>
  saveSettings(settings: Settings): Promise<void>
}
