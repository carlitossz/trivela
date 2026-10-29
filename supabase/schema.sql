-- =====================================================================
-- TRIVELA · Esquema de base de datos (Supabase / PostgreSQL)
-- Pegar completo en Supabase → SQL Editor → Run. Se puede correr de nuevo sin romper nada.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Administradores ----------
-- Solo los correos de esta tabla pueden entrar al panel y modificar datos.
create table if not exists public.admins (
  email text primary key
);

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.admins where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

-- ---------- Ajustes de la tienda (una sola fila) ----------
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  store_name text not null default 'Trivela',
  whatsapp text not null default '',            -- solo dígitos con código de país, ej. 573001234567
  bs_rate numeric(14,2),                         -- bolívares por 1 USD (vacío = se cobra "$ en Bs")
  pickup_info text not null default '',
  delivery_info text not null default '',
  payment_methods jsonb not null default '[]'::jsonb,
  reserve_hours int not null default 24 check (reserve_hours >= 0),  -- horas que un pedido sin pagar aparta el stock (0 = no se libera solo)
  updated_at timestamptz not null default now()
);

-- Para bases creadas antes de que existiera esta columna
alter table public.settings add column if not exists reserve_hours int not null default 24 check (reserve_hours >= 0);

insert into public.settings (id, payment_methods, pickup_info, delivery_info)
values (1,
  '[{"name":"Efectivo $","currency":"USD","note":"Pagas en dólares al recibir.","fields":[],"enabled":true,"cash":true},
    {"name":"Efectivo pesos","currency":"COP","note":"Pagas en pesos al recibir.","fields":[],"enabled":true,"cash":true},
    {"name":"Bolívares","currency":"BS","note":"Pago Móvil a la tasa del día.","fields":[{"label":"Banco","value":"","copyable":false},{"label":"Teléfono","value":"","copyable":true},{"label":"Cédula","value":"","copyable":true}],"enabled":true,"cash":false},
    {"name":"Binance","currency":"USD","note":"","fields":[{"label":"ID Binance Pay","value":"","copyable":true}],"enabled":true,"cash":false},
    {"name":"Bancolombia","currency":"COP","note":"","fields":[{"label":"Banco","value":"","copyable":false},{"label":"Número de cuenta","value":"","copyable":true},{"label":"Titular","value":"","copyable":false}],"enabled":true,"cash":false},
    {"name":"Zinli","currency":"USD","note":"","fields":[{"label":"Correo","value":"","copyable":true}],"enabled":true,"cash":false}]'::jsonb,
  'Coordinamos el punto de entrega por WhatsApp.',
  'El costo depende de la zona; te lo confirmamos por WhatsApp.')
on conflict (id) do nothing;

-- ---------- Franelas ----------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Selección',   -- Selección, Club, Retro…
  kit text not null default 'Local',              -- Local, Visitante, Alternativa…
  collection text not null default '',            -- ej. Mundial 2026
  badge text not null default '',                 -- ej. Bordada
  description text not null default '',
  price_usd numeric(10,2) not null default 25,
  price_cop numeric(12,0) not null default 75000,
  image_url text,
  active boolean not null default true,
  dorsals jsonb not null default '[]'::jsonb,     -- lista de dorsales elegibles, ej. ["Lamine Yamal 10","Pedri 8"]. Vacío = no aplica
  created_at timestamptz not null default now()
);

-- Para bases creadas antes de que existiera esta columna
alter table public.products add column if not exists dorsals jsonb not null default '[]'::jsonb;

-- Stock por talla (y, si aplica, por dorsal)
create table if not exists public.variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size text not null,
  dorsal text not null default '',    -- '' = sin dorsal / en blanco. Cada combinación talla+dorsal tiene su propio stock.
  stock int not null default 0 check (stock >= 0),
  unique (product_id, size, dorsal)
);

-- Para bases creadas antes de que existiera esta columna
alter table public.variants add column if not exists dorsal text not null default '';
alter table public.variants drop constraint if exists variants_product_id_size_key;
alter table public.variants drop constraint if exists variants_product_id_size_dorsal_key;
alter table public.variants add constraint variants_product_id_size_dorsal_key unique (product_id, size, dorsal);

