-- =====================================================================
-- TRIVELA · Actualización 2026-10-11
-- Liberar automáticamente los pedidos que no se pagan a tiempo.
-- Pegar completo en Supabase → SQL Editor → Run. Se puede correr más de una vez sin problema.
-- (Si la base se crea desde cero con schema.sql, esto ya viene incluido.)
-- =====================================================================

-- 1. Horas que un pedido sin pagar mantiene apartadas sus tallas (0 = no se libera solo)
alter table public.settings add column if not exists reserve_hours int not null default 24 check (reserve_hours >= 0);

-- 2. Función que libera los apartados vencidos
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

-- 3. create_order ahora libera los vencidos antes de revisar el stock
-- Valida stock, lo descuenta (queda apartado) y guarda el pedido, todo en una sola transacción.
create or replace function public.create_order(
  p_customer_name text,
  p_customer_phone text,
  p_delivery text,
  p_address text,
  p_payment_method text,
  p_items jsonb
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_currency text;
  v_rate numeric;
  v_order_id uuid;
  v_code text;
  v_total_usd numeric := 0;
  v_total_cop numeric := 0;
  v_total_bs numeric;
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

  select pm ->> 'currency', s.bs_rate into v_currency, v_rate
  from public.settings s, jsonb_array_elements(s.payment_methods) pm
  where s.id = 1 and pm ->> 'name' = p_payment_method and coalesce((pm ->> 'enabled')::boolean, true)
  limit 1;
  if v_currency is null then
    raise exception 'Ese método de pago no está disponible';
  end if;

  v_order_id := gen_random_uuid();
  insert into public.orders (id, code, customer_name, customer_phone, delivery, address, payment_method, currency, total_usd, total_cop)
  values (v_order_id, v_order_id::text, left(trim(p_customer_name), 80), left(trim(p_customer_phone), 30), p_delivery,
          left(coalesce(trim(p_address), ''), 240), p_payment_method, v_currency, 0, 0);

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'qty')::int;
    if v_qty is null or v_qty < 1 or v_qty > 20 then
      raise exception 'Cantidad no válida';
    end if;

    select v.id as variant_id, v.size, v.stock, p.id as product_id, p.name, p.price_usd, p.price_cop, p.active
    into r
    from public.variants v join public.products p on p.id = v.product_id
    where v.id = (v_item ->> 'variant_id')::uuid
    for update of v;

    if not found or not r.active then
      raise exception 'Una de las franelas ya no está disponible';
    end if;
    if r.stock < v_qty then
      raise exception 'Ya no queda stock de % talla %', r.name, r.size;
    end if;

    update public.variants set stock = stock - v_qty where id = r.variant_id;

    insert into public.order_items (order_id, product_id, variant_id, product_name, size, qty, unit_usd, unit_cop)
    values (v_order_id, r.product_id, r.variant_id, r.name, r.size, v_qty, r.price_usd, r.price_cop);

    v_total_usd := v_total_usd + r.price_usd * v_qty;
    v_total_cop := v_total_cop + r.price_cop * v_qty;
  end loop;

  if v_rate is not null then
    v_total_bs := round(v_total_usd * v_rate, 2);
  end if;

  -- El número se toma al final: si algo falla antes, no se pierde ningún número
  v_code := 'TV-' || lpad(nextval('public.order_code_seq')::text, 4, '0');

  update public.orders set code = v_code, total_usd = v_total_usd, total_cop = v_total_cop, total_bs = v_total_bs
  where id = v_order_id;

  return jsonb_build_object('code', v_code, 'total_usd', v_total_usd, 'total_cop', v_total_cop,
                            'total_bs', v_total_bs, 'currency', v_currency);
end;
$$;

revoke all on function public.create_order(text, text, text, text, text, jsonb) from public;
grant execute on function public.create_order(text, text, text, text, text, jsonb) to anon, authenticated;
