import { createClient } from '@supabase/supabase-js'
import type { Api, Order, PendingOrder, Product, ProductInput, Settings } from './types'
import { SIZES } from './types'

const PRODUCT_SELECT = '*, variants(*)'

function sortVariants(p: Product): Product {
  const order = (s: string) => {
    const i = (SIZES as readonly string[]).indexOf(s)
    return i === -1 ? 99 : i
  }
  return { ...p, price_usd: Number(p.price_usd), price_cop: Number(p.price_cop), variants: [...(p.variants ?? [])].sort((a, b) => order(a.size) - order(b.size)) }
}

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

export function createSupabaseApi(url: string, key: string): Api {
  const sb = createClient(url, key)

  // Libera los pedidos vencidos antes de leer stock. Como mucho una vez por minuto por visitante.
  // Si la actualización SQL todavía no se corrió, la función no existe y simplemente se ignora.
  let lastRelease = 0
  async function releaseExpired() {
    if (Date.now() - lastRelease < 60_000) return
    lastRelease = Date.now()
    try {
      await sb.rpc('release_expired_orders')
    } catch {
      /* no bloquea la tienda */
    }
  }

  // Si la base todavía no tiene la columna reserve_hours, no se intenta guardar
  let hasReserveColumn = true

  return {
    mode: 'supabase',

    async getSettings() {
      const { data, error } = await sb.from('settings').select('*').eq('id', 1).single()
      fail(error)
      hasReserveColumn = 'reserve_hours' in data
      return {
        ...data,
        bs_rate: data.bs_rate == null ? null : Number(data.bs_rate),
        reserve_hours: Number(data.reserve_hours ?? 0)
      } as Settings
    },

    async listProducts(opts) {
      await releaseExpired()
      let q = sb.from('products').select(PRODUCT_SELECT).order('created_at', { ascending: false })
      if (!opts?.includeInactive) q = q.eq('active', true)
      const { data, error } = await q
      fail(error)
      return (data as Product[]).map(sortVariants)
    },

    async getProduct(id) {
      await releaseExpired()
      const { data, error } = await sb.from('products').select(PRODUCT_SELECT).eq('id', id).maybeSingle()
      fail(error)
      return data ? sortVariants(data as Product) : null
    },

    async createOrder(o) {
      const { data, error } = await sb.rpc('create_order', {
        p_customer_name: o.customer_name,
        p_customer_phone: o.customer_phone,
        p_delivery: o.delivery,
        p_address: o.address,
        p_payment_method: o.payment_method,
        p_items: o.items
      })
      fail(error)
      return {
        ...data,
        total_usd: Number(data.total_usd),
        total_cop: Number(data.total_cop),
        total_bs: data.total_bs == null ? null : Number(data.total_bs)
      }
    },

    async getSessionEmail() {
      const { data } = await sb.auth.getSession()
      const email = data.session?.user.email ?? null
      if (!email) return null
      const { data: admin } = await sb.from('admins').select('email').limit(1)
      return admin && admin.length ? email : null
    },

    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password })
      if (error) throw new Error('Correo o contraseña incorrectos')
      const { data: admin } = await sb.from('admins').select('email').limit(1)
      if (!admin || !admin.length) {
        await sb.auth.signOut()
        throw new Error('Este correo no tiene permiso de administrador')
      }
    },

    async signOut() {
      await sb.auth.signOut()
    },

    async listOrders() {
      lastRelease = 0
      await releaseExpired()
      const { data, error } = await sb
        .from('orders')
        .select('*, items:order_items(*)')
        .order('created_at', { ascending: false })
        .limit(300)
      fail(error)
      return (data as Order[]).map((o) => ({
        ...o,
        total_usd: Number(o.total_usd),
        total_cop: Number(o.total_cop),
        total_bs: o.total_bs == null ? null : Number(o.total_bs)
      }))
    },

    async pendingOrders() {
      await releaseExpired()
      const { data, error } = await sb
        .from('orders')
        .select('id, code, customer_name, currency, total_usd, total_cop, total_bs, created_at')
        .eq('status', 'pendiente')
        .order('created_at', { ascending: false })
        .limit(50)
      fail(error)
      return (data as PendingOrder[]).map((o) => ({
        ...o,
        total_usd: Number(o.total_usd),
        total_cop: Number(o.total_cop),
        total_bs: o.total_bs == null ? null : Number(o.total_bs)
      }))
    },

    async setOrderStatus(orderId, status) {
      const { error } = await sb.rpc('set_order_status', { p_order_id: orderId, p_status: status })
      fail(error)
    },

    async setStock(variantId, stock) {
      const { error } = await sb.from('variants').update({ stock: Math.max(0, stock) }).eq('id', variantId)
      fail(error)
    },

    async saveProduct(input: ProductInput) {
      const { stock, id, ...fields } = input
      let productId = id
      if (productId) {
        const { error } = await sb.from('products').update(fields).eq('id', productId)
        fail(error)
      } else {
        const { data, error } = await sb.from('products').insert(fields).select('id').single()
        fail(error)
        productId = (data as { id: string }).id
      }
      const rows = SIZES.map((size) => ({ product_id: productId, size, stock: Math.max(0, stock[size] ?? 0) }))
      const { error } = await sb.from('variants').upsert(rows, { onConflict: 'product_id,size' })
      fail(error)
      return productId!
    },

    async deleteProduct(id) {
      const { error } = await sb.from('products').delete().eq('id', id)
      fail(error)
    },

    async uploadImage(file) {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${crypto.randomUUID()}.${ext}`
      const { error } = await sb.storage.from('productos').upload(path, file, { cacheControl: '31536000', contentType: file.type })
      fail(error)
      return sb.storage.from('productos').getPublicUrl(path).data.publicUrl
    },

    async saveSettings(s) {
      const row: Partial<Settings> & { updated_at: string } = { ...s, updated_at: new Date().toISOString() }
      if (!hasReserveColumn) delete row.reserve_hours
      const { error } = await sb
        .from('settings')
        .update(row)
        .eq('id', 1)
      fail(error)
    }
  }
}