-- ---------- Pedidos ----------
create sequence if not exists public.order_code_seq start 1;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,   -- TV-0001, TV-0002… se asigna solo cuando el pedido se completa
  customer_name text not null,
  customer_phone text not null,
  delivery text not null check (delivery in ('pickup', 'delivery')),
  address text not null default '',
  payment_method text not null,
  currency text not null check (currency in ('USD', 'COP', 'BS')),
  total_usd numeric(10,2) not null,
  total_cop numeric(12,0) not null,
  total_bs numeric(14,2),
  cash_amount numeric(14,2),  -- con cuánto dijo el cliente que paga (solo efectivo); null = paga exacto o no aplica
  status text not null default 'pendiente' check (status in ('pendiente', 'pagado', 'entregado', 'cancelado')),
  channel text not null default 'tienda' check (channel in ('tienda', 'externa')),  -- 'externa' = venta registrada a mano por el admin, fuera de la app
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- Para bases creadas antes de que existiera esta columna
alter table public.orders add column if not exists cash_amount numeric(14,2);
alter table public.orders add column if not exists channel text not null default 'tienda' check (channel in ('tienda', 'externa'));

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.variants(id) on delete set null,
  product_name text not null,
  size text not null,
  dorsal text not null default '',    -- dorsal pedido, copiado al momento de la compra ('' = sin dorsal)
  qty int not null check (qty > 0),
  unit_usd numeric(10,2) not null,
  unit_cop numeric(12,0) not null
);

-- Para bases creadas antes de que existiera esta columna
alter table public.order_items add column if not exists dorsal text not null default '';

create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists variants_product_idx on public.variants (product_id);

-- ---------- Seguridad (RLS) ----------
alter table public.admins enable row level security;
alter table public.settings enable row level security;
alter table public.products enable row level security;
alter table public.variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "admins se ven a si mismos" on public.admins;
create policy "admins se ven a si mismos" on public.admins for select using (public.is_admin());

drop policy if exists "todos leen ajustes" on public.settings;
create policy "todos leen ajustes" on public.settings for select using (true);
drop policy if exists "admin edita ajustes" on public.settings;
create policy "admin edita ajustes" on public.settings for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "todos leen franelas activas" on public.products;
create policy "todos leen franelas activas" on public.products for select using (active or public.is_admin());
drop policy if exists "admin gestiona franelas" on public.products;
create policy "admin gestiona franelas" on public.products for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "todos leen stock" on public.variants;
create policy "todos leen stock" on public.variants for select using (true);
drop policy if exists "admin gestiona stock" on public.variants;
create policy "admin gestiona stock" on public.variants for all using (public.is_admin()) with check (public.is_admin());

-- Los clientes NO leen ni escriben pedidos directo: solo a través de create_order()
drop policy if exists "admin gestiona pedidos" on public.orders;
create policy "admin gestiona pedidos" on public.orders for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin gestiona items" on public.order_items;
create policy "admin gestiona items" on public.order_items for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Liberar pedidos no pagados ----------
-- Cancela los pedidos "pendiente" con más de reserve_hours horas y devuelve sus tallas al stock.
-- La llaman la tienda al cargar, create_order y el panel; no hace falta programar nada aparte.
create or replace function public.release_expired_orders()
returns int
language plpgsql security definer set search_path = public
as $$
declare
  v_hours int;
  v_count int := 0;
  r record;
begin
  select reserve_hours into v_hours from public.settings where id = 1;
  if v_hours is null or v_hours <= 0 then
    return 0;
  end if;

  for r in
    select id from public.orders
    where status = 'pendiente' and created_at < now() - make_interval(hours => v_hours)
    for update skip locked
  loop
    update public.variants v set stock = v.stock + i.qty
    from public.order_items i
    where i.order_id = r.id and i.variant_id = v.id;

    update public.orders
    set status = 'cancelado',
        notes = trim(both ' ' from notes || ' Liberado automáticamente: no se confirmó el pago en ' || v_hours || ' h.')
    where id = r.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.release_expired_orders() from public;
grant execute on function public.release_expired_orders() to anon, authenticated;

