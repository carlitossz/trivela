-- =====================================================================
-- TRIVELA · Actualización 2026-10-21
-- Los datos de cada método de pago pasan de un solo bloque de texto libre
-- ("details") a renglones separados con etiqueta + valor + si es copiable
-- ("note" para el texto libre que quede, "fields" para los datos sueltos).
-- Pegar completo en Supabase → SQL Editor → Run. Se puede correr más de una vez sin problema.
-- =====================================================================

-- No se pierde nada: lo que tenías escrito en "details" pasa tal cual a "note"
-- (texto informativo, sin botón de copiar). Desde Ajustes → Métodos de pago puedes
-- ahora ir agregando los datos sueltos (teléfono, cuenta, cédula, etc.) en sus propias casillas.
update public.settings
set payment_methods = (
  select jsonb_agg(
    (pm - 'details') || jsonb_build_object(
      'note', coalesce(pm ->> 'details', ''),
      'fields', coalesce(pm -> 'fields', '[]'::jsonb)
    )
  )
  from jsonb_array_elements(payment_methods) pm
)
where id = 1;