# 🌾 TerraByte – The Ultimate Unified Agriculture Platform

**TerraByte** is a smart agriculture platform powered by AI, IoT, and Machine Learning to empower farmers with real-time decision-making, intelligent crop management, disease detection, and access to government schemes. It offers a seamless web-based interface to monitor soil health, predict yield, detect diseases, automate irrigation, and get expert support.

---

## 📁 Project Structure

```

terra-byte-main/
├── backend/                 # Flask backend for AI models, APIs, and sensor integrations
├── public/                  # Static frontend assets
├── src/                     # React + TypeScript source files
├── index.html               # Entry HTML (Vite)
├── package.json             # Frontend dependencies and scripts
├── vite.config.ts           # Vite configuration
├── tailwind.config.ts       # Tailwind styling setup
├── tsconfig.\*.json          # TypeScript configurations
└── app.py (inside backend/) # Flask app entry point

````

---

## 🚀 Getting Started

### 1️⃣ Frontend (React + TypeScript + Vite)

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
````

### 2️⃣ Backend (Python Flask)

```bash
# Move to backend directory
cd backend

# Run the Flask backend
python app.py
```

> ⚠️ Make sure Python 3.x is installed. You may need Flask and other libraries:

```bash
pip install flask flask-cors
```

---

## 🔧 Tech Stack

| Layer       | Technology                                      |
| ----------- | ----------------------------------------------- |
| Frontend    | React, TypeScript, Tailwind CSS, Vite           |
| Backend     | Python, Flask                                   |
| AI/ML       | TensorFlow, PyTorch, OpenCV, Scikit-learn       |
| Styling     | Tailwind CSS                                    |
| IoT Sensors | Soil NPK, pH, Moisture (via ESP32/Raspberry Pi) |
| Deployment  | Localhost (Docker-ready)                        |

---

## 🌟 Features

* 🔍 **AI-Based Crop Recommendation**
* 🦠 **Image-Based Disease Detection using CNN**
* 🌡️ **Real-Time Soil Monitoring with IoT Sensors**
* 💧 **Automated Irrigation Logic**
* 📈 **Yield & Price Forecasting with ML**
* 🧾 **Government Scheme Access & Subsidy Info**
* 👨‍🌾 **Farmer Dashboard with Expert & Peer Forums**
* 🌦️ **Weather-Based Crop Planning**

---

## 🤖 Machine Learning Models

* Trained CNN models for plant disease classification
* ML regression for yield prediction based on:

  * Soil health
  * Weather conditions
  * Crop type
* Dataset support for custom training or API data ingestion

---

## 💡 Future Scope

* 🔒 Aadhaar & OTP-based Farmer Login
* 🌐 Multilingual Voice Assistant for Illiterate Farmers
* 🛰️ Satellite NDVI Crop Mapping Integration
* 📱 Mobile PWA (Progressive Web App) Version
* 🧠 Edge AI Deployment for Offline Use

---

## 🧪 Example Use Case Flow

1. Farmer logs in to dashboard
2. Inputs soil parameters manually or via IoT
3. Uploads crop leaf image for disease detection
4. Gets instant recommendations on:

   * Crop type
   * Fertilizer use
   * Irrigation timing
   * Preventive disease treatment
5. Monitors yield prediction and weather risks

---

## 📘 License

MIT License.
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

```