-- ---------- Crear pedido (lo usa el cliente) ----------
-- Valida stock, lo descuenta (queda apartado) y guarda el pedido, todo en una sola transacción.
create or replace function public.create_order(
  p_customer_name text,
  p_customer_phone text,
  p_delivery text,
  p_address text,
  p_payment_method text,
  p_items jsonb,
  p_cash_amount numeric default null
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_currency text;
  v_rate numeric;
  v_is_cash boolean;
  v_order_id uuid;
  v_code text;
  v_total_usd numeric := 0;
  v_total_cop numeric := 0;
  v_total_bs numeric;
  v_total_selected numeric;
  v_item jsonb;
  v_qty int;
  r record;
begin
  if coalesce(trim(p_customer_name), '') = '' or coalesce(trim(p_customer_phone), '') = '' then
    raise exception 'Escribe tu nombre y tu WhatsApp';
  end if;
  if p_delivery not in ('pickup', 'delivery') then
    raise exception 'Elige pickup o delivery';
  end if;
  if p_delivery = 'delivery' and coalesce(trim(p_address), '') = '' then
    raise exception 'Escribe la dirección de entrega';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El carrito está vacío';
  end if;
  if jsonb_array_length(p_items) > 30 then
    raise exception 'Demasiados productos en un pedido';
  end if;

  -- Antes de revisar stock, se liberan los apartados vencidos
  perform public.release_expired_orders();

  select pm ->> 'currency', s.bs_rate, coalesce((pm ->> 'cash')::boolean, false) into v_currency, v_rate, v_is_cash
  from public.settings s, jsonb_array_elements(s.payment_methods) pm
  where s.id = 1 and pm ->> 'name' = p_payment_method and coalesce((pm ->> 'enabled')::boolean, true)
  limit 1;
  if v_currency is null then
    raise exception 'Ese método de pago no está disponible';
  end if;
  if p_cash_amount is not null and not v_is_cash then
    raise exception 'Ese método de pago no es en efectivo';
  end if;
  if p_cash_amount is not null and p_cash_amount < 0 then
    raise exception 'Monto no válido';
  end if;

  v_order_id := gen_random_uuid();
  insert into public.orders (id, code, customer_name, customer_phone, delivery, address, payment_method, currency, total_usd, total_cop, cash_amount)
  values (v_order_id, v_order_id::text, left(trim(p_customer_name), 80), left(trim(p_customer_phone), 30), p_delivery,
          left(coalesce(trim(p_address), ''), 240), p_payment_method, v_currency, 0, 0, p_cash_amount);

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'qty')::int;
    if v_qty is null or v_qty < 1 or v_qty > 20 then
      raise exception 'Cantidad no válida';
    end if;

    select v.id as variant_id, v.size, v.dorsal, v.stock, p.id as product_id, p.name, p.price_usd, p.price_cop, p.active
    into r
    from public.variants v join public.products p on p.id = v.product_id
    where v.id = (v_item ->> 'variant_id')::uuid
    for update of v;

    if not found or not r.active then
      raise exception 'Una de las franelas ya no está disponible';
    end if;
    if r.stock < v_qty then
      raise exception 'Ya no queda stock de % talla %', r.name, r.size || case when r.dorsal <> '' then ' (' || r.dorsal || ')' else '' end;
    end if;

    update public.variants set stock = stock - v_qty where id = r.variant_id;

    insert into public.order_items (order_id, product_id, variant_id, product_name, size, dorsal, qty, unit_usd, unit_cop)
    values (v_order_id, r.product_id, r.variant_id, r.name, r.size, r.dorsal, v_qty, r.price_usd, r.price_cop);

    v_total_usd := v_total_usd + r.price_usd * v_qty;
    v_total_cop := v_total_cop + r.price_cop * v_qty;
  end loop;

  if v_rate is not null then
    v_total_bs := round(v_total_usd * v_rate, 2);
  end if;

  v_total_selected := case v_currency when 'COP' then v_total_cop when 'BS' then coalesce(v_total_bs, v_total_usd) else v_total_usd end;
  if p_cash_amount is not null and p_cash_amount < v_total_selected then
    raise exception 'Ese monto no alcanza para cubrir el total';
  end if;

  -- El número se toma al final: si algo falla antes, no se pierde ningún número
  v_code := 'TV-' || lpad(nextval('public.order_code_seq')::text, 4, '0');

  update public.orders set code = v_code, total_usd = v_total_usd, total_cop = v_total_cop, total_bs = v_total_bs
  where id = v_order_id;

  return jsonb_build_object('code', v_code, 'total_usd', v_total_usd, 'total_cop', v_total_cop,
                            'total_bs', v_total_bs, 'currency', v_currency);
end;
$$;

revoke all on function public.create_order(text, text, text, text, text, jsonb, numeric) from public;
grant execute on function public.create_order(text, text, text, text, text, jsonb, numeric) to anon, authenticated;
-- Si existe la versión anterior de la función (sin el parámetro de efectivo), se elimina para evitar ambigüedad
drop function if exists public.create_order(text, text, text, text, text, jsonb);

