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

## Supabase / Postgres

Connected project: `toph-dashboard` (`luhsakjaxqjbqdeqodfg`, us-west-1).
Credentials live in `.env.local` (gitignored; see `.env.example`).

Migrations applied (via Supabase MCP):
- `core_schema` — `employees`, `fields`, `activity_types`, `voice_logs`, `log_answers`, `tags`, `log_tags` (+ `pg_trgm` search indexes, `updated_at` triggers)
- `app_modules` — `audits`/`audit_findings`, `reports`, `schedule_events`, `performance_reviews`, `conversations`/`messages`, `support_tickets`, `farm_settings`
- `seed_figma_data` — 11 employees/fields/activities/logs from the Figma refs (+2 guided Q&A rows)
- `dashboard_views` — `v_dashboard_stats`, `v_response_accuracy_daily`

`getDashboardData()` in `lib/data.ts` queries `voice_logs` with joins and falls back to mock data on any error — no component changes needed.

Next steps: replace `FieldMap` with real tiles (Mapbox/MapLibre), wire `Waveform` + Play to stored `audio_url`, and add `audio_logs` storage bucket.
