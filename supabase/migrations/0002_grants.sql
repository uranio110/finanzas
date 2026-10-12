-- Permisos base para el rol `authenticated`. RLS (ver 0001_init.sql) sigue
-- siendo la barrera real que aisla los datos por usuario -- esto es el
-- permiso de mas bajo nivel que Postgres exige antes incluso de evaluar las
-- politicas RLS. Al desactivar "Exponer automaticamente nuevas tablas" en la
-- creacion del proyecto (recomendado por seguridad), las tablas nuevas ya no
-- reciben este permiso solas, asi que hay que otorgarlo a mano.
--
-- Importante: `allowed_users` NO recibe ningun permiso aqui a proposito --
-- solo debe ser legible a traves de las funciones SECURITY DEFINER
-- (is_allowed / am_i_allowed) de la migracion anterior, nunca directo.

grant usage on schema public to authenticated;

grant select, insert, update, delete on
  accounts,
  categories,
  transactions,
  transfers,
  quick_templates,
  user_preferences
to authenticated;

grant select on account_balances to authenticated;

grant execute on function am_i_allowed() to authenticated;
grant execute on function monthly_category_totals(date, date) to authenticated;
