# 🐄 Cow Health Monitoring System - Standalone ML Platform & Web Dashboard

A complete, standalone Machine Learning platform and Web Dashboard for **Cow Health & Behavior Monitoring** based on 3D accelerometer telemetry (80 samples × 3 axes per 8-second window) stored in a hosted Render PostgreSQL database.

---

## 🏗️ Project Architecture

This project is fully decoupled into separate **Frontend** and **Backend** applications:

```
d:\ble dashboard\cow-health-ml-dashboard\
├── backend/                  # Python FastAPI + scikit-learn ML Backend
│   ├── app/
│   │   ├── config.py         # DB connection config (Render PostgreSQL)
│   │   ├── database.py       # SQLAlchemy engine & session
│   │   ├── main.py           # FastAPI application entrypoint
│   │   ├── models/           # DB schema mappings (datalogger headers & points)
│   │   ├── routers/          # ML inference, device health & CSV retrain endpoints
│   │   └── services/         # ML feature extractor, Random Forest + Isolation Forest, pickle file manager
│   ├── requirements.txt      # Python dependencies
│   └── run_backend.py        # 1-Click Python backend server script
│
└── frontend/                 # Node / Vite + React Web Dashboard UI
    ├── src/
    │   ├── api.js            # API client with dynamic Backend URL switcher
    │   ├── pages/            # CowHealthDashboard, MLModelCenter, LabeledDataExport, Settings
    │   ├── components/       # Sidebar
    │   └── App.jsx
    ├── package.json
    ├── vite.config.js
    └── index.html
```

---

## 🧠 ML Model Specifications & Prediction Targets

### 1. Primary Prediction Target (8-Second Window)
- **Model**: `RandomForestClassifier` + `StandardScaler` + `IsolationForest`
- **Behaviors**:
  - `Standing` (Upright stationary)
  - `Walking` (Normal gait)
  - `Running` (High speed gait)
  - `Grazing` (Feeding head down)
  - `Resting` (Low motion upright)
  - `Lying` (Lying down)
  - `Drinking` (Drinking water)
  - `Ruminating` (Chewing cud)
  - `Unknown` (Low confidence or anomalous pattern)
- **Pickle File**: Saved automatically as `cow_health_ml.pkl`.

### 2. Secondary Health Indicators (Aggregated over Time per Device ID)
- `Healthy`
- `Low Activity`
- `Heat Stress Risk`
- `Lameness Risk`
- `Feeding Reduction`
- `Excessive Resting`
- `Abnormal Behavior`

---

## ⚡ How to Run Locally

### 1. Start the Backend API (FastAPI)
```bash
cd backend
pip install -r requirements.txt
python run_backend.py
```
> Server will start at: **`http://localhost:8000`**  
> OpenAPI Docs available at: **`http://localhost:8000/docs`**

### 2. Start the Frontend Web Dashboard (Node / Vite)
```bash
cd frontend
npm install
npm run dev
```
> Dashboard will open at: **`http://localhost:5173`**

---

## 🚀 Hosting Guidance (Two Different Hosts)

1. **Backend Deployment**: Host `backend/` on Render / Railway / Heroku.
2. **Frontend Deployment**: Host `frontend/` on Netlify / Vercel / Cloudflare Pages.
3. **URL Linking**: Open the **API Settings** tab in the Web Dashboard and enter your hosted FastAPI Backend URL.
