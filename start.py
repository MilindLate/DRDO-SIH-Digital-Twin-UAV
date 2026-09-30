#!/usr/bin/env python3
"""
start.py — Quick-start script for local development.
Launches backend and frontend concurrently.
"""

import subprocess
import sys
import os
import signal
import threading
import time

ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.join(ROOT, "backend")
FRONTEND = os.path.join(ROOT, "frontend")

processes = []


def run_process(name, cmd, cwd, env=None):
    """Run a subprocess and print output with a prefix."""
    print(f"[{name}] Starting: {cmd}")
    proc = subprocess.Popen(
        cmd,
        cwd=cwd,
        shell=True,
        env=env or os.environ.copy(),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    processes.append(proc)

    def stream():
        for line in proc.stdout:
            print(f"[{name}] {line}", end="")

    t = threading.Thread(target=stream, daemon=True)
    t.start()
    return proc


def cleanup(signum=None, frame=None):
    print("\n🛑 Shutting down...")
    for p in processes:
        try:
            p.terminate()
        except:
            pass
    sys.exit(0)


def check_venv():
    venv = os.path.join(BACKEND, ".venv")
    python = os.path.join(venv, "bin", "python")
    if not os.path.exists(python):
        print("⚠️  Virtual environment not found. Run: python setup.py")
        sys.exit(1)
    return python


def check_node_modules():
    if not os.path.exists(os.path.join(FRONTEND, "node_modules")):
        print("⚠️  node_modules not found. Run: cd frontend && npm install")
        return False
    return True


def main():
    print("=" * 60)
    print("  Digital Twin UAV Engine System — Starting...")
    print("=" * 60)

    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    python = check_venv()
    has_frontend = check_node_modules()

    # Prepare environment
    env = os.environ.copy()
    env["PYTHONPATH"] = ROOT
    venv_bin = os.path.join(BACKEND, ".venv", "bin")
    env["PATH"] = venv_bin + os.pathsep + env.get("PATH", "")

    # Start backend
    backend_cmd = f"{python} -m uvicorn backend.main:app --reload --port 8000 --host 0.0.0.0"
    run_process("BACKEND", backend_cmd, ROOT, env)

    time.sleep(3)  # Give backend time to start

    # Start frontend
    if has_frontend and os.path.exists(os.path.join(FRONTEND, "package.json")):
        run_process("FRONTEND", "npm run dev", FRONTEND)

    print("""
✅ System starting...

   Backend API:  http://localhost:8000
   API Docs:     http://localhost:8000/docs
   Frontend:     http://localhost:5173

   Press Ctrl+C to stop.
""")

    try:
        while True:
            # Check if backend is still running
            if processes and processes[0].poll() is not None:
                print("[BACKEND] Process exited unexpectedly!")
                cleanup()
            time.sleep(2)
    except KeyboardInterrupt:
        cleanup()


if __name__ == "__main__":
    main()
