#!/usr/bin/env python3
"""
setup.py — One-time setup and verification script for the Digital Twin UAV Engine System.
Installs dependencies, initialises the database, generates demo data, and trains ML models.
Run: python setup.py
"""

import subprocess
import sys
import os
import shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.join(ROOT, "backend")
FRONTEND = os.path.join(ROOT, "frontend")
ML_MODELS_DIR = os.path.join(ROOT, "ml", "models")


def run(cmd, cwd=None, check=True):
    print(f"  → {' '.join(cmd) if isinstance(cmd, list) else cmd}")
    result = subprocess.run(
        cmd if isinstance(cmd, list) else cmd,
        cwd=cwd or ROOT,
        shell=isinstance(cmd, str),
        check=check,
        capture_output=False,
    )
    return result


def check_python():
    print("✓ Checking Python version...")
    v = sys.version_info
    if v < (3, 10):
        print(f"  ERROR: Python 3.10+ required, found {v.major}.{v.minor}")
        sys.exit(1)
    print(f"  Python {v.major}.{v.minor}.{v.micro} — OK")


def check_node():
    print("✓ Checking Node.js...")
    r = subprocess.run(["node", "--version"], capture_output=True, text=True, check=False)
    if r.returncode != 0:
        print("  WARNING: Node.js not found. Frontend setup will be skipped.")
        return False
    print(f"  Node.js {r.stdout.strip()} — OK")
    return True


def setup_backend():
    print("\n📦 Setting up Python backend...")
    venv_path = os.path.join(BACKEND, ".venv")

    if not os.path.exists(venv_path):
        print("  Creating virtual environment...")
        run([sys.executable, "-m", "venv", venv_path], cwd=BACKEND)

    pip = os.path.join(venv_path, "bin", "pip")
    python = os.path.join(venv_path, "bin", "python")

    print("  Installing Python dependencies...")
    run([pip, "install", "--upgrade", "pip", "-q"])
    run([pip, "install", "-r", "requirements.txt", "-q"], cwd=BACKEND)

    print("  Creating required directories...")
    os.makedirs(ML_MODELS_DIR, exist_ok=True)
    os.makedirs(os.path.join(ROOT, "ml", "training"), exist_ok=True)

    print("  Initialising database...")
    env = os.environ.copy()
    env["PYTHONPATH"] = ROOT
    result = subprocess.run(
        [python, "-c",
         "import sys; sys.path.insert(0, '.'); "
         "from backend.database.connection import init_db; init_db(); "
         "print('  Database initialised.')"],
        cwd=ROOT, env=env, capture_output=True, text=True, check=False
    )
    if result.returncode != 0:
        print(f"  DB init output: {result.stdout}")
        print(f"  DB init error: {result.stderr}")
    else:
        print(result.stdout)

    return python, env


def generate_demo_data(python, env):
    print("\n🔬 Generating synthetic demo datasets...")
    script = """
import sys, os
sys.path.insert(0, '.')
from simulator.engine_model.simulator import DatasetGenerator
gen = DatasetGenerator()
gen.generate_all(output_dir='ml/models', dt=10.0)
print('Demo datasets generated.')
"""
    result = subprocess.run(
        [python, "-c", script],
        cwd=ROOT, env=env, capture_output=False, check=False
    )


def seed_database(python, env):
    print("\n🌱 Seeding database with demo missions...")
    script = """
import sys, asyncio
sys.path.insert(0, '.')
try:
    from backend.services.seed_service import seed_database
    asyncio.run(seed_database())
    print('Database seeded successfully.')
except Exception as e:
    print(f'Seeding: {e} (will seed on first API startup)')
"""
    result = subprocess.run(
        [python, "-c", script],
        cwd=ROOT, env=env, capture_output=False, check=False
    )


def setup_frontend(has_node):
    if not has_node:
        print("\n⚠️  Skipping frontend setup (Node.js not found)")
        return

    print("\n📦 Setting up React frontend...")
    if os.path.exists(os.path.join(FRONTEND, "package.json")):
        print("  Installing npm packages...")
        run("npm install", cwd=FRONTEND, check=False)
    else:
        print("  WARNING: frontend/package.json not found. Skipping.")


def create_env_file():
    env_example = os.path.join(ROOT, ".env.example")
    env_file = os.path.join(ROOT, ".env")

    content = """# Digital Twin UAV Engine System — Environment Configuration
# Copy to .env and adjust as needed

# Backend
DATABASE_URL=sqlite:///./data/digital_twin.db
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
LOG_LEVEL=INFO
SEED_DATA=true

# Frontend (Vite)
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000

# Security (change these in production!)
SECRET_KEY=demonstration-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# ML
ML_MODELS_DIR=./ml/models
TRAIN_ON_STARTUP=true
"""

    with open(env_example, "w") as f:
        f.write(content)

    if not os.path.exists(env_file):
        shutil.copy(env_example, env_file)
        print("  Created .env from .env.example")


def print_success():
    print("""
╔══════════════════════════════════════════════════════════════════════╗
║   ✅ DIGITAL TWIN UAV ENGINE SYSTEM — SETUP COMPLETE                ║
╚══════════════════════════════════════════════════════════════════════╝

🚀 To start the system:

  OPTION 1 — Docker Compose (recommended):
    docker compose up --build

  OPTION 2 — Local development:
    Terminal 1 (backend):
      cd backend
      source .venv/bin/activate
      cd ..
      uvicorn backend.main:app --reload --port 8000

    Terminal 2 (frontend):
      cd frontend
      npm run dev

  OPTION 3 — Quick start script:
    python start.py

📡 Access the system:
  Frontend: http://localhost:5173 (dev) or http://localhost:3000 (docker)
  Backend API: http://localhost:8000
  API Docs: http://localhost:8000/docs
  WebSocket: ws://localhost:8000/ws

🎮 Demo Mode:
  Click "DEMO MODE" in the sidebar to start the ISR mission demonstration.

📋 All engineering values are labeled SIMULATED/CONFIGURABLE.
   This system is a DEMONSTRATION/RESEARCH prototype.
   Not for operational use.
""")


def main():
    print("=" * 70)
    print("  AI-Enabled Digital Twin System for MALE UAV Aero Piston Engines")
    print("  SETUP SCRIPT — DEMONSTRATION/RESEARCH SYSTEM")
    print("=" * 70)
    print()

    check_python()
    has_node = check_node()
    create_env_file()
    python, env = setup_backend()
    generate_demo_data(python, env)
    seed_database(python, env)
    setup_frontend(has_node)
    print_success()


if __name__ == "__main__":
    main()
