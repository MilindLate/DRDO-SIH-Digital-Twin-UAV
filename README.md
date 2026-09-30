# 🦅 AI-Enabled Real-Time Digital Twin for MALE UAV Piston Engines

![SIH Badge](https://img.shields.io/badge/Smart_India_Hackathon-2024-orange?style=for-the-badge) 
![DRDO Badge](https://img.shields.io/badge/Organization-DRDO-blue?style=for-the-badge)
![Problem Statement](https://img.shields.io/badge/PS_ID-26054-green?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Fully_Functional_Prototype-success?style=for-the-badge)

## 🏆 Why This is the Winning Prototype

This solution doesn't just build a dashboard; it engineers a **Defense-Grade 5D Digital Twin**. We went beyond basic data visualization and standard black-box machine learning to deliver a system that operators and defense personnel can actually trust. 

Here is why this prototype stands out:
1. **Physics-Informed Neural Networks (PINN):** Pure ML fails on novel edge-cases. We implemented a hybrid PINN architecture that constrains ML outputs using hard thermodynamic and kinematic laws (e.g., CHT-EGT correlation, Oil Pressure-RPM hydrodynamics).
2. **Explainable AI (XAI):** In defense aviation, "Computer says no" isn't acceptable. Our XAI module explains *why* a fault was predicted (e.g., "Injector Degradation predicted with 85% confidence due to 12% drop in Fuel Flow and 5% EGT imbalance").
3. **Edge-Ready Architecture:** Designed for Ground Control Stations (GCS). It includes a fully functioning `edge_deployer` that automatically generates systemd services, benchmarks ONNX model latency, and checks RAM/CPU limits for embedded deployments.
4. **Hardware-in-the-Loop Ready:** Includes a complete `SocketCAN` abstraction layer with SAE J1939 PGN mapping, ready to instantly plug into real engine ECU/FADEC hardware.
5. **High-Fidelity 16-Screen HMI:** A comprehensive React/Tailwind frontend that provides situational awareness, mission replay, predictive maintenance, and fleet management—all reacting in real-time via WebSockets.

---

## 🏗️ System Architecture

```text
[ Physical Aero Engine ] <--> [ CAN Bus / ECU (SAE J1939) ]
           |                               |
           v                               v
+-------------------------------------------------------------+
|               DIGITAL TWIN CORE (FastAPI)                   |
|                                                             |
|  1. Data Ingestion (SocketCAN + Simulator fallback)         |
|  2. Physics Engine (Thermodynamics, Kinematics)             |
|  3. ML Engine (RandomForest, IsolationForest)               |
|  4. Hybrid Layer (PINN Anomaly + Arrhenius/Miner RUL)       |
|  5. XAI Engine (Permutation Importance, Rationale Gen.)     |
+-------------------------------------------------------------+
           | (WebSockets / REST API)
           v
+-------------------------------------------------------------+
|                 VISUALIZATION (React + Vite)                |
|  - Live Engine Monitor      - Fault Diagnosis (XAI)         |
|  - Mission Simulator        - Fleet View                    |
|  - Post-Flight Analysis     - Edge Status Dashboard         |
+-------------------------------------------------------------+
```

---

## 🗺️ DRDO Requirements Mapping

### A. Digital Twin Core Framework ✅
- **Virtual engine model:** Synchronized via high-frequency WebSocket streams.
- **Modular architecture:** Cleanly separated into `api`, `interfaces`, `services`, `ml`, and `edge` packages.
- **Real-time ingestion:** Handled by asynchronous stream processors capable of multi-Hz updates.

### B. Health Monitoring System ✅
Continuously tracks 8 major sub-systems and generates granular health indices.
- **Monitored Parameters:** RPM, CHT, EGT, Oil Press/Temp, Fuel Flow, Vibration (X,Y,Z,RMS), Battery/Alternator, Engine Load, Intake Temp, Ambient conditions.

### C. Fault Detection & Predictive Analytics ✅
Moves from threshold-based to intelligent diagnostics. Predicts 11 distinct conditions:
- Misfire, Injector Abnormalities, Cooling Degradation, Lubrication Issues, Sensor Drift/Failure, Combustion Instability, Overheating, Vibration Anomalies, etc.

### D. AI/ML Layer ✅
- **Anomaly Detection:** Powered by `IsolationForest`.
- **RUL Estimation:** Hybrid approach using Arrhenius thermal degradation equations + Miner's Rule cumulative fatigue + ML base penalties.
- **Maintenance Recommendations:** Auto-generated via the XAI module.

### E. Simulation & Replay Capability ✅
- **Mission Simulation:** Includes configurable profiles: High Altitude, Endurance, Hot-weather, Rapid throttle transitions.
- **Mission Replay:** Time-series scrubbing of historical mission data with anomaly overlays.

### F. Visualization Dashboard ✅
- 16 distinct operational screens tailored for UAV Operators, Propulsion Engineers, and Maintenance Crews.

---

## 🚀 Key Innovation Areas Implemented

| Innovation | Implementation Details |
|------------|------------------------|
| **Physics-informed AI** | ML anomaly scores are weighted against thermodynamic constraint residuals (e.g., checking if fuel flow mathematically supports the current engine load). |
| **Explainable AI (XAI)** | Extracted feature importance ranks the exact telemetry parameters driving a fault prediction, converting them into human-readable rationale. |
| **Edge AI for UAVs** | `edge_deployer.py` evaluates system specs, exports models to lightweight ONNX format, and generates deployment assets (Dockerfile/systemd). |
| **Hybrid Models** | Data-driven degradation tracking is fused with empirical physics (Arrhenius equation) for highly accurate Remaining Useful Life (RUL) estimation. |
| **CAN Communication** | Real `python-can` implementation mapping 20+ engine parameters from standard CAN PGNs. |

---

## 💻 Tech Stack

*   **Backend:** Python 3.10+, FastAPI, Uvicorn, SQLAlchemy, SQLite (Edge database)
*   **AI/ML:** Scikit-Learn (RandomForest, IsolationForest), NumPy, ONNX
*   **Hardware Interface:** Python-CAN (SocketCAN)
*   **Frontend:** React 18, TypeScript, Tailwind CSS, Vite, Zustand (State Management), Recharts
*   **Communication:** REST APIs + WebSockets (Real-time telemetry)

---

## ⚙️ How to Run the Prototype

### 1. Start the Backend
```bash
# Navigate to project root
cd digital-twin-uav-engine

# Install dependencies (if not already installed)
pip install fastapi uvicorn sqlalchemy scikit-learn python-can numpy psutil

# Run the server
PYTHONPATH=. python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```
*The backend will automatically generate synthetic ML models, seed the database, and start the real-time simulation stream if no CAN bus is detected.*

### 2. Start the Frontend
```bash
# Navigate to frontend directory
cd digital-twin-uav-engine/frontend

# Install dependencies
npm install

# Run the dev server
npm run dev
```
*Access the dashboard at `http://localhost:5173`.*

---

## 🌐 API Documentation (Swagger)
Once the backend is running, the full Interactive API documentation is available at:
👉 **`http://localhost:8000/docs`**

*Key Endpoint Groups:*
- `/api/telemetry` & `/api/health`
- `/api/ml` (Physics-Informed AI / RUL)
- `/api/xai` (Explainable AI rationale)
- `/api/edge` (System readiness & CAN status)
- `/api/missions` (Simulation & Replay)

---

## 🛤️ Deployment Roadmap (Lab to Fleet)

1. **Phase 1: Engine Test Rig (Current/Next Step)**
   - Connect prototype via PeakCAN/SocketCAN adapter to physical test rig.
   - Validate Physics-Informed ML models against physical sensor anomalies.
2. **Phase 2: Ground Control Station (GCS) Integration**
   - Deploy backend via generated `docker-compose` on GCS edge servers.
   - Connect WebSocket streams to live UAV downlink telemetry.
3. **Phase 3: Fleet-Level Analytics (Cloud/Federated)**
   - Aggregate anonymized engine health data across multiple UAVs.
   - Implement federated learning to improve ML models globally without transmitting raw sensitive telemetry.

---
*Built for the Smart India Hackathon 2024.*
