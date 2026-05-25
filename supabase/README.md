# Supabase — provisioning

El schema vive en `migrations/`. Para levantarlo en un proyecto Supabase nuevo:

## Opción A — SQL editor (la más simple)

1. Crear un proyecto en [supabase.com](https://supabase.com).
2. En el dashboard ir a **SQL Editor** → **New query**.
3. Pegar y correr, en orden:
   - `migrations/001_initial_schema.sql`
   - `migrations/002_rls_policies.sql`
4. Copiar **Project URL** y **anon key** desde **Project Settings → API** a `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Opción B — Supabase CLI

```bash
npx supabase link --project-ref <ref>
npx supabase db push
```

## Auth

En **Authentication → Providers → Email**: habilitar el provider y dejar
**Confirm email** activado (el login es por OTP de 6 dígitos / magic link).

En **Authentication → URL Configuration** agregar a _Redirect URLs_:

- `http://localhost:3000/**`
- la URL de Vercel cuando se deployee (`https://<app>.vercel.app/**`)

Después de crear la cuenta personal, **desactivar signups públicos**
(Authentication → Sign In / Providers → _Allow new users to sign up_ en off).

## Tablas

| Tabla            | Rol                                                                 |
| ---------------- | ------------------------------------------------------------------- |
| `transactions`   | income/expense, con snapshot de tasas FX por fila                   |
| `user_settings`  | monedas elegidas, moneda base, override de huso, flag de onboarding |
| `fx_rates_cache` | cache compartida de la API de tasas (open.er-api.com)               |

Todas con RLS: cada usuario solo accede a sus filas; `fx_rates_cache` es
compartida y solo accesible por usuarios autenticados.
