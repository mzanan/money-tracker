<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Money Tracker — convenciones del proyecto

Para overview general, leer `README.md`. Esto es lo que necesita saber un agente
para trabajar acá sin romper convenciones.

## Stack

Next 16 (App Router) + React 19 + TS strict + Tailwind v4 + shadcn/ui (radix
base, nova preset) + **Turso (libSQL) + Drizzle ORM** + **Better Auth** (con
`emailOTP` plugin + Resend para email) + TanStack React Query v5 + Zustand v5
+ react-hook-form + Zod + date-fns / date-fns-tz + sonner + next-themes +
lucide-react. Gestor: npm. Node 22 (`.nvmrc`).

Antes había Supabase (Postgres + Auth + RLS); se migró el 2026-05-25 por
portabilidad. Schema y migración one-shot documentados en el vault
(`01-Projects/02-money-tracker/tasks.md` Fase 16).

## Convenciones que importan

- **Idioma:** TODO en inglés (UI copy, identifiers, código). Sin comentarios salvo el WHY no obvio.
- **Next 16 cosas a respetar:**
  - `cookies()`, `headers()` son **async**. Siempre `await`.
  - `params` y `searchParams` en pages son **Promises**. `await props.params`.
  - El archivo es `src/proxy.ts` (no `middleware.ts`), función exportada `proxy`.
  - `next dev` ya usa Turbopack por default.
- **Auth boundary:** `src/proxy.ts` hace solo un check de **presencia** de
  cookie de sesión via `getSessionCookie` (Better Auth) — no valida. La
  validación real corre a nivel page/action con `auth.api.getSession({ headers })`
  o el wrapper `requireUser()` en `src/lib/session.ts`. Edge runtime no puede
  cargar libSQL, por eso el proxy es fast-path.
- **RLS perdida:** Better Auth no tiene equivalente. **Cada** query Drizzle
  debe incluir `eq(table.user_id, user.id)` en el `where`. Un olvido = leak
  cross-user. Pattern obligatorio en server actions / data fetchers.
- **Server Actions** viven en `src/lib/actions/*.ts` con `"use server"` arriba.
  Validar input con Zod (schemas en `src/lib/schemas/`). Devolver
  `ActionResult<T>` discriminado. Obtener user via `getUser()`/`requireUser()`
  (NUNCA construir db sin user_id filter).
- **Snapshot de FX:** cada `transactions` row guarda `fx_rates_snapshot` (jsonb
  USD-based) al momento de crear. Los totales siempre se calculan con esa
  snapshot (`transactionInDisplay` / `periodTotals` / `dayTotalsList` /
  `filterByAmount` no aceptan rates live). El único consumer de `useRates`
  es el preview live en `quickAddForm`.
- **Preferences server-readable:** preferencias de UI que no deben tener flash
  al recargar (ej. `hide-amounts`) se guardan en cookie (`mt_*`) leída en
  `(app)/layout.tsx` server-side y pasada a un Provider. Split convención:
  `lib/preferences.ts` (constantes client-safe) + `lib/preferences.server.ts`
  (reader con `next/headers`). Nunca importar el `.server.ts` desde client.
- **Decimales por moneda:** usar `getCurrency(code).decimals` siempre que
  redondees o formatees. VND/JPY/KRW/CLP = 0 decimales. Nunca hardcodear 2.
- **Huso horario:** `occurred_on` es un `date` puro (sin hora). Se asigna al
  cargar usando `useTimezone()` (override de settings, o auto-detect del
  dispositivo). Cambiar el huso **NO** debe re-mapear registros viejos.
- **No commits/PRs automáticos.** Siempre preguntar antes (regla del vault
  personal-brain).

## Data ingestion model

Cuatro fuentes, tres caminos de ingreso a la DB:

- **Bybit (automatizado):** API sync vía `/v5/asset/fundinghistory`. Captura
  QR Pay debits, deposits/withdrawals, Earn rewards. Tipos cuyo
  `showBusiTypeEn` matchea `/transfer|trf|asset.*exchange|sub.account/i` se
  excluyen (son movimientos internos entre cuentas del mismo usuario).
  Adapter en `src/lib/integrations/bybit.ts`.
- **Wise + Astropay (semi-auto):** CSV con preset. En `/settings` → "Import
  or paste CSV" → dropdown "Format" elige el preset, que pre-rellena columnas
  y setea `source`. Si ya hay transacciones de ese source en DB, `sinceDate`
  defaultea a `max(occurred_on) + 1 día`. Presets en `src/lib/csv-presets.ts`.
- **Cash + entradas manuales:** `QuickAddForm` en home. Tiene autocomplete de
  categories y merchants (notes) basado en los últimos 200 transactions.

Todos los paths terminan en `buildTransactionRow` (`src/lib/transactions.ts`)
que snapshotea FX rates y setea source/external_id. Dedup vía unique
`(user_id, source, external_id)` (migración 004) hace los upserts idempotentes.

## Reglas de hooks que ya pegaron acá

- `react-hooks/set-state-in-effect`: no llamar `setState` dentro de un
  `useEffect`. Para reaccionar a props/state, derivar valores durante render o
  hacer la mutación en el handler que disparó el cambio.
- `react-hooks/use-memo`: el primer arg de `useMemo` tiene que ser un arrow
  inline (no una referencia a función).

## Cómo verificar antes de dar algo por hecho

```bash
npm run lint
npm run build
```

Build verde + lint verde = OK. El primer `next build` después de tocar código
nuevo lo más probable es que rompa por algo de Next 16 (params async, etc.).
