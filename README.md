# Finanzas

App personal de finanzas (cuentas, categorías, ingresos/gastos, transferencias,
plantillas rápidas, historial, estadísticas). Acceso restringido a un grupo
reducido de personas mediante su cuenta de GitHub — sin registro público.

Arquitectura y decisiones: ver [`.claude/plans/validated-imagining-clover.md`](.claude/plans/validated-imagining-clover.md)
(o el historial de la conversación de análisis). En resumen: React + Vite +
Tailwind, Supabase solo como base de datos (Postgres + Row Level Security),
login con "Sign in with GitHub", hosting en GitHub Pages. Todo dentro de
planes gratuitos.

## 1. Configurar Supabase (una sola vez)

1. Crea un proyecto gratuito en [supabase.com](https://supabase.com) (tú, no
   un agente — requiere tu propia cuenta).
2. En **SQL Editor**, ejecuta en orden el contenido completo de cada archivo
   de [`supabase/migrations/`](supabase/migrations/), uno por uno, en orden
   numérico (`0001_init.sql`, `0002_grants.sql`, `0003_piggy_and_recurring.sql`,
   `0004_fix_uncategorized_stats.sql`, y cualquiera que se añada después con
   un número mayor). El `0002` (permisos base para el rol `authenticated`)
   es el que más se olvida — sin él Postgres rechaza cualquier consulta
   antes incluso de evaluar RLS, con un error de tipo "permission denied for
   table ...". Si creaste el proyecto con "Exponer automáticamente nuevas
   tablas" desactivado (recomendado), este paso es obligatorio, no opcional.
3. En **Authentication → Providers**, activa **GitHub** como proveedor OAuth.
   Para obtener el *Client ID* y *Client Secret* que te pide:
   - Ve a GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**.
   - *Homepage URL*: la URL donde quedará publicada la app (ej.
     `https://tu-usuario.github.io/tu-repo/`).
   - *Authorization callback URL*: la que te muestra Supabase en esa misma
     pantalla (termina en `/auth/v1/callback`).
   - Copia el Client ID y genera un Client Secret; pégalos en Supabase.
4. En **Authentication → Providers → Email**, puedes dejar el proveedor de
   email deshabilitado — no se usa en esta app.
5. Autoriza a las 2-5 personas: en **SQL Editor**,

   ```sql
   insert into allowed_users (github_username, note) values
     ('tu-usuario-de-github', 'yo'),
     ('otro-usuario', 'familiar');
   ```

   Revocar acceso = `delete from allowed_users where github_username = '...'`.
6. En **Project Settings → API**, copia la **Project URL** y la **anon
   public key** — las necesitas en el paso 2 de abajo. (La anon key está
   pensada para ser pública: la protección real la da RLS, no mantenerla en
   secreto — ver el análisis de arquitectura para el detalle.)

## 2. Configurar el proyecto en local

```bash
cp .env.example .env.local
```

Edita `.env.local` con la `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` del
paso anterior. Luego:

```bash
npm install
npm run dev
```

## 3. Publicar en GitHub Pages

1. En el repositorio de GitHub: **Settings → Pages → Source → GitHub
   Actions**.
2. En **Settings → Secrets and variables → Actions**, crea dos *repository
   secrets*: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (los mismos
   valores de tu `.env.local`).
3. Al hacer push a `main`, el workflow
   [`deploy.yml`](.github/workflows/deploy.yml) construye y publica la app
   automáticamente. La URL queda en la pestaña **Actions** tras el primer
   despliegue, o en Settings → Pages.
4. Importante: una vez publicada, vuelve al paso 1.3 y actualiza la
   *Homepage URL* del OAuth App de GitHub (y revisa que la *callback URL*
   siga siendo la de Supabase) con la URL real de GitHub Pages.

El workflow [`keepalive.yml`](.github/workflows/keepalive.yml) hace un ping
semanal a Supabase para evitar la suspensión automática del proyecto tras 7
días sin actividad (plan gratuito). Usa los mismos secrets.

## Notas de arquitectura (resumen)

- **Un solo proyecto Supabase para todos los usuarios**, aislamiento por fila
  vía RLS (`user_id = auth.uid() and is_allowed()`), no una base de datos por
  persona.
- **Los saldos nunca se guardan**, siempre se derivan sumando transacciones y
  transferencias (`account_balances`, en la migración SQL) — evita que una
  sincronización repetida corrompa un saldo.
- **Las transferencias son una tabla propia**, nunca dos filas de
  transacción, para que no puedan colarse en los totales de ingresos/gastos
  y para que sean atómicas.
- **Los ajustes de saldo** son una transacción normal con `kind='adjustment'`,
  no una mutación directa de un número — se conserva el historial completo.
- **Importes en centavos (enteros)**, nunca `float`, para evitar errores de
  redondeo.
- **Categorías fijas** (lista cerrada, solo se personaliza el ícono) para
  mantener los informes simples — ver `FIXED_CATEGORIES` en
  `src/data/categories.ts`.
- **Cuentas tipo "alcancía"** se excluyen del saldo disponible mostrado en
  Inicio/Movimientos, pero siguen registrando su propio historial.
- **Plantillas recurrentes** ("gasto fijo") se aplican solas la primera vez
  que se abre la app en o después del día configurado cada mes — no hay
  ningún proceso en segundo plano (la app no tiene servidor propio), así que
  no es automático si nadie abre la app ese mes.
- Offline real (consultar y registrar movimientos sin conexión, sincronizado
  entre dispositivos) es Nivel 2 del plan, pendiente — hoy la app requiere
  conexión.

## Comandos

```bash
npm run dev      # servidor de desarrollo
npm run build    # build de producción (incluye chequeo de tipos)
npm run lint     # lint
npm run preview  # sirve el build de producción localmente
```
