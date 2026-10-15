# SmartPark AI — Enterprise Campus Parking & Prediction Platform

**SmartPark AI** is an AI-powered parking management and occupancy prediction platform specifically engineered for IT parks, tech corridors, corporate campuses, and multi-tenant office complexes.

This is a clean-slate project residing exclusively in `SmartParkAI/`.

---

## 🏗️ System Architecture

SmartPark AI consists of four coordinated, independent services:

```
SmartParkAI/
├── mobile/             # React Native + Expo SDK 52 + TypeScript
├── backend/            # Node.js + Express + TypeScript + Socket.IO (Port 5001)
├── ml-service/         # Python 3.14 + FastAPI + scikit-learn (Port 8000)
├── admin-dashboard/    # React 18 + Vite 5 + TypeScript (Port 3000)
├── shared/             # Platform-independent contracts, types, & brand palette
├── scripts/            # Non-destructive diagnostics & startup automation
├── .vscode/            # 1-Click VS Code Tasks and Debug Launch Configurations
└── .env.example        # Master environment configuration template
```

### Port Allocation
- **Backend API & WebSockets:** `http://127.0.0.1:5001`
- **ML Prediction Service:** `http://127.0.0.1:8000`
- **Admin Dashboard:** `http://127.0.0.1:3000`
- **Mobile Metro Bundler:** `http://127.0.0.1:8081`

---

## 🎨 Official Branding

SmartPark AI features the official corporate identity:
- **Logo Asset:** Located at `mobile/assets/images/smartpark-logo.png` & `admin-dashboard/public/smartpark-logo.png`
- **Primary Blue:** `#0878E8`
- **Deep Navy:** `#071D42`
- **Secondary Blue:** `#0055B8`
- **Green Accent:** `#39D353`
- **Background Canvas:** `#F4F8FF`
- **Subtle Borders:** `#DFE8F4`

---

## 🚀 How to Run in VS Code

### Method 1: Using VS Code Tasks (Easiest)
1. Open the `SmartParkAI` folder in VS Code:
   ```bash
   code /Users/mirudhusanjeevini/Desktop/ParkAI/SmartParkAI
   ```
2. In the top menu bar, click **Terminal** ➔ **Run Task...** (or press `Cmd+Shift+P` and type `Tasks: Run Task`).
3. You will see numbered 1-click tasks:
   - `1. Run Health & System Diagnostics` — Runs preflight verification.
   - `2. Start Backend API (Port 5001)` — Starts Express API & WebSockets.
   - `3. Start ML Prediction Service (Port 8000)` — Starts FastAPI inference engine.
   - `4. Start Admin Dashboard (Port 3000)` — Launches Vite React console.
   - `5. Start Mobile App (Metro Port 8081)` — Launches Expo development server.

Each task opens in its own terminal tab within VS Code!

---

### Method 2: Using VS Code Integrated Terminal

Open 4 separate terminal tabs in VS Code (`Terminal ➔ New Terminal` or `Ctrl+\``):

#### Terminal 1 — Backend API
```bash
cd backend
npm run start
```
*Health endpoint:* `http://127.0.0.1:5001/health`  
*Readiness:* `http://127.0.0.1:5001/ready`

#### Terminal 2 — ML Prediction Service
```bash
cd ml-service
./venv/bin/uvicorn main:app --app-dir src --host 127.0.0.1 --port 8000
```
*Health endpoint:* `http://127.0.0.1:8000/health`  
*Readiness:* `http://127.0.0.1:8000/ready`

#### Terminal 3 — Admin Dashboard
```bash
cd admin-dashboard
npm run dev
```
*Opens in browser:* `http://localhost:3000`

#### Terminal 4 — Mobile App
```bash
cd mobile
npm start
```
*Press `w` in terminal to launch in web browser, or scan QR code with Expo Go on iOS/Android.*

---

## 🩺 System Health & Diagnostics

Run the non-destructive diagnostic verifier at any time:

```bash
./scripts/check-health.sh
# OR
node scripts/diagnostics.js
```

This verifies runtime versions, required environment files, port availability, MongoDB connectivity, and live service health endpoints.

---

## 🤖 AI / ML Occupancy Model

The ML microservice uses a **Random Forest Regressor** trained on chronological IT campus mobility data (morning influx, lunch turnover, evening departure):
- **Training command:** `./scripts/train-ml.sh` or `cd ml-service && ./venv/bin/python src/train.py`
- **Holdout Validation:** Evaluated on an 80/20 chronological split against a persistence baseline:
  - Baseline Persistence MAE: `5.005%`
  - Random Forest Regressor MAE: `0.878%` (improvement: `+4.127%`)
  - Holdout R² Score: `0.999`
- **Model Artifact:** Saved to `ml-service/models/occupancy_rf_model.joblib`.
- **Fast Startup:** The FastAPI server loads the existing model artifact instantaneously and never blocks startup with training.

---

## 👥 Demo Accounts

| Role | Email | Password |
|---|---|---|
| **Administrator** | `admin@smartpark.ai` | `SmartPark123!` |
| **Facility Operator** | `operator@smartpark.ai` | `SmartPark123!` |
| **Commuter (Alex Morgan)** | `user@smartpark.ai` | `SmartPark123!` |

---

## 🛠️ macOS Troubleshooting Guide

1. **Port 5000 Conflict:**  
   macOS Monterey/Ventura/Sonoma uses port 5000 for AirPlay Receiver. SmartPark AI explicitly uses **port 5001** for Backend API and **port 3000** for Admin Dashboard to eliminate this conflict.
2. **MongoDB Connectivity:**  
   If a standalone MongoDB daemon is not currently active, the backend fast-boot automatically uses its dedicated in-memory development database store with full atomic reservations and schema validation. To use MongoDB Community via Homebrew:
   ```bash
   brew services start mongodb-community
   ```
3. **Stopping Services:**  
   In any terminal tab running a service, press `Ctrl+C` to terminate cleanly.
