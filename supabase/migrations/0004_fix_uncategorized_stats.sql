-- monthly_category_totals usaba JOIN (inner) con categories, lo que excluía
-- en silencio cualquier transacción sin categoría de las estadísticas. Se
-- cambia a LEFT JOIN y se usa coalesce para que esas filas aparezcan como
-- "Sin categoría" en vez de desaparecer.

create or replace function monthly_category_totals(p_from date, p_to date)
returns table (
  month date,
  category_id uuid,
  category_name text,
  kind text,
  total bigint
)
language sql
security invoker
stable
as $$
  select
    date_trunc('month', t.occurred_at)::date as month,
    c.id as category_id,
    coalesce(c.name, 'Sin categoría') as category_name,
    case when t.amount >= 0 then 'income' else 'expense' end as kind,
    sum(t.amount) as total
  from transactions t
  left join categories c on c.id = t.category_id
  where t.kind = 'normal'
    and t.occurred_at >= p_from
    and t.occurred_at <= p_to
  group by 1, 2, 3, 4
  order by 1;
$$;
