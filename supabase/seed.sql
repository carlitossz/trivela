-- =====================================================================
-- TRIVELA · Datos iniciales: las 7 franelas del catálogo "Bordadas"
-- Correr DESPUÉS de schema.sql. Solo inserta si la tabla está vacía.
-- Las fotos vienen dentro de la app (carpeta public/demo); luego se pueden cambiar desde el panel.
-- =====================================================================

do $$
declare
  pid uuid;
  rec record;
begin
  if exists (select 1 from public.products) then
    raise notice 'Ya hay franelas cargadas; no se insertó nada.';
    return;
  end if;

  for rec in
    select * from (values
      ('Argentina Visitante', 'Visitante', '/demo/argentina-visitante.webp', array['XL','2XL']),
      ('Colombia Visitante',  'Visitante', '/demo/colombia-visitante.webp',  array['XL']),
      ('Brasil Local',        'Local',     '/demo/brasil-local.webp',        array['XL']),
      ('España Local',        'Local',     '/demo/espana-local.webp',        array['L','2XL']),
      ('Alemania Local',      'Local',     '/demo/alemania-local.webp',      array['M']),
      ('Francia Local',       'Local',     '/demo/francia-local.webp',       array['L']),
      ('Portugal Local',      'Local',     '/demo/portugal-local.webp',      array['XL'])
    ) as t(name, kit, img, sizes)
  loop
    insert into public.products (name, category, kit, collection, badge, price_usd, price_cop, image_url)
    values (rec.name, 'Selección', rec.kit, 'Mundial 2026', 'Bordada', 25, 75000, rec.img)
    returning id into pid;

    insert into public.variants (product_id, size, stock)
    select pid, s, case when s = any (rec.sizes) then 1 else 0 end
    from unnest(array['S','M','L','XL','2XL']) as s;
  end loop;
end $$;
