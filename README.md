# Money Tracker

App web personal para trackear **income + expenses** multi-moneda. Pensada para
nómade (cargás en VND y ves los totales en USD, por ejemplo). Mobile + desktop,
instalable como PWA. Live: [money.itsmatias.com](https://money.itsmatias.com).

Incluye: landing pública en `/`, sync de Bybit, import de planillas y CSV de
cualquier banco o billetera (.xlsx, .xls, .ods, .numbers, CSV) leídas por IA, import desde screenshots (también como share target de la PWA), cuenta de
efectivo con retiros y cambios, reminders con feed iCal, asistente de chat con
la API key propia del usuario (Groq o Google, detrás de un feature flag), analytics con PostHog EU y
banner de cookies, y baseline de SEO/AEO (sitemap, robots, JSON-LD, `llms.txt`).

Stack: Next.js 16 + React 19 + TypeScript + Tailwind v4 + shadcn/ui + **Turso
(libSQL) + Drizzle ORM** + **Better Auth** (Google OAuth) +
TanStack React Query + Zustand + Vercel AI SDK. Deploy: Vercel.

> Migrado desde Supabase a Turso + Better Auth el 2026-05-25 por portabilidad
> (un único `.db` exportable). Lo que perdió: Row-Level Security: todas las
> queries filtran `user_id` explícito en código. Desde entonces la app pasó a un
> libro mayor de partida doble: lee y escribe en las tablas `ledger_*`
> (`ledger_transactions`, `ledger_entries`, `ledger_external_ids`,
> `ledger_revisions`, `ledger_accounts`) más `accounts`, `user_settings`,
> `fx_rates_daily`, `api_integrations`, etc. (todas en `src/lib/db/schema.ts`).
> La tabla `transactions` anterior queda solo para los scripts de `scripts/`.

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
"Continue with Google" falla y no hay otra forma de entrar.

### 3. Variables de entorno

Copiar `.env.example` → `.env.local` y completar:

```bash
TURSO_DATABASE_URL=libsql://money-tracker-<org>.turso.io
TURSO_AUTH_TOKEN=<turso db tokens create output>

BETTER_AUTH_SECRET=$(openssl rand -base64 32)
BETTER_AUTH_URL=http://localhost:3020
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3020

GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
AUTH_DISABLE_SIGNUPS=

# cifrado AES-256-GCM de las credenciales de integraciones (32 bytes en base64)
INTEGRATIONS_ENC_KEY=$(openssl rand -base64 32)
INTEGRATIONS_ENC_KEY_OLD=      # solo al rotar la clave

# Bearer que Vercel manda a /api/cron/*
CRON_SECRET=$(openssl rand -base64 32)

# import de planillas y juez de repetidos (Experiential Labs, key del servidor)
EXPLABS_API_KEY=

# feature flags del navegador ("1" para activar, apagados por defecto)
NEXT_PUBLIC_ASSISTANT_ENABLED=
NEXT_PUBLIC_BUDGET_ENABLED=

# opcional
TURSO_EMBEDDED_REPLICA_PATH=   # réplica local embebida para lecturas rápidas
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=   # solo producción
```

### 4. Aplicar el schema

```bash
npm install
npm run db:migrate        # corre drizzle/migrations/*.sql contra Turso
```

### 5. Correr

```bash
nvm use            # node 22
npm run dev        # http://localhost:3020
```

Primer ingreso: creás la cuenta con Google, y después el
onboarding pide al menos 1 moneda + la moneda base.

---

## Scripts

- `npm run dev`: dev server (Turbopack, default en Next 16)
- `npm run build`: build de producción
- `npm run start`: servir el build
- `npm run lint`: eslint
- `npm run format`: prettier --write .
- `npm run db:generate`: generar migration SQL desde `src/lib/db/schema.ts`
- `npm run db:migrate`: aplicar migrations a Turso
- `npm run db:studio`: abrir Drizzle Studio en el browser
- `npm run seed:dev`: cargar datos de prueba en la DB de desarrollo
- `npm run check:tokens`: verificar los tokens de `tailwind-merge`

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
   - `INTEGRATIONS_ENC_KEY` (y `INTEGRATIONS_ENC_KEY_OLD` al rotar)
   - `CRON_SECRET` (el cron de tasas lo valida)
   - `EXPLABS_API_KEY` (import de planillas)
   - `NEXT_PUBLIC_ASSISTANT_ENABLED`, `NEXT_PUBLIC_BUDGET_ENABLED` (opcionales)
   - `TURSO_EMBEDDED_REPLICA_PATH` (opcional)
4. Deploy.
5. Crear tu cuenta una vez (Google).
6. **Single-user lockdown:** una vez creada tu cuenta, setear
   `AUTH_DISABLE_SIGNUPS=true` en Vercel y redeployar. Bloquea signups
   nuevos por Google. Sin esto, cualquiera con tu URL
   puede crearse cuenta.

En el celular, abrir la app deployada → "Add to Home Screen" → queda como app.

---

## Estructura

```
src/
  app/
    page.tsx                  # landing (sin sesión) o dashboard (con sesión)
    privacy/                  # política de privacidad (pública)
    (auth)/login/             # Google (Better Auth)
    (app)/                    # rutas protegidas (auth + onboarding)
      home/, dashboard/       # inicio logueado; proyección de gasto y gastos inusuales
      month/[ym]/             # vista mensual
      screenshot-import/      # import desde screenshot (share target)
      settings/               # tabs General y Accounts
    onboarding/               # primer setup (currencies + base)
    api/auth/[...all]/        # Better Auth route handler
    api/rates/                # proxy + cache de open.er-api.com
    api/cron/fx-rates/        # cron diario: tasas del día en fx_rates_daily
    api/chat/                 # asistente (Vercel AI SDK, key del usuario)
    api/screenshot/extract/   # extracción de transacciones desde una imagen
    api/session/expired/      # limpia la cookie de una sesión inválida
    api/calendar/, api/share/ # feed iCal de reminders, share target de screenshots
    robots.ts, sitemap.ts     # SEO/AEO (ver lib/seo.ts)
  components/
    ui/                       # shadcn primitives (kebab-case por vendoring)
    transactions/             # dashboard, filas, quick-add, transferencias, vista mensual
    cash/                     # retiros y cambios de efectivo (CashActionDrawer)
    settings/                 # cuentas, integraciones, import de planillas (sheet/) y CSV (csv/)
    dashboard/, reminders/, assistant/, screenshot/, onboarding/, auth/, layout/
    landing/, legal/, consent/, pwa/, providers/
  hooks/                      # useSettings, useRates, useRatesByDate, useMoney, useHideAmounts, ...
  lib/
    ledger/                   # núcleo del libro mayor: cuentas, builders, posting, valuación, movimientos
    data/                     # lecturas y escrituras a Turso (ledgerWrites, monthData, sheetImports, ...)
    actions/                  # server actions (transactions, transfers, cash, settings, integrations, ...)
    sheetImport/              # lógica pura del import de planillas (receta, dedupe, plan, review)
    csv/                      # parse + detect + normalize + presets (Wise)
    fx/                       # tasas históricas y de cripto
    ai/                       # provider, prompt, herramientas del asistente, receta, juez de repetidos, screenshots
    integrations/             # adaptador de Bybit + cifrado de credenciales
    constants/                # monedas (scale de almacenamiento), fuentes, proveedores de IA, tags
    schemas/                  # Zod
    db/                       # schema.ts + cliente libSQL (proxy lazy)
    auth.ts, authClient.ts, session.ts   # Better Auth (server, browser) y getUser()/requireUser()
    currency.ts, rates.ts, dates.ts      # convert/format/round, fetch + cache de tasas, fechas con tz
    featureFlags.ts           # NEXT_PUBLIC_ASSISTANT_ENABLED / NEXT_PUBLIC_BUDGET_ENABLED
    analytics.ts, consent.ts, seo.ts
  stores/uiStore.ts           # Zustand (lastCurrency)
  types/                      # db.ts (derivados de Drizzle), ledger.ts (Movement, MovementLine, ...)
  proxy.ts                    # ex-middleware (Next 16): cookie check + gate (/ público)
drizzle/migrations/           # SQL generado por drizzle-kit
scripts/                      # backfills, seed:dev, migrate-to-ledger, evals del import de planillas
```

---

## Decisiones clave

- **Libro mayor de partida doble**: cada movimiento es una `ledger_transactions`
  con sus `ledger_entries` (una por cuenta y moneda, en unidades menores
  enteras). Las cuentas son `asset` (las que ves como tabs), `expense`,
  `income`, `bridge`, `pending`, `transit` y `equity` (saldos iniciales). Los
  roles de línea son `amount`, `fee`, `spread` y `withdrawal`. Cada edición
  guarda una versión previa en `ledger_revisions`. Todo se escribe con los
  builders de `src/lib/ledger/` y `src/lib/data/ledgerWrites.ts`.
- **Valuación con tasas diarias**: no hay snapshot de FX por fila. Cada línea se
  valúa con la tasa de `fx_rates_daily` de su propia fecha (o la anterior más
  cercana), vía `src/lib/ledger/valuation.ts`; por eso los totales cambian si se
  elige otra moneda base. `useRates` (tasas de hoy) queda solo para estimados
  en vivo: el preview de `quickAddForm`, el de transferencias y la proyección de
  gasto.
- **Privacy toggle**: ojito al lado de "Total balance" / "Total spent"
  enmascara los aggregates. Persistido en cookie `mt_hide_amounts`
  (server-readable, sin flash al recargar).
- **Reminders**: viven en el calendar panel (toolbar del dashboard) +
  banner overdue arriba. El feed iCal (`/api/calendar/[token].ics`) los
  expone a Google/iOS/Outlook Calendar.
- **Huso horario**: `occurred_on` es un `date` puro asignado al cargar (día del
  dispositivo, o del override en settings). Cambiar el huso **no** re-mapea
  registros viejos.
- **Transferencias**: una sola `ledger_transactions` con una pata de salida en la
  cuenta origen y otra de entrada en el destino. Mientras no se acredita, el
  monto espera en una cuenta `transit` (banner y panel "in transit", se
  acredita después con la fecha real). Las comisiones son líneas con rol `fee`
  contra la cuenta `Fees`, una por cuenta que la cobró. Si el destino está en
  otra moneda, el monto recibido se carga en esa moneda y la tasa real queda
  implícita en el par de montos (el puente `bridge` equilibra cada moneda). Se
  carga desde el toggle "Transfer" del quick-add (panel del botón +), o marcando
  una fila existente desde el menú. Constructores en `src/lib/ledger/builders.ts`.
- **Monedas por cuenta**: cada cuenta puede declarar una o varias monedas en
  Settings > Accounts (`accounts.currency`, código simple o array JSON; ver
  `src/lib/accountCurrencies.ts`). Sin declarar acepta cualquier moneda; Settings
  solo sugiere la moneda si todas sus filas comparten una. Las patas de
  transferencia, la fila propia al marcar/emparejar transferencias y la moneda
  cobrada de un retiro se validan contra lo declarado. Gastos e ingresos
  comunes en otra moneda se permiten (tarjeta en el exterior). Una cuenta con
  una sola moneda declarada muestra su saldo en esa moneda, sin convertir.
  Totales por día en moneda base o, con la preferencia `mt_day_totals`, en la
  moneda de la cuenta del tab.
- **Withdrawals y efectivo**: un retiro es una transacción del libro con líneas
  de rol `withdrawal` (`src/lib/ledger/withdrawals.ts`). Puede vivir solo con
  la pata del banco (el monto entero cuenta como gasto y no queda saldo en
  efectivo); "Move to Cash" en el menú de la fila agrega la pata de efectivo
  (monto pre-rellenado desde la nota y editable), y "Undo move to Cash" la
  quita. La comisión del cajero NO se borra al deshacer: es plata efectivamente
  pagada. Los retiros y cambios nuevos se cargan desde el dashboard o desde el
  tab de la cuenta de efectivo (`CashActionDrawer`), no desde Settings.
- **Mes de presupuesto**: transferencias, retiros y movimientos propios (no los
  cambios de moneda) se pueden mover al mes siguiente desde el menú de la fila
  (`budget_month` en `ledger_transactions`, nullable). `occurred_on` nunca se
  toca; todo bucketing mensual lee `effectiveYearMonth({ occurredOn,
  budgetMonth })` (`src/lib/dates.ts`), no `occurred_on` directo. En la vista
  mensual la fila movida sigue visible en su mes real (badge "Moved to {mes}",
  monto atenuado, no suma en los totales) y aparece además en el mes destino
  dentro de un grupo "Carried over from {mes}" (badge "From {mes}", ese sí suma
  en los totales, con sus propios totales en la cabecera del grupo). Una fila con
  `budget_month` queda bloqueada para cambiarle la fecha o mergearla como
  duplicada hasta que se la devuelva a su mes real.
- **Auth**: solo Google OAuth vía Better Auth (email+password apagado el
  2026-10-06; las cuentas viejas con contraseña entran con Google y se
  vinculan solas). `AUTH_DISABLE_SIGNUPS=true` bloquea registros nuevos
  (single-user). El OTP por email se descartó el 2026-06-11: dependía de
  Resend y nunca se configuró en prod.
- **Tasas**: [open.er-api.com](https://open.er-api.com): gratis sin API key,
  incluye VND. Cacheada en `fx_rates_cache` (Turso) para estimados en vivo. Si el
  proveedor cae, se sirve la cache stale.
- **Tasas históricas** (base de toda la valuación): un cron de Vercel (01:00 UTC, `CRON_SECRET`) guarda
  cada día las tasas de open.er-api + Bybit en `fx_rates_daily` (una fila por
  fecha UTC). El pasado se cargó una sola vez con
  `tsx scripts/backfill-fx-rates.ts --apply` (fiat de
  [exchange-api](https://github.com/fawazahmed0/exchange-api) desde
  2024-03-02, cripto del precio de apertura de las velas diarias de Bybit). Si Bybit
  falla, la fila se guarda solo con fiat (`source: open.er-api`) y el backfill
  la completa al re-ejecutarlo. `readFxRatesForDate` usa la fecha pedida o la
  anterior más cercana.
- **Analytics**: PostHog EU vía el proxy `/relay`, solo en producción. Banner
  de cookies con `cookieless_mode: "on_reject"` (sin consentimiento no hay
  cookies) y opción para cambiarlo en Settings. `?notrack=1` en cualquier URL
  excluye ese navegador (`?notrack=0` lo vuelve a incluir).
- **Asistente**: chat opcional que corre con la API key propia del usuario
  (Groq o Google, en Settings → General). Sin key del sistema como fallback. El
  widget solo aparece con `NEXT_PUBLIC_ASSISTANT_ENABLED=1`
  (`src/lib/featureFlags.ts`); `NEXT_PUBLIC_BUDGET_ENABLED=1` activa el panel de
  presupuesto. Chat y screenshots usan la key del usuario; el import de planillas
  y el juez de repetidos usan la key del servidor `EXPLABS_API_KEY`.
- **Import de planillas y CSV**: genérico para cualquier usuario, cuenta y
  archivo. La IA (claude-haiku-5.5 vía Experiential Labs, key del servidor,
  gratis para el usuario) lee las primeras y últimas filas de cada pestaña y
  devuelve una receta (qué columna es fecha, monto, descripción); código
  determinístico la aplica a todas las filas y el usuario confirma una vista
  previa. Un export exacto de Wise es el único formato fijo y va al import CSV
  con preset (`src/lib/csv/presets.ts`); si cambia una columna, pasa por la IA.
  - **Lectura guardada**: la receta se guarda por usuario y encabezados
    (`sheet_import_layouts`). Al volver a subir, si la lectura nueva da otras
    filas que la guardada, la vista previa pide elegir cuál usar.
  - **Repetidos**: cada fila lleva un id estable (fecha + monto + descripción +
    ocurrencia). Orden de chequeo: id propio, hash del import CSV viejo, misma
    fila releída en la misma cuenta, descripción con palabras completas, y por
    último la IA compara descripciones. Las filas ya importadas reservan su
    movimiento antes del chequeo. Lo repetido sale destildado.
  - **Historial y deshacer**: cada import queda en `sheet_imports` /
    `sheet_import_rows` y se puede deshacer desde "Recent imports".
  - **Privacidad**: Experiential Labs recibe esas filas de muestra y, para los
    repetidos, pares de descripciones sin montos; puede guardarlos según su
    política. Figura en `/privacy`. Si se quedan sin créditos, el import falla.
- **Categorías**: free-text, opcional, con autocomplete (datalist) de las
  recientes.
- **Sugerencias de descripción** (QuickAdd y formulario de edición, duplicar y
  pagar): al escribir la descripción se ofrecen hasta 4 entradas manuales
  previas (`src/lib/entrySuggestions.ts`, sin IA). Elegir una completa la
  descripción; el tipo, salvo en filas bloqueadas, transacciones existentes y
  pagos de recordatorios; monto, moneda y tags solo si están vacíos o los puso
  una sugerencia anterior, y la moneda solo si la cuenta la acepta. Nunca cambia
  la cuenta. Excluye transferencias, retiros, fees, CSV y filas sincronizadas.
- **Sin RLS**: cada query Drizzle filtra `eq(table.user_id, user.id)` en
  código. Patrón obligatorio en `src/lib/actions/*` y `src/lib/data/*`.

Más detalle en `~/Documents/projects/personal/personal-brain/01-Projects/02-money-tracker/`.
