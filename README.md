# Toph — Farm Dashboard

Next.js (App Router) + TypeScript + Tailwind CSS v4 frontend built from `ref/` Figma exports.

## Run

```bash
npm install
npm run dev   # http://localhost:3000
```

## Structure

- `app/` — layout, globals (design tokens from `ref/design-tokens.*`), dashboard page
- `components/` — `Sidebar`, `StatCard`, `LogsPanel` (table + expandable log detail), `Waveform`, `FieldMap` (self-contained SVG satellite placeholder), `Icon` (serves `public/icons/*.svg` copied from `ref/icons/`)
- `lib/` — `types.ts`, `mock-data.ts` (Figma rows), `supabase.ts` (browser client, null-safe), `data.ts` (`getDashboardData()` — single swap point)
- `public/icons/` — icons copied from `ref/icons/`

## Supabase / Postgres (when ready)

1. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. Create the table (see SQL sketch in `lib/supabase.ts`): `employee_logs(id, employee, activity, log_date, field, time_range, summary, audio_url)`.
3. `getDashboardData()` in `lib/data.ts` already queries `employee_logs` when env vars exist and falls back to mock data on any error — no component changes needed.

Next steps: replace `FieldMap` with real tiles (Mapbox/MapLibre), wire `Waveform` + Play to stored `audio_url`, and add `audio_logs` storage bucket.