-- ---------- Registrar una venta externa (lo usa el admin) ----------
-- Para ventas que pasaron fuera de la app (en persona, por Instagram, etc.): descuenta el mismo stock
-- y queda guardada como un pedido más (con channel = 'externa'), para que salga en Reportes igual que las de la tienda.
-- Ya entra directo como 'pagado' porque es una venta que ya ocurrió.
create or replace function public.create_external_sale(
  p_customer_name text,
  p_currency text,
  p_payment_method text,
  p_items jsonb,
  p_notes text default ''
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_order_id uuid;
  v_code text;
  v_total_usd numeric := 0;
  v_total_cop numeric := 0;
  v_total_bs numeric;
  v_rate numeric;
  v_item jsonb;
  v_qty int;
  r record;
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;
  if p_currency not in ('USD', 'COP', 'BS') then
    raise exception 'Moneda no válida';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Agrega al menos una franela';
  end if;
  if jsonb_array_length(p_items) > 30 then
    raise exception 'Demasiadas franelas en una sola venta';
  end if;

  perform public.release_expired_orders();
  select bs_rate into v_rate from public.settings where id = 1;

  v_order_id := gen_random_uuid();
  insert into public.orders (id, code, customer_name, customer_phone, delivery, address, payment_method, currency, total_usd, total_cop, status, channel, notes)
  values (v_order_id, v_order_id::text, coalesce(nullif(trim(p_customer_name), ''), 'Venta externa'), '', 'pickup', '',
          coalesce(nullif(trim(p_payment_method), ''), 'Venta externa'), p_currency, 0, 0, 'pagado', 'externa', left(coalesce(p_notes, ''), 500));

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'qty')::int;
    if v_qty is null or v_qty < 1 or v_qty > 50 then
      raise exception 'Cantidad no válida';
    end if;

    select v.id as variant_id, v.size, v.dorsal, v.stock, p.id as product_id, p.name, p.price_usd, p.price_cop
    into r
    from public.variants v join public.products p on p.id = v.product_id
    where v.id = (v_item ->> 'variant_id')::uuid
    for update of v;

    if not found then
      raise exception 'Una de las franelas ya no existe';
    end if;
    if r.stock < v_qty then
      raise exception 'Ya no queda stock de % talla %', r.name, r.size || case when r.dorsal <> '' then ' (' || r.dorsal || ')' else '' end;
    end if;

    update public.variants set stock = stock - v_qty where id = r.variant_id;

    insert into public.order_items (order_id, product_id, variant_id, product_name, size, dorsal, qty, unit_usd, unit_cop)
    values (v_order_id, r.product_id, r.variant_id, r.name, r.size, r.dorsal, v_qty, r.price_usd, r.price_cop);

    v_total_usd := v_total_usd + r.price_usd * v_qty;
    v_total_cop := v_total_cop + r.price_cop * v_qty;
  end loop;

  if v_rate is not null then
    v_total_bs := round(v_total_usd * v_rate, 2);
  end if;

  v_code := 'TV-' || lpad(nextval('public.order_code_seq')::text, 4, '0');
  update public.orders set code = v_code, total_usd = v_total_usd, total_cop = v_total_cop, total_bs = v_total_bs
  where id = v_order_id;

  return jsonb_build_object('code', v_code, 'total_usd', v_total_usd, 'total_cop', v_total_cop,
                            'total_bs', v_total_bs, 'currency', p_currency);
end;
$$;

revoke all on function public.create_external_sale(text, text, text, jsonb, text) from public;
grant execute on function public.create_external_sale(text, text, text, jsonb, text) to authenticated;

-- ---------- Cambiar estado de un pedido (lo usa el admin) ----------
-- Si se cancela, las tallas vuelven al stock.
create or replace function public.set_order_status(p_order_id uuid, p_status text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_old text;
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;
  if p_status not in ('pendiente', 'pagado', 'entregado', 'cancelado') then
    raise exception 'Estado no válido';
  end if;

  select status into v_old from public.orders where id = p_order_id for update;
  if v_old is null then
    raise exception 'Pedido no encontrado';
  end if;
  if v_old = 'cancelado' then
    raise exception 'Un pedido cancelado no se puede reabrir; crea uno nuevo';
  end if;

  if p_status = 'cancelado' then
    update public.variants v set stock = v.stock + i.qty
    from public.order_items i
    where i.order_id = p_order_id and i.variant_id = v.id;
  end if;

  update public.orders set status = p_status where id = p_order_id;
end;
$$;

revoke all on function public.set_order_status(uuid, text) from public;
grant execute on function public.set_order_status(uuid, text) to authenticated;

-- ---------- Fotos (Storage) ----------
insert into storage.buckets (id, name, public) values ('productos', 'productos', true)
on conflict (id) do nothing;

drop policy if exists "admin sube fotos" on storage.objects;
create policy "admin sube fotos" on storage.objects for insert to authenticated
  with check (bucket_id = 'productos' and public.is_admin());
drop policy if exists "admin cambia fotos" on storage.objects;
create policy "admin cambia fotos" on storage.objects for update to authenticated
  using (bucket_id = 'productos' and public.is_admin());
drop policy if exists "admin borra fotos" on storage.objects;
create policy "admin borra fotos" on storage.objects for delete to authenticated
  using (bucket_id = 'productos' and public.is_admin());