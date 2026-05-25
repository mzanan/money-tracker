# Money Tracker

App web personal para trackear **income + expenses** multi-moneda. Pensada para
nómade (cargás en VND y ves los totales en USD, por ejemplo). Mobile + desktop,
instalable como PWA.

Stack: Next.js 16 + React 19 + TypeScript + Tailwind v4 + shadcn/ui + **Turso
(libSQL) + Drizzle ORM** + **Better Auth** (emailOTP + Resend) + TanStack
React Query + Zustand. Deploy: Vercel.

> Migrado desde Supabase a Turso + Better Auth el 2026-05-25 por portabilidad
> (un único `.db` exportable). El schema de tablas no cambió: `transactions`,
> `user_settings`, `fx_rates_cache`, `api_integrations`. Lo que perdió:
> Row-Level Security — todas las queries filtran `user_id` explícito en código.

---

## Setup

### 1. Crear la DB en Turso

```bash
brew install tursodatabase/tap/turso       # o curl -sSfL https://get.tur.so/install.sh | bash
turso auth login
turso db create money-tracker
turso db show money-tracker --url          # → TURSO_DATABASE_URL
turso db tokens create money-tracker       # → TURSO_AUTH_TOKEN
```

### 2. Crear el Resend API key (email transaccional)

[resend.com](https://resend.com) → API Keys → Create. Sin esto, los OTPs
caen a `console.log` (dev fallback). Para producción, verificá un dominio
en Resend o usá el sandbox `onboarding@resend.dev`.

### 3. Variables de entorno

Copiar `.env.example` → `.env.local` y completar:

```bash
TURSO_DATABASE_URL=libsql://money-tracker-<org>.turso.io
TURSO_AUTH_TOKEN=<turso db tokens create output>

BETTER_AUTH_SECRET=$(openssl rand -base64 32)
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000

RESEND_API_KEY=re_...
EMAIL_FROM="Money <onboarding@resend.dev>"
```

### 4. Aplicar el schema

```bash
npm install
npm run db:migrate        # corre drizzle/migrations/*.sql contra Turso
```

### 5. Migrar data existente (solo si venís de Supabase)

```bash
# Agregar al .env.local:
#   SUPABASE_URL=
#   SUPABASE_SERVICE_ROLE_KEY=     # Supabase dashboard → Settings → API
npm run migrate:fromSupabase
```

El script es idempotente y preserva UUIDs. **Passwords NO migran** (Better
Auth y Supabase usan hashes incompatibles); para entrar usá el OTP. Cuando
hayas validado todo:

```bash
npm uninstall @supabase/supabase-js @supabase/ssr
rm -rf supabase/migrations
```

### 6. Correr

```bash
nvm use            # node 22
npm run dev        # http://localhost:3000
```

Primer ingreso: pide el email, te llega un código de 6 dígitos, lo pegás, y
después el onboarding pide al menos 1 moneda + la moneda base.

---

## Scripts

- `npm run dev` — dev server (Turbopack, default en Next 16)
- `npm run build` — build de producción
- `npm run start` — servir el build
- `npm run lint` — eslint
- `npm run format` — prettier --write .
- `npm run db:generate` — generar migration SQL desde `src/lib/db/schema.ts`
- `npm run db:migrate` — aplicar migrations a Turso
- `npm run db:studio` — abrir Drizzle Studio en el browser
- `npm run migrate:fromSupabase` — one-shot data migration desde Supabase

---

## Deploy a Vercel

1. Pushear el repo a GitHub (privado). **Pedir confirmación antes de commitear.**
2. En Vercel: New Project → importar el repo. Framework auto-detect = Next.js.
3. Settings → Environment Variables (Production + Preview):
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `BETTER_AUTH_SECRET`
   - `BETTER_AUTH_URL` (la URL prod de Vercel, ej `https://money.vercel.app`)
   - `NEXT_PUBLIC_BETTER_AUTH_URL` (igual)
   - `RESEND_API_KEY`
   - `EMAIL_FROM` (dominio verificado en Resend)
4. Deploy.
5. Loguearte una vez con tu email para crear la cuenta.
6. **Single-user lockdown:** una vez creada tu cuenta, considerar setear
   `emailAndPassword.disableSignUp: true` en `src/lib/auth.ts` y verificar que
   el plugin OTP no permita crear nuevos usuarios (depende de versión —
   chequear docs de Better Auth). Sin esto, cualquiera con tu URL puede
   crearse cuenta vía OTP.

En el celular, abrir la app deployada → "Add to Home Screen" → queda como app.

---

## Estructura

```
src/
  app/
    (auth)/login/             # OTP de 6 dígitos (Better Auth)
    (app)/                    # rutas protegidas (auth + onboarding)
      page.tsx                # dashboard: quick-add + mes actual
      month/[ym]/             # vista mensual
      settings/               # editar monedas, base, huso, integraciones, CSV
    onboarding/               # primer setup (currencies + base)
    api/auth/[...all]/        # Better Auth route handler
    api/rates/                # proxy + cache de open.er-api.com
    layout.tsx, manifest.ts
  components/
    transactions/             # balanceHero, sourcePills, monthView, ...
    layout/                   # header, displayControls, themeToggle
    onboarding/               # onboardingForm
    settings/                 # csvImportCard, integrations*
    providers/                # query, theme, toaster
    ui/                       # shadcn primitives (kebab-case por vendoring)
  config/currencies.ts        # ISO 4217 con decimals oficial
  hooks/                      # useSettings, useRates, useTimezone, useCsvImport
  lib/
    actions/                  # server actions (transactions, settings, csv, integrations)
    schemas/                  # Zod
    db/                       # schema.ts + libSQL client (lazy proxy)
    auth.ts                   # Better Auth server config
    authClient.ts             # Better Auth browser client
    session.ts                # getUser() / requireUser()
    email.ts                  # Resend wrapper
    currency.ts               # convert / format / round (puro)
    rates.ts                  # fetch + cache (server-only)
    totals.ts                 # day/month totals
    dates.ts                  # helpers de fecha (date-fns + tz)
    integrations/             # Bybit adapter (funding history)
    csv/                      # parse + detect + normalize
  stores/uiStore.ts           # Zustand (displayMode, lastCurrency)
  types/db.ts                 # tipos derivados de Drizzle ($inferSelect)
  proxy.ts                    # ex-middleware (Next 16): cookie check + gate
drizzle/migrations/           # SQL generado por drizzle-kit
scripts/migrateFromSupabase.ts   # one-shot data migration
```

---

## Decisiones clave

- **Snapshot de FX por fila**: cada `transactions` row guarda un
  `fx_rates_snapshot` (JSON USD-based) al cargar. Los totales históricos no se
  mueven aunque cambien las tasas o la moneda base.
- **Display modes**:
  - `snapshot` (default): usa las tasas congeladas en cada fila.
  - `today`: recalcula con las tasas live (toggle en el header).
- **Huso horario**: `occurred_on` es un `date` puro asignado al cargar (día del
  dispositivo, o del override en settings). Cambiar el huso **no** re-mapea
  registros viejos.
- **Auth**: OTP de 6 dígitos por email vía Better Auth `emailOTP` plugin
  (mejor que magic link en PWAs — el link abre otro browser y rompe la
  sesión). Resend manda el email.
- **Tasas**: [open.er-api.com](https://open.er-api.com) — gratis sin API key,
  incluye VND. Cacheada en `fx_rates_cache` (Turso). Si el proveedor cae, se
  sirve la cache stale.
- **Categorías**: free-text, opcional, con autocomplete (datalist) de las
  recientes.
- **Sin RLS**: cada query Drizzle filtra `eq(table.user_id, user.id)` en
  código. Patrón obligatorio en `src/lib/actions/*` y `src/lib/data/*`.

Más detalle en `~/Documents/projects/personal/personal-brain/01-Projects/02-money-tracker/`.
