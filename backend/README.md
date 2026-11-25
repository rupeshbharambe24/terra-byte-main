# TerraByte API

FastAPI + SQLAlchemy 2 backend. See the repository README for how to run it. Interactive docs:
http://127.0.0.1:8000/api/docs (development only).

## Commands (run in `backend/`)

| Command | What it does |
|---|---|
| `uv run terrabyte-api` | serve the API on `HOST:PORT` (default 127.0.0.1:8000) |
| `uv run terrabyte-seed` | create the demo accounts, starter listings and the demo walkthrough (idempotent) |
| `uv run terrabyte-seed --reset` | **drop every table** and recreate the development database (refused in production) |
| `uv run terrabyte-admin create-admin --name ... --phone ...` | create a real admin |
| `uv run terrabyte-import-kvk <file.json> [--dry-run]` | import the verified KVK directory |
| `uv run terrabyte-import-legacy-prices` | import the Pune APMC history 2021-01-01 → 2025-05-27 from `legacy/datasets` (each row under its own market) |
| `uv run terrabyte-ingest-prices current [--commodity X ...]` | today's Maharashtra mandi prices from data.gov.in |
| `uv run terrabyte-ingest-prices history --commodity X --market Y [--days N]` | recent history of one series |
| `uv run terrabyte-ingest-prices series [--days N]` | history of every series in `terrabyte/reference/price_series.json` |
| `uv run terrabyte-backtest-prices` | rolling-origin backtest (naive / seasonal naive / ETS) of every series with enough data; stores `model_evaluations` used by the forecast endpoint |
| `uv run terrabyte-load-model-metrics` | store the disease model's evaluation (`models/disease/model.json`) in `model_evaluations` |

### KVK import format

A JSON array of objects (or `{"kvks": [...]}`). `name`, `district` and `state` are required;
`host_organisation`, `address`, `pincode` (6 digits), `phone`, `email`, `website`, `lat`, `lon`,
`source_url` and `verified_on` (`YYYY-MM-DD`) are optional. Rows are matched on name + district + state
(case-insensitive): existing rows are updated, new ones created, invalid rows skipped and reported. Each run
is logged and shown on *Admin → KVK import status*. The research-file shape
(`{"meta": ..., "kvks": [...]}` with lists of phones/emails/source URLs, `taluka`, `coords_precision`) is
accepted: lists are joined, the first source URL is kept plus all of them in `sources`, and rows without a
`state` get "Maharashtra" when the file describes a Maharashtra-only directory (or `--state <name>`).
`terrabyte-seed` imports the bundled `terrabyte/reference/kvk_maharashtra.json` (50 KVKs) when the table is empty.

## Reference data

`terrabyte/reference/` holds the official reference files (MSP, schemes, KVKs, soil-test ratings,
fertilizer RDF and products, FAO-56 crop parameters, crop calendar), each record with its source URL,
checked on 2026-11-24. Read `README_general.md` and `README_agronomy.md` there for sources, caveats and gaps.
They are parsed at startup; flagged rows (`conflict_flagged`, per-plant doses, `unverified` schemes) are
returned with their flag and never used as certain values.

### Mandi prices

`DATA_GOV_IN_API_KEY` in `backend/.env` (free key from data.gov.in → My Account). Without it the public
sample key is used: 10 rows per call and frequent HTTP 429, so calls are paced and retried. Every run is
logged in `data_imports` (`GET /admin/price-imports`). Market names are trimmed and the two Agmarknet 2.0
spellings (`Ausa APMC` / `APMC Ausa`) merged. Suggested schedule: `current` daily after 13:00 IST, then
`series --days 30` and `terrabyte-backtest-prices` weekly.

Forecasts are served only when the series' latest price is at most 14 days old and a backtest exists.
The learned model (damped-trend ETS on log prices) is used only where its MASE over 1–7 day horizons is
below the naive forecast's; otherwise the naive forecast is shown and labelled. Intervals are empirical
10–90 % quantiles of the backtest errors; their measured coverage is returned with the forecast.

### Disease model

`models/disease/` holds `model.onnx` (MobileNetV3-Large, ~17 MB), `model.json` (classes, temperature,
thresholds, evaluation) and `MODEL_CARD.md` (datasets and licences; weights CC BY 4.0). They are built
by the separate training project in `../ml` (`uv run tbml export`). Without these files the disease
endpoints answer `503 model_not_installed`. Treatment text comes only from
`terrabyte/reference/disease_treatments.json` (cited NIPHM/DPPQS IPM packages; banned pesticides are
filtered; chemical options only for confident results).

