# Money Tracker

App web personal para trackear **income + expenses** multi-moneda. Pensada para
nómade (cargás en VND y ves los totales en USD, por ejemplo). Mobile + desktop,
instalable como PWA.

Stack: Next.js 16 + React 19 + TypeScript + Tailwind v4 + shadcn/ui + **Turso
(libSQL) + Drizzle ORM** + **Better Auth** (email+password + Google OAuth) +
TanStack React Query + Zustand. Deploy: Vercel.

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

### 2. Crear el OAuth client de Google (opcional)

[console.cloud.google.com](https://console.cloud.google.com) → APIs & Services
→ Credentials → Create OAuth client ID (Web application). Redirect URIs:
`http://localhost:3020/api/auth/callback/google` y
`https://money.itsmatias.com/api/auth/callback/google`. Sin esto, el botón
"Continue with Google" falla; email+password sigue funcionando.

### 3. Variables de entorno

Copiar `.env.example` → `.env.local` y completar:

```bash
TURSO_DATABASE_URL=libsql://money-tracker-<org>.turso.io
TURSO_AUTH_TOKEN=<turso db tokens create output>

BETTER_AUTH_SECRET=$(openssl rand -base64 32)
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000

GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
AUTH_DISABLE_SIGNUPS=
```

### 4. Aplicar el schema

```bash
npm install
npm run db:migrate        # corre drizzle/migrations/*.sql contra Turso
```

### 5. Correr

```bash
nvm use            # node 22
npm run dev        # http://localhost:3000
```

Primer ingreso: creás la cuenta con email+password (o Google), y después el
onboarding pide al menos 1 moneda + la moneda base.

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

---

## Deploy a Vercel

1. Pushear el repo a GitHub (privado). **Pedir confirmación antes de commitear.**
2. En Vercel: New Project → importar el repo. Framework auto-detect = Next.js.
3. Settings → Environment Variables (Production + Preview):
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `BETTER_AUTH_SECRET`
   - `BETTER_AUTH_URL` (la URL prod, `https://money.itsmatias.com`)
   - `NEXT_PUBLIC_BETTER_AUTH_URL` (igual)
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
4. Deploy.
5. Crear tu cuenta una vez (sign-up o Google).
6. **Single-user lockdown:** una vez creada tu cuenta, setear
   `AUTH_DISABLE_SIGNUPS=true` en Vercel y redeployar. Bloquea signups
   nuevos por email+password y por Google. Sin esto, cualquiera con tu URL
   puede crearse cuenta.

En el celular, abrir la app deployada → "Add to Home Screen" → queda como app.

---

## Estructura

```
src/
  app/
    (auth)/login/             # email+password + Google (Better Auth)
    (app)/                    # rutas protegidas (auth + onboarding)
      page.tsx                # dashboard: quick-add + mes actual
      month/[ym]/             # vista mensual
      settings/               # editar monedas, base, huso, integraciones, CSV
    onboarding/               # primer setup (currencies + base)
    api/auth/[...all]/        # Better Auth route handler
    api/rates/                # proxy + cache de open.er-api.com
    layout.tsx, manifest.ts
  components/
    auth/                     # loginCard + useLogin
    transactions/             # balanceHero (Monthly/Daily tabs), sourceFilter, monthView, amountsToggle, ...
    layout/                   # header, baseCurrencyPicker, themeToggle
    reminders/                # upcomingBanner, reminderRow, reminderForm
    onboarding/               # onboardingForm
    settings/                 # csvImportCard, integrations*
    providers/                # query, theme, toaster
    screenshot/               # screenshotImporter (drawer + share target page)
    ui/                       # shadcn primitives (kebab-case por vendoring)
  hooks/                      # useSettings, useRates, useTimezone, useCsvImport
  lib/
    actions/                  # server actions (transactions, settings, csv, integrations)
    constants/currencies.ts   # ISO 4217 con decimals oficial
    schemas/                  # Zod
    db/                       # schema.ts + libSQL client (lazy proxy)
    auth.ts                   # Better Auth server config
    authClient.ts             # Better Auth browser client
    session.ts                # getUser() / requireUser()
    currency.ts               # convert / format / round (puro)
    rates.ts                  # fetch + cache (server-only)
    totals.ts                 # day/month totals
    dates.ts                  # helpers de fecha (date-fns + tz)
    integrations/             # Bybit adapter (funding history)
    csv/                      # parse + detect + normalize
  stores/uiStore.ts           # Zustand (lastCurrency)
  hooks/useHideAmounts.tsx    # mask totals via mt_hide_amounts cookie
  types/db.ts                 # tipos derivados de Drizzle ($inferSelect)
  proxy.ts                    # ex-middleware (Next 16): cookie check + gate
drizzle/migrations/           # SQL generado por drizzle-kit
```

---

## Decisiones clave

- **Snapshot de FX por fila**: cada `transactions` row guarda un
  `fx_rates_snapshot` (JSON USD-based) al cargar. Los totales siempre se
  calculan con esa snapshot, así no se mueven aunque cambien las tasas o la
  moneda base. `useRates` queda solo para el preview live en `quickAddForm`.
- **Privacy toggle**: ojito al lado de "Total balance" / "Total spent"
  enmascara los aggregates. Persistido en cookie `mt_hide_amounts`
  (server-readable, sin flash al recargar).
- **Reminders**: viven en el calendar panel (toolbar del dashboard) +
  banner overdue arriba. El feed iCal (`/api/calendar/[token].ics`) los
  expone a Google/iOS/Outlook Calendar.
- **Huso horario**: `occurred_on` es un `date` puro asignado al cargar (día del
  dispositivo, o del override en settings). Cambiar el huso **no** re-mapea
  registros viejos.
- **Transferencias**: toda fila con `transfer_group` guarda el monto **neto en
  tránsito**, ya descontadas las comisiones. Cada comisión es una fila de gasto
  aparte, sin `transfer_group`, en la cuenta que la cobró: `transferfee:<grupo>`
  para el origen y `transferfee:<grupo>:dest` para el destino. Así la comisión
  suma una sola vez, tanto en el tab de la cuenta (que cuenta las
  transferencias) como en All (que las excluye). Si el destino está en otra
  moneda, el monto recibido se carga en esa moneda y la tasa real queda
  implícita en el par de montos, no se guarda aparte. Se carga desde el toggle
  "Transfer" del quick-add, o marcando una fila existente desde el menú.
  Disponible en cuentas csv y en cash (solo con cash habilitado), nunca en
  cuentas sincronizadas ni en el tab All.
- **Mes de presupuesto**: transfers y withdrawals (fila con `transfer_group`
  o `external_id` de withdrawal/fee) se pueden mover al mes siguiente desde
  el menú de la fila (`budget_month`, nullable). `occurred_on` nunca se
  toca; todo bucketing mensual en dashboard lee `effectiveYearMonth(tx)`
  (`budget_month ?? occurred_on.slice(0, 7)`), no `occurred_on` directo.
  En la vista mensual la fila movida sigue visible en su mes real (badge
  "Moved to {mes}", monto atenuado, no suma en los totales) y aparece
  además en el mes destino dentro de un grupo "Carried over from {mes}"
  (badge "From {mes}", ese sí suma en los totales, con sus propios totales
  en la cabecera del grupo). El mes destino se calcula una sola vez desde
  el `occurred_on` más viejo del grupo, y solo se marcan las patas cuyo mes
  natural difiera de ese destino. Una fila con `budget_month` queda
  bloqueada para cambiarle la fecha o mergearla como duplicada hasta que
  se la devuelva a su mes real.
- **Auth**: email+password + Google OAuth vía Better Auth.
  `AUTH_DISABLE_SIGNUPS=true` bloquea registros nuevos en ambos métodos
  (single-user). El OTP por email se descartó el 2026-06-11: dependía de
  Resend y nunca se configuró en prod.
- **Tasas**: [open.er-api.com](https://open.er-api.com) — gratis sin API key,
  incluye VND. Cacheada en `fx_rates_cache` (Turso). Si el proveedor cae, se
  sirve la cache stale.
- **Categorías**: free-text, opcional, con autocomplete (datalist) de las
  recientes.
- **Sin RLS**: cada query Drizzle filtra `eq(table.user_id, user.id)` en
  código. Patrón obligatorio en `src/lib/actions/*` y `src/lib/data/*`.

Más detalle en `~/Documents/projects/personal/personal-brain/01-Projects/02-money-tracker/`.
