<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Money Tracker: project conventions

For the general overview read `README.md`. This is what an agent needs to know to work here without breaking conventions.

## Stack

Next 16 (App Router) + React 19 + TS strict + Tailwind v4 + shadcn/ui (`base-nova`: Base UI for `dropdown-menu`, `dialog` and `drawer`, Radix for the rest; `vaul` removed) + **Turso (libSQL) + Drizzle ORM** + **Better Auth** (Google OAuth only) + TanStack React Query v5 + Zustand v5 + react-hook-form + Zod + date-fns / date-fns-tz + sonner + next-themes + lucide-react + Vercel AI SDK (chat and screenshots: Groq / Google with the user's key; spreadsheet import and its duplicate judge: claude-haiku-5.5 through Experiential Labs with the server key `EXPLABS_API_KEY`, `@ai-sdk/anthropic`). Package manager: npm. Node 22 (`.nvmrc`). Dev server on port 3020.

Supabase (Postgres + Auth + RLS) was migrated away on 2026-05-25 for portability. Schema and the one-shot migration are documented in the vault (`01-Projects/02-money-tracker/`).

## Conventions that matter

- **Language:** EVERYTHING in English (UI copy, identifiers, code).
- **Next 16 specifics:**
  - `cookies()` and `headers()` are **async**. Always `await`.
  - `params` and `searchParams` in pages are **Promises**. `await props.params`.
  - The file is `src/proxy.ts` (not `middleware.ts`), exported function `proxy`.
  - `next dev` uses Turbopack by default.
- **Auth boundary:** `src/proxy.ts` only checks the **presence** of the session cookie via `getSessionCookie` (Better Auth), it does not validate. Real validation runs at page/action level with `auth.api.getSession({ headers })` or the `requireUser()` wrapper in `src/lib/session.ts`. The edge runtime cannot load libSQL, so the proxy is a fast path. `/` is public: it serves the landing to visitors without a session and the dashboard to signed-in users (served from the app layout so navigation shows the skeleton instantly). `/privacy` is public too. When the cookie is present but the session is invalid, the app layout and `requireUser()` redirect to `/api/session/expired`, which clears the auth cookies and returns to the landing only when it also sees no session. It never signs out a session it sees as valid (a valid session or a lookup error retries `/` once, then answers 503 instead of looping).
- **No RLS:** Better Auth has no equivalent. **Every** Drizzle query must include `eq(table.user_id, user.id)` in the `where`. A miss = cross-user leak. Mandatory pattern in server actions and data fetchers.
- **Server Actions** live in `src/lib/actions/*.ts` with `"use server"` on top. Validate input with Zod (schemas in `src/lib/schemas/`). Return a discriminated `ActionResult<T>`. Get the user via `getUser()`/`requireUser()` (NEVER build a query without the user_id filter).
- **FX snapshot:** every `transactions` row stores `fx_rates_snapshot` (USD-based JSON) at creation. Totals always use that snapshot (`transactionInDisplay` / `periodTotals` / `dayTotalsList` / `filterByAmount` do not accept live rates). The only consumer of `useRates` is the live preview in `quickAddForm`.
- **Server-readable preferences:** UI preferences that must not flash on reload (e.g. `hide-amounts`) are stored in a cookie (`mt_*`) read server-side in `components/layout/appShell.tsx` and passed to a Provider. Split: `lib/preferences.ts` (client-safe constants) + `lib/preferences.server.ts` (reader with `next/headers`). Never import the `.server.ts` from the client.
- **Decimals per currency:** each currency declares a storage `scale` (input, parsing, math, ledger) and an optional `displayDecimals` (lists and totals). Use `roundToScale` / `toInputDigits` for amounts that are stored or edited and `formatMoney` / `roundForDisplay` for what is shown. VND/JPY/KRW/CLP scale 0; USDT/USDC scale 6, shown with 2. The scale lives in `currencies.ts`; `crypto_assets.scale` must match it (checked per currency). Never hardcode 2.
- **Timezone:** `occurred_on` is a plain `date` (no time). It is assigned at entry time using `useTimezone()` (settings override, or device auto-detect). Changing the timezone must **NOT** remap old records.
- **Budget month:** monthly bucketing reads `effectiveYearMonth(tx)` (`budget_month ?? occurred_on.slice(0, 7)`), never `occurred_on` directly. Details in `README.md`.
- **Never two stacked Drawers.** Any action triggered inside an open Drawer renders as an inner step of the same Drawer via `DrawerStepContext` (`push`/`pop`, stack in `dashboardPanel.tsx`). Every form has a `*Step.tsx` twin sharing the logic hook with its `*Dialog.tsx`; the standalone Dialog/Drawer is only used when no Drawer is open (`useDrawerStep()` returns `null`). Browser back pops one step at a time (`useHistoryClose`); a flow with its own state hooks in via `stepApi.registerBack`.
- **Header height** is the `--spacing-header` token (`h-header`); layout floors measure from it. Never hardcode header offsets.
- **Analytics:** PostHog EU through the `/relay` rewrite (rewrites defined in `lib/analytics.ts`), production only. Cookie consent banner (`components/consent`, `lib/consent.ts`) with `cookieless_mode: "on_reject"`; identify only after consent; users can change it in Settings (`analyticsConsentCard`). `?notrack=1` opts a browser out (localStorage), `?notrack=0` opts back in.
- **SEO/AEO:** `app/{robots,sitemap}.ts` + `lib/seo.ts` (`SITE_URL`, `AI_CRAWLERS`, `PRIVATE_PATHS`), `public/llms.txt`. Only the landing and `/privacy` are indexable.

## Data ingestion model

Sources and how they reach the DB:

- **Bybit (automated):** API sync via `/v5/asset/fundinghistory`. Captures QR Pay debits, deposits/withdrawals, Earn rewards. Types whose `showBusiTypeEn` matches `/transfer|trf|asset.*exchange|sub.account/i` are excluded (internal moves between the same user's accounts). Adapter in `src/lib/integrations/bybit.ts`. Auto sync can be paused per integration and a source tab can be archived.
- **Spreadsheets and CSV (any user, account and file):** Settings → Accounts → "Data import" (`components/settings/sheetImportCard.tsx`, `useSheetImport.ts`, `sheet/*`). An AI recipe (`lib/ai/sheetRecipe.ts`) says which columns hold date, amount and description; `lib/sheetImport/*` applies it to every row; the user reviews a preview and imports. Saved readings per header signature are revalidated on re-upload (`lib/sheetImport/layout.ts`). Duplicates: own stable id, old CSV content hash, re-read row, whole-word description match, then the AI judge (`lib/ai/duplicateJudge.ts`); rows matched by their own id reserve their transaction first (`claimSheetRows`). Import log and Undo in `lib/actions/sheetImportLog.ts`, `lib/data/sheetImports.ts`. Keep it generic: no per-bank or per-user logic.
- **Wise exports (only fixed format):** an exact Wise CSV is detected by `presetForCsvText` (`src/lib/csv/presets.ts`) and goes to the preset CSV flow (`csvImportCard`), which sets `source` and defaults `sinceDate` to `max(occurred_on) + 1 day`. A Wise file with a changed column goes down the AI path like any other.
- **Screenshots:** `/screenshot-import` (also a PWA share target) extracts transactions from an image with the user's AI key (`lib/ai/screenshotExtract.ts`, `lib/imageExtract.ts`).
- **Cash + manual entries:** `QuickAddForm` on home, with autocomplete of categories and merchants (notes) from the last 200 transactions. The description suggestions also run in the edit/duplicate/pay form; the catalog reaches both forms through `EntrySuggestionCatalogProvider` (mounted by `LedgerProviders`). Cash withdrawals and exchanges from Settings → Cash.
- **Opening balances:** Settings → account menu → "Opening balance" posts one transaction against the `equity` opening account (`lib/openingBalance.ts`, `lib/actions/openingBalance.ts`). Synced (`api`) accounts can't take one (`canTakeOpening`).

All paths end in `buildTransactionRow` (`src/lib/transactions.ts`), which snapshots FX rates and sets source/external_id. Dedup via the unique `(user_id, source, external_id)` (migration 004) makes upserts idempotent.

## Assistant

Optional chat widget (`components/assistant`, `/api/chat`) running on the user's own Groq or Google key (Settings → Assistant, `assistantKeyCard`). Tools in `lib/ai/assistantTools.ts`, prompt in `lib/ai/prompt.ts`, model resolution in `lib/ai/provider.ts`. No system key fallback.

## Hook rules that already bit here

- `react-hooks/set-state-in-effect`: never call `setState` inside a `useEffect`. To react to props/state, derive values during render or do the mutation in the handler that caused the change.
- `react-hooks/use-memo`: the first argument of `useMemo` must be an inline arrow (not a function reference).

## How to verify before calling something done

```bash
npm run lint
npm run build
```

Green build + green lint = OK. The first `next build` after touching new code most likely breaks on something Next 16 specific (async params, etc.).
