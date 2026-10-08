import { createDemoApi } from './demoApi'
import { createSupabaseApi } from './supabaseApi'
import type { Api } from './types'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()

/** Si .env.local está mal escrito, aquí queda el motivo para mostrarlo en pantalla */
export let configError: string | null = null

function build(): Api {
  // Sin credenciales de Supabase (o con VITE_DEMO=1) la app corre en modo demo
  if (!url || !key || import.meta.env.VITE_DEMO === '1') return createDemoApi()
  if (!/^https:\/\/[^\s"']+$/.test(url)) {
    configError = `VITE_SUPABASE_URL no es válida: "${url}". Debe verse así: https://abcd1234.supabase.co (sin comillas ni espacios).`
    return createDemoApi()
  }
  try {
    return createSupabaseApi(url, key)
  } catch (e) {
    configError = `No se pudo conectar con Supabase: ${e instanceof Error ? e.message : String(e)}`
    return createDemoApi()
  }
}

export const api: Api = build()
