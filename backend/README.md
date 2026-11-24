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

### KVK import format

A JSON array of objects (or `{"kvks": [...]}`). `name`, `district` and `state` are required;
`host_organisation`, `address`, `pincode` (6 digits), `phone`, `email`, `website`, `lat`, `lon`,
`source_url` and `verified_on` (`YYYY-MM-DD`) are optional. Rows are matched on name + district + state
(case-insensitive): existing rows are updated, new ones created, invalid rows skipped and reported. Each run
is logged and shown on *Admin → KVK import status*.

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