## Conventions

- Errors are always `{"detail": str, "code": str}` (validation errors add `errors: [{field, message}]`).
- Lists are paginated: `?limit=&offset=` → `{items, total, limit, offset}`.
- Money is computed on the server (prices from product rows, rental amounts from equipment rates) and
  returned as numbers rounded to paise. Days and months in aggregates are Indian Standard Time.
- Every endpoint checks the role and ownership on the server; other people's records answer 404.

## Workflows

| Area | Endpoints |
|---|---|
| Marketplace | `GET /products`, `GET/POST/PATCH /vendor/products`, `POST/GET /orders`, `POST /orders/{id}/{accept,reject,ship,deliver,cancel}` |
| Rentals | `GET /equipment`, `GET /equipment/{id}/busy`, `GET/POST/PATCH /hardware/equipment`, `POST/GET /bookings`, `POST /bookings/{id}/{accept,reject,complete,cancel}` |
| Consultations | `POST/GET /consultations`, `POST /consultations/{id}/{claim,messages,status}`, `POST /admin/consultations/{id}/assign` |
| KVK and articles | `GET /kvks`, `POST/PATCH/DELETE /admin/kvks`, `GET /admin/kvk-status`, `GET /articles`, `GET/POST/PATCH/DELETE /expert/articles` |
| Forum | `GET/POST /forum/posts`, `POST /forum/posts/{id}/replies`, `POST /forum/{posts,replies}/{id}/report`, `GET /admin/forum/reports`, `POST /admin/forum/{posts,replies}/{id}/{hide,restore}`, `POST /admin/forum/reports/{id}/dismiss` |
| Farm | `GET/POST/PATCH/DELETE /fields`, `GET/POST/PATCH/DELETE /ledger`, `GET /ledger/summary`, `GET /ledger/export.csv` |
| Dashboards | `GET /dashboard/{farmer,vendor,hardware,expert}`, `GET /admin/analytics`, `GET /admin/model-evaluations` |
| Weather | `GET /weather[?lat&lon|field_id]` (Open-Meteo, no key; 30 min cache, 8 s timeout; `503 weather_unavailable`) |
| Irrigation | `GET /fields/{id}/irrigation[?soil_texture&awc_mm_per_m&last_irrigated]`, `GET /irrigation/meta` (FAO-56 Kc × ET0, root-zone water balance) |
| Soil & fertilizer | `GET /soil-tests`, `POST /fields/{id}/soil-tests`, `DELETE /soil-tests/{id}`, `GET /fertilizer/crops`, `GET /fertilizer/options?crop=`, `POST /fertilizer/dose` |
| Crop planning | `GET /crop-calendar[?district=]`, `GET /regions` (per-field plan = `PATCH /fields/{id}` with `current_crop`, `season`, `sowing_date`) |
| Schemes and MSP | `GET /schemes[?level&status&q]`, `GET /schemes/{id}`, `GET /msp`, `GET /kvks/nearest[?lat&lon&limit]` |
| Prices | `GET /prices/{commodities,series,latest,history,forecast,msp,mine}`, `GET /admin/price-imports` |
| Disease check | `GET /disease/model`, `POST/GET /disease/checks`, `GET /disease/checks/{id}`, `POST /disease/checks/{id}/ask-expert` |
| Notifications | `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/{id}/read`, `POST /notifications/read-all` |

State machines (invalid transitions answer `409 invalid_transition`):

- Order: `placed → accepted | rejected (vendor) | cancelled (buyer)`, `accepted → shipped → delivered`.
  Stock is decremented atomically when ordering and restored on reject/cancel. Delivery adds an expense
  entry to the buyer's farm accounts.
- Booking: `requested → accepted | rejected (owner)`, `requested | accepted → cancelled (farmer, before the
  start)`, `accepted → completed (owner, after the start)`. Requested and accepted bookings block the
  period; overlaps answer `409 booking_clash`. Completion adds an expense entry.
- Consultation: `open → assigned (expert claims or admin assigns) → answered (expert reply) → closed`; a
  farmer follow-up on an answered question puts it back to `assigned`.
