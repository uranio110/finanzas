-- Esquema inicial: cuentas, categorias, transacciones, transferencias,
-- plantillas rapidas, preferencias, y el mecanismo de autorizacion por
-- GitHub username (sin email/password). Ejecutar completo en el SQL Editor
-- de Supabase (o via `supabase db push` si usas la CLI) sobre un proyecto
-- nuevo. Ver README.md -> "Configurar Supabase" para el orden de pasos.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. Lista de personas autorizadas (no hay registro publico).
--    Se administra a mano desde el SQL Editor / Table Editor de Supabase:
--      insert into allowed_users (github_username, note) values ('tu-usuario', 'yo');
--    Revocar acceso = borrar la fila. No tiene RLS publica: solo el admin
--    (via dashboard, con la service-role key) y las funciones SECURITY
--    DEFINER de abajo pueden leerla; ningun cliente autenticado puede
--    consultarla directamente, para no filtrar la lista completa de usuarios.
-- ---------------------------------------------------------------------------
create table allowed_users (
  github_username text primary key,
  note text,
  created_at timestamptz not null default now()
);
alter table allowed_users enable row level security;
-- Sin policies -> nadie (ni siquiera authenticated) puede leer/escribir esta
-- tabla via la API publica. Solo accesible desde el dashboard (service role)
-- o desde dentro de una funcion SECURITY DEFINER.

-- Devuelve true si la sesion actual corresponde a un github_username
-- presente en allowed_users. Se apoya en auth.jwt() (claims del token,
-- incluye user_metadata.user_name para el proveedor GitHub) en vez de leer
-- auth.users directamente.
create or replace function is_allowed()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from allowed_users au
    where au.github_username = (auth.jwt() -> 'user_metadata' ->> 'user_name')
  );
$$;

-- RPC publica y segura para que el frontend sepa si debe mostrar
-- "no autorizado" en vez de intentar usar la app con una cuenta GitHub
-- que no esta en la lista. No expone la lista de usuarios, solo un booleano
-- sobre la sesion actual.
create or replace function am_i_allowed()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select is_allowed();
$$;

-- ---------------------------------------------------------------------------
-- 2. Preferencias de usuario (tema, moneda, locale).
-- ---------------------------------------------------------------------------
create table user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  theme text not null default 'dark',
  locale text not null default 'es-CO',
  default_currency text not null default 'COP'
);
alter table user_preferences enable row level security;
create policy "own preferences" on user_preferences
  for all using (user_id = auth.uid() and is_allowed())
  with check (user_id = auth.uid() and is_allowed());

-- ---------------------------------------------------------------------------
-- 3. Cuentas (efectivo, banco, ahorros, tarjeta...).
-- ---------------------------------------------------------------------------
create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null check (type in ('cash', 'bank', 'savings', 'card', 'other')),
  icon text not null default 'wallet',
  -- Importes siempre en unidades enteras (centavos) para evitar errores de
  -- coma flotante en calculos financieros.
  opening_balance bigint not null default 0,
  currency text not null default 'COP',
  created_at timestamptz not null default now(),
  archived_at timestamptz
);
alter table accounts enable row level security;
create policy "own accounts" on accounts
  for all using (user_id = auth.uid() and is_allowed())
  with check (user_id = auth.uid() and is_allowed());
create index accounts_user_id_idx on accounts (user_id) where archived_at is null;

-- ---------------------------------------------------------------------------
-- 4. Categorias (ingreso/gasto, personalizadas por usuario).
-- ---------------------------------------------------------------------------
create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('income', 'expense')),
  icon text not null default 'tag',
  color text,
  sort_order integer not null default 0,
  archived_at timestamptz
);
alter table categories enable row level security;
create policy "own categories" on categories
  for all using (user_id = auth.uid() and is_allowed())
  with check (user_id = auth.uid() and is_allowed());
create index categories_user_id_idx on categories (user_id) where archived_at is null;

