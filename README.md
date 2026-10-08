# Trivela · App de franelas

Tienda para el cliente (catálogo, stock por talla, carrito, pedido por WhatsApp) y panel para el dueño
(pedidos, inventario, franelas, ajustes). Es una web que se instala en el teléfono (PWA).

**Stack:** React 18 + Vite + TypeScript + Tailwind 3 + Supabase (PostgreSQL, Auth, Storage).

---

## 1. Probarla ya (sin base de datos)

```bash
npm install
npm run dev
```

Abre http://localhost:5173. Sin datos de Supabase, la app arranca en **modo demo**: todo se guarda en el navegador.
Panel: http://localhost:5173/admin · contraseña `trivela2026`.

## 2. Conectar Supabase (versión real)

1. Crea un proyecto gratis en https://supabase.com.
2. **SQL Editor → New query**: pega todo `supabase/schema.sql` y dale **Run**. Luego haz lo mismo con `supabase/seed.sql`
   (carga las 7 franelas del catálogo).
3. **Authentication → Users → Add user**: crea el usuario de tu primo (correo + contraseña, marca *Auto confirm*).
4. En el SQL Editor, dale permiso de admin a ese correo (en minúsculas):
   ```sql
   insert into public.admins (email) values ('correo-del-primo@gmail.com');
   ```
5. **Authentication → Sign In / Providers → Email**: desactiva **Allow new users to sign up**
   (así nadie más puede crearse cuenta).
6. **Project Settings → API**: copia *Project URL* y *anon public key*. Crea el archivo `.env.local`:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
7. `npm run dev` otra vez: ya lee y guarda en Supabase. Entra a `/admin` con el correo del paso 3 y,
   en **Ajustes**, pon el número de WhatsApp de la tienda (con código de país, ej. `573001234567`).

## 3. Publicarla (Vercel, gratis)

1. Sube el proyecto a GitHub.
2. En https://vercel.com → *Add New Project* → elige el repo (Vercel detecta Vite solo).
3. En *Environment Variables* agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. *Deploy*. El link que te da es el que se comparte en Instagram y WhatsApp.
   El panel queda en `tu-link.vercel.app/admin`.

Para instalarla en el teléfono: abrir el link en Chrome (Android) → menú → *Instalar app*;
en iPhone, Safari → Compartir → *Agregar a inicio*.

## Cómo funciona un pedido

1. El cliente elige franela y talla (solo ve las tallas con stock), arma el carrito y elige pickup o delivery
   y el método de pago.
2. Al confirmar, la base de datos **descuenta el stock en ese momento** (la talla queda apartada) y crea el pedido
   `TV-0001`, `TV-0002`…
3. El cliente toca **Enviar pedido por WhatsApp** y le llega a tu primo el mensaje armado.
4. En el panel, tu primo **confirma el pago** → **marca entregado**. Si el cliente no paga, **cancela** y las tallas
   vuelven al inventario solas.

Todo esto ocurre en la función `create_order` de la base de datos, así que dos personas no pueden comprar la
última unidad al mismo tiempo, y nadie puede alterar precios desde el navegador.

## Estructura

```
supabase/schema.sql      tablas, seguridad (RLS), funciones de pedidos y fotos
supabase/seed.sql        las 7 franelas iniciales
public/demo/             fotos iniciales
src/lib/                 tipos, formato de monedas, WhatsApp, carrito, conexión (supabaseApi / demoApi)
src/pages/shop/          Catálogo, Detalle, Carrito, Pedido, Pedido listo
src/pages/admin/         Login, Inicio, Pedidos, Inventario, Franelas, Ajustes
```

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Desarrollo en local |
| `npm run build` | Versión para publicar (carpeta `dist`) |
| `npm run build:demo` | Versión demo sin base de datos, con rutas `#/` (para enseñarla en cualquier lado) |

## Siguientes ideas (cuando tu primo las pida)

Lista de espera "Avísame" por talla · venta directa en el local · historial de movimientos de stock ·
reportes · importar desde Excel · cupones · varias fotos por franela · tallas de niño.
