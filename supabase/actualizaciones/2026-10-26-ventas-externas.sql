-- =====================================================================
-- TRIVELA · Actualización 2026-10-26
-- Ventas externas: el admin puede registrar a mano una venta que pasó fuera
-- de la app (en persona, por Instagram, etc.). Descuenta el mismo stock y
-- queda guardada como un pedido más, así que sale junto con las demás en Reportes.
-- Pegar completo en Supabase → SQL Editor → Run. Se puede correr más de una vez sin problema.
-- =====================================================================

-- 1. Marca de dónde vino el pedido: 'tienda' (como hasta ahora) o 'externa'
alter table public.orders add column if not exists channel text not null default 'tienda' check (channel in ('tienda', 'externa'));

-- 2. Función para registrar la venta externa (solo el admin puede llamarla)
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