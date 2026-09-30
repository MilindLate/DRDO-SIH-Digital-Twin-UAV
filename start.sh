#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# start.sh — One-command local development launcher
# AI-Enabled Digital Twin System — MALE UAV Aero Piston Engine
# DEMONSTRATION / RESEARCH PROTOTYPE — NOT FOR OPERATIONAL USE
# ─────────────────────────────────────────────────────────────────────────────
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PORT="${PORT:-8000}"
FRONTEND_PORT="${VITE_PORT:-5173}"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo " AI-Enabled Digital Twin — MALE UAV Aero Piston Engine"
echo " DEMONSTRATION / RESEARCH PROTOTYPE"
echo " NOT FOR OPERATIONAL USE"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ── Check Python ──────────────────────────────────────────────────────────────
if ! command -v python3 &>/dev/null; then
    echo "ERROR: python3 not found. Install Python 3.11+"
    exit 1
fi

# ── Check Node ────────────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
    echo "ERROR: node not found. Install Node 18+"
    exit 1
fi

# ── Install frontend deps if needed ──────────────────────────────────────────
if [ ! -d "$PROJECT_ROOT/frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd "$PROJECT_ROOT/frontend" && npm install
fi

# ── Create data directory ─────────────────────────────────────────────────────
mkdir -p "$PROJECT_ROOT/data"

echo "🚀 Starting backend on http://localhost:$BACKEND_PORT"
echo "   • API docs: http://localhost:$BACKEND_PORT/docs"
echo "   • WebSocket: ws://localhost:$BACKEND_PORT/ws"
echo ""
echo "🖥  Starting frontend on http://localhost:$FRONTEND_PORT"
echo ""
echo "Press Ctrl+C to stop all services."
echo ""

# ── Start backend ─────────────────────────────────────────────────────────────
cd "$PROJECT_ROOT"
PYTHONPATH="$PROJECT_ROOT" python3 -m uvicorn backend.main:app \
    --host 0.0.0.0 --port "$BACKEND_PORT" --log-level info &
BACKEND_PID=$!

# Give backend a moment to initialise
sleep 3

# ── Start frontend ────────────────────────────────────────────────────────────
cd "$PROJECT_ROOT/frontend"
npm run dev -- --host 0.0.0.0 --port "$FRONTEND_PORT" &
FRONTEND_PID=$!

# ── Trap Ctrl+C ───────────────────────────────────────────────────────────────
trap "echo ''; echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

# ── Wait ──────────────────────────────────────────────────────────────────────
wait $BACKEND_PID $FRONTEND_PID
