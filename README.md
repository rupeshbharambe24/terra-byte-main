# 🌾 TerraByte – The Ultimate Unified Agriculture Platform

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-Vite-3178C6?logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-backend-009688?logo=fastapi&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-Postgres--ready-003B57?logo=sqlite&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![Status](https://img.shields.io/badge/status-rebuilding-orange)

**TerraByte** is a web platform for farmers in Maharashtra with five roles: farmers, agri-input vendors,
equipment rental vendors, agriculture experts and admins. The UI is available in **English, Hindi and Marathi**.

> **Status (Phase 1 of 4 done).** The prototype is being rebuilt so that every workflow, model and number is
> real; only the users are test accounts.
>
> - **Real now:** our own FastAPI backend and database (Firebase/Supabase removed), registration and sign-in
>   (phone or email + password), server-side roles, admin approval of vendors/experts, admin *User management*
>   and *Approvals* pages, notifications API, English/Hindi/Marathi shell, mobile layout.
> - **Still demo:** every other page (dashboards, marketplace, rentals, soil, irrigation, crop planning,
>   disease detection, price forecast, schemes, KVK, forum, farm accounts, settings, vendor/hardware/expert
>   pages, admin analytics/moderation/KVK/model pages). Each shows a **"Demo data — this page is being
>   rebuilt"** banner. The old disease, fertilizer and price models are not served (their API answers
>   `503 being rebuilt`) until they are retrained and evaluated in Phase 3.

---

## 📁 Project Structure

```text
terra-byte-main/
├── backend/                 # FastAPI API (uv project)
│   ├── terrabyte/           # app: config, db, models/, schemas/, routers/, services/, security, seed
│   ├── tests/               # pytest
│   ├── legacy/              # old Flask prototype + its models and Pune price datasets (reference only)
│   ├── DEMO_ACCOUNTS.md     # demo logins created by the seed command
│   └── .env.example         # backend settings (copy to backend/.env)
├── src/                     # React + TypeScript frontend
│   ├── lib/api.ts           # the single API client
│   ├── context/             # AuthContext (backend auth), ThemeContext
│   ├── locales/{en,hi,mr}/  # translations
│   └── pages/               # pages (lazy-loaded per route)
├── .github/workflows/ci.yml # backend + frontend CI
└── .env.example             # frontend settings
```

---

## 🚀 Getting Started

Requirements: [uv](https://docs.astral.sh/uv/) (installs Python 3.12 for you) and Node.js 20+.

### 1️⃣ Backend (FastAPI, http://127.0.0.1:8000)

```bash
cd backend
uv sync
uv run terrabyte-seed     # creates backend/data/terrabyte.db and the demo accounts (safe to re-run)
uv run terrabyte-api      # or: uv run uvicorn terrabyte.main:app --port 8000
```

Settings are optional in development; copy `backend/.env.example` to `backend/.env` to change them
(database URL, JWT secret, CORS origins, upload size, data.gov.in key). API docs: http://127.0.0.1:8000/api/docs.

Create a real admin (admins cannot self-register): `uv run terrabyte-admin create-admin --name "..." --phone 9XXXXXXXXX`.

### 2️⃣ Frontend (Vite, http://localhost:8080)

```bash
npm ci
npm run dev               # proxies /api to the backend on :8000
```

### 🔑 Demo accounts

See [`backend/DEMO_ACCOUNTS.md`](backend/DEMO_ACCOUNTS.md): one or more test accounts per role (admin,
2 farmers, 2 vendors + 1 pending vendor, 2 equipment rental vendors, 1 expert). They are for local testing only.

### ✅ Checks

```bash
cd backend && uv run ruff check . && uv run pytest
npm run typecheck && npm run lint && npm test && npm run build
```

---

## 🔧 Tech Stack

| Layer     | Technology                                                                 |
| --------- | -------------------------------------------------------------------------- |
| Frontend  | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, i18next |
| Backend   | Python 3.12, FastAPI, SQLAlchemy 2, Pydantic, Argon2 passwords, JWT         |
| Database  | SQLite (default), Postgres via `DATABASE_URL`                               |
| Tests/CI  | pytest, ruff, Vitest, Testing Library, GitHub Actions                       |

---

## 🗺️ Roadmap

1. **Foundation** (done): backend, data model, auth, roles, approvals, seed users, i18n, mobile layout, CI.
2. **Workflows:** marketplace orders, equipment bookings, consultations and KVKs, forum and moderation,
   notifications, farm accounts, real admin analytics.
3. **Real data and models:** weather (Open-Meteo), FAO-56 irrigation, soil-test fertilizer doses from official
   recommendations, mandi prices from data.gov.in, honestly benchmarked price forecasts, a retrained disease
   model that can say "not sure", curated schemes and KVK directory, model metrics from held-out evaluations.
4. **Polish:** full Hindi/Marathi coverage, accessibility, performance, deployment notes.

---

## 📘 License

[MIT License](LICENSE).
Feel free to use, extend, and contribute to this project with credits.

---

## 👥 Contributors

* **Rupesh Bharambe** — Full Stack, AI/ML & System Design
* **Harshal More** - AI/ML, Data Analytics
* **Onkar Kalyankar** - AI/ML, Data Analytics
* **Aniket Wahul** - Web Development
* **Sanket Sarode** - Web Development

---

## 🌍 Let’s Cultivate Smarter, Together

> "TerraByte brings together technology and tradition—empowering the next generation of agriculture."