-- ---------------------------------------------------------------------------
-- 5. Transacciones: fuente de verdad de ingresos/gastos/ajustes de saldo.
--    Los balances NUNCA se guardan en una columna mutable -- siempre se
--    derivan sumando esta tabla + transfers (ver vista account_balances).
--    kind='adjustment' representa una correccion manual de saldo: es una
--    fila normal con una nota, no una tabla ni una mutacion aparte, para
--    preservar el historial completo.
-- ---------------------------------------------------------------------------
create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references accounts (id) on delete restrict,
  category_id uuid references categories (id) on delete set null,
  kind text not null default 'normal' check (kind in ('normal', 'adjustment')),
  -- positivo = ingreso, negativo = gasto, centavos
  amount bigint not null,
  occurred_at date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);
alter table transactions enable row level security;
create policy "own transactions" on transactions
  for all using (user_id = auth.uid() and is_allowed())
  with check (user_id = auth.uid() and is_allowed());
create index transactions_account_occurred_idx on transactions (account_id, occurred_at);
create index transactions_user_occurred_idx on transactions (user_id, occurred_at);

-- ---------------------------------------------------------------------------
-- 6. Transferencias entre cuentas propias: tabla separada a proposito para
--    que nunca puedan colarse en sumas de ingresos/gastos, y para que sean
--    una unidad atomica (una fila = una transferencia completa o ninguna).
-- ---------------------------------------------------------------------------
create table transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_account_id uuid not null references accounts (id) on delete restrict,
  destination_account_id uuid not null references accounts (id) on delete restrict,
  amount bigint not null check (amount > 0),
  occurred_at date not null default current_date,
  note text,
  created_at timestamptz not null default now(),
  constraint transfers_distinct_accounts check (source_account_id <> destination_account_id)
);
alter table transfers enable row level security;
create policy "own transfers" on transfers
  for all using (user_id = auth.uid() and is_allowed())
  with check (user_id = auth.uid() and is_allowed());
create index transfers_source_idx on transfers (source_account_id, occurred_at);
create index transfers_destination_idx on transfers (destination_account_id, occurred_at);

-- ---------------------------------------------------------------------------
-- 7. Plantillas de operaciones frecuentes ("un toque").
-- ---------------------------------------------------------------------------
create table quick_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  icon text not null default 'zap',
  kind text not null check (kind in ('income', 'expense')),
  category_id uuid references categories (id) on delete set null,
  account_id uuid not null references accounts (id) on delete cascade,
  default_amount bigint,
  sort_order integer not null default 0
);
alter table quick_templates enable row level security;
create policy "own templates" on quick_templates
  for all using (user_id = auth.uid() and is_allowed())
  with check (user_id = auth.uid() and is_allowed());
create index quick_templates_user_id_idx on quick_templates (user_id);

-- ---------------------------------------------------------------------------
-- 8. Balance derivado por cuenta (nunca almacenado). security_invoker hace
--    que la vista respete la RLS del usuario que consulta, no la del dueño
--    de la vista.
-- ---------------------------------------------------------------------------
create view account_balances with (security_invoker = true) as
select
  a.id as account_id,
  a.user_id,
  a.name,
  a.opening_balance
    + coalesce((select sum(t.amount) from transactions t where t.account_id = a.id), 0)
    + coalesce((select sum(tr.amount) from transfers tr where tr.destination_account_id = a.id), 0)
    - coalesce((select sum(tr.amount) from transfers tr where tr.source_account_id = a.id), 0)
    as balance
from accounts a;

-- ---------------------------------------------------------------------------
-- 9. Resumen mensual de ingresos/gastos por categoria (para Estadisticas),
--    acotado por rango de fechas y respetando RLS (security_invoker).
-- ---------------------------------------------------------------------------
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
    c.name as category_name,
    c.kind,
    sum(t.amount) as total
  from transactions t
  join categories c on c.id = t.category_id
  where t.kind = 'normal'
    and t.occurred_at >= p_from
    and t.occurred_at <= p_to
  group by 1, 2, 3, 4
  order by 1;
$$;
