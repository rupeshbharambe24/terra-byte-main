# 🌾 TerraByte – The Ultimate Unified Agriculture Platform

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-Vite-3178C6?logo=typescript&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-backend-000000?logo=flask)
![TensorFlow](https://img.shields.io/badge/TensorFlow-Keras-FF6F00?logo=tensorflow&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![Status](https://img.shields.io/badge/status-prototype-orange)

**TerraByte** is a smart agriculture platform powered by AI, IoT, and Machine Learning to empower farmers with real-time decision-making, intelligent crop management, disease detection, and access to government schemes. It offers a seamless web-based interface to monitor soil health, detect diseases, plan irrigation, forecast prices, and get expert support.

> **Status:** prototype. Several dashboard pages (finance, soil monitoring, irrigation, analytics) use mock data in the UI; the AI features below are backed by real models in `backend/`.

---

## 📁 Project Structure

```text
terra-byte-main/
├── backend/                     # Flask backend for AI models and APIs
│   ├── app.py                   # Flask app entry point (registers all blueprints)
│   ├── current_market_prices.py # Stand-alone Flask app: live mandi prices via data.gov.in
│   ├── disease_detection.py     # Keras CNN crop-disease classifier (+ Gemini explanation)
│   ├── fertilizer_recommendation.py  # scikit-learn fertilizer recommender
│   ├── price_forecast.py        # Per-commodity LSTM price forecaster
│   ├── routes/                  # Blueprints: disease, fertilizer, price-forecast, marketplace, equipment
│   ├── ai_models/               # Trained models (.keras, .pkl) and scalers
│   ├── datasets/                # Commodity price history (.xlsx) used by the forecaster
│   └── requirements.txt
├── public/                      # Static frontend assets
├── src/                         # React + TypeScript source (pages, components, contexts)
├── index.html                   # Entry HTML (Vite)
├── package.json                 # Frontend dependencies and scripts
├── vite.config.ts               # Vite configuration (dev server on :8080)
├── tailwind.config.ts           # Tailwind styling setup
├── tsconfig.*.json              # TypeScript configurations
└── .env.example                 # Environment variables (frontend + backend)
```

---

## 🚀 Getting Started

### 1️⃣ Frontend (React + TypeScript + Vite)

```bash
# Install dependencies
npm install

# Start the development server (http://localhost:8080)
npm run dev
```

The Supabase / Firebase **web** client config is publishable and has defaults in the code; to point the app at your own projects, copy the `VITE_*` entries from `.env.example` into `.env.local`.

### 2️⃣ Backend (Python Flask)

```bash
cd backend
pip install -r requirements.txt

# Secrets are read from the environment (see .env.example)
export FIREBASE_CREDENTIALS=/absolute/path/to/firebase-serviceAccountKey.json
export GEMINI_API_KEY=your-gemini-api-key

# Run from inside backend/ (model paths are relative) - serves http://localhost:5000
python app.py
```

> 🔐 **Firebase Admin credentials are not committed.** Create a service account in your Firebase project (*Project settings → Service accounts → Generate new private key*) and either set `FIREBASE_CREDENTIALS` (or `GOOGLE_APPLICATION_CREDENTIALS`) to its path, or save it as `backend/firebase-serviceAccountKey.json` (that path is git-ignored).

Live market prices are served by a separate script that needs a free [data.gov.in](https://data.gov.in) API key:

```bash
cd backend
export DATA_GOV_IN_API_KEY=your-data-gov-in-api-key
python current_market_prices.py   # also binds :5000, so run it instead of app.py when testing prices
```

<details>
<summary><b>API endpoints (backend/app.py)</b></summary>

| Method | Path | Purpose |
| ------ | ---- | ------- |
| POST | `/api/disease/detect` | Classify a leaf image (38 PlantVillage-style classes) |
| POST | `/api/fertilizer-recommendation` | Fertilizer recommendation from soil/crop inputs |
| GET  | `/api/price-forecast/health` | Which commodity forecasters are loaded |
| POST | `/api/price-forecast/` | LSTM price forecast (onion, potato, tomato, bhindi) |
| POST | `/api/marketplace/purchase` | Create a marketplace order (Firestore) |
| POST | `/api/equipment/rent` | Create an equipment rental (Firestore) |

`current_market_prices.py` adds `GET /api/market-prices?market=` and `GET /api/commodity-details?market=&commodity=`.

</details>

---

## 🔧 Tech Stack

| Layer       | Technology                                                  |
| ----------- | ----------------------------------------------------------- |
| Frontend    | React, TypeScript, Vite, Tailwind CSS, shadcn/ui            |
| Auth / Data | Firebase Auth + Firestore, Supabase client                  |
| Backend     | Python, Flask, Flask-CORS, Firebase Admin SDK               |
| AI/ML       | TensorFlow/Keras (CNN, LSTM), scikit-learn, Google Gemini   |
| External    | data.gov.in mandi price API                                 |
| IoT Sensors | Soil NPK, pH, Moisture (planned; UI uses simulated readings) |
| Deployment  | Localhost                                                   |

---

## 🌟 Features

* 🔍 **AI-Based Crop Planning**
* 🦠 **Image-Based Disease Detection using CNN**
* 🌡️ **Soil Monitoring Dashboard** (IoT-ready UI)
* 💧 **Smart Irrigation Planning**
* 📈 **Commodity Price Forecasting with LSTM**
* 🧪 **Precision Fertilizer Recommendation**
* 🛒 **Marketplace & Equipment Rentals**
* 🧾 **Government Scheme Access & Subsidy Info**
* 👨‍🌾 **Role-based Dashboards** (farmer, vendor, hardware vendor, expert, admin) with Expert & Peer Forums

---

## 🤖 Machine Learning Models

* **Crop disease classifier** – Keras CNN (`ai_models/crop-disease-model.keras`) over 38 PlantVillage-style classes; Gemini generates treatment guidance for the predicted class
* **Fertilizer recommender** – scikit-learn model (`ai_models/fertilizer_model.pkl` + label encoders)
* **Price forecaster** – one LSTM per commodity (onion, potato, tomato, bhindi) trained on the market price histories in `backend/datasets/`

---

## 💡 Future Scope

* 🔒 Aadhaar & OTP-based Farmer Login
* 🌐 Multilingual Voice Assistant for Illiterate Farmers
* 🛰️ Satellite NDVI Crop Mapping Integration
* 📡 Live IoT sensor ingestion (ESP32 / Raspberry Pi)
* 📱 Mobile PWA (Progressive Web App) Version
* 🧠 Edge AI Deployment for Offline Use

---

## 🧪 Example Use Case Flow

1. Farmer logs in to dashboard
2. Inputs soil parameters
3. Uploads crop leaf image for disease detection
4. Gets instant recommendations on:

   * Crop type
   * Fertilizer use
   * Irrigation timing
   * Preventive disease treatment
5. Checks price forecasts before selling at the mandi

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
