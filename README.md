# Toph — Farm Dashboard

Next.js (App Router) + TypeScript + Tailwind CSS v4 frontend built from `ref/` Figma exports.

## Run

```bash
npm install
npm run dev   # http://localhost:3000
```

## Structure

- `app/api/` — Node resource endpoints, the only place that talks to Postgres:
  - `GET /api/recordings[?status&activity&field&search&from&to&sort&limit&offset]` — the new-recordings feed behind New Employee Logs
  - `GET /api/recordings/:id` (+ `PATCH {status}` / `PATCH {activity}`) — expanded log detail (transcript, guided Q&A, tags), review actions and activity corrections
  - `GET|POST /api/recordings/:id/tags` (+ `DELETE ?tag_id=`) — Add Tag button
  - `GET /api/stats` — stat cards (today's recordings/new, active workers, accuracy)
  - `GET /api/meta` — farm/role + activity/field/tag filter options
  - `GET /api/employees` — active crew list
- `lib/` — `types.ts`, `mock-data.ts` (fallback rows), `data.ts` (typed frontend client over the endpoints above), `server/` (server-only Supabase client + row mapping)
- `public/icons/` — icons copied from `ref/icons/`

## Supabase / Postgres

Connected project: `toph-dashboard` (`luhsakjaxqjbqdeqodfg`, us-west-1).
Credentials live in `.env.local` (gitignored; see `.env.example`).

Migrations applied (via Supabase MCP):
- `core_schema` — `employees`, `fields`, `activity_types`, `voice_logs`, `log_answers`, `tags`, `log_tags` (+ `pg_trgm` search indexes, `updated_at` triggers)
- `app_modules` — `audits`/`audit_findings`, `reports`, `schedule_events`, `performance_reviews`, `conversations`/`messages`, `support_tickets`, `farm_settings`
- `seed_figma_data` — 11 employees/fields/activities/logs from the Figma refs (+2 guided Q&A rows)
- `dashboard_views` — `v_dashboard_stats`, `v_response_accuracy_daily`
- `enable_postgis_geo` — PostGIS extension, `fields.geom` / `center_geog` + `voice_logs.geog` (sync triggers, GiST indexes), acreage-sized polygon backfill, `v_fields_map` GeoJSON view, `logs_near_point(lat,lng,radius_m)` radius search
- `voice_logs_activity_suggested` — `voice_logs.activity_suggested` flag: the save-time Groq pass also classifies the activity (strict enum over `activity_types`, validated server-side); when the worker leaves the recorder's activity on "Auto-detect from audio" the classified value is stored with this flag and shown in the UI as a changeable guess

`getDashboardData()` in `lib/data.ts` fans out to `/api/recordings` + `/api/stats` + `/api/meta` in parallel and assembles one `DashboardData` for `<Dashboard>` — the frontend composes resources, so no aggregate `/api/dashboard` endpoint. Each route falls back to mock data when Supabase is unconnected; components never import Supabase directly.

Next steps: wire `Waveform` + Play to stored `audio_url`, add `audio_logs` storage bucket, and replace synthesized field polygons with real surveyed boundaries (import via `fields.geom`).
