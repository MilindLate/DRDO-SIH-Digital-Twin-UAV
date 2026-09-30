#!/bin/bash

# ANSI Color codes
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${CYAN}🚀 Starting DRDO SIH AI-Enabled Digital Twin System...${NC}\n"

# Ensure we are in the project root (where the script is located)
cd "$(dirname "$0")"

# 1. Start the FastAPI Backend
echo -e "${YELLOW}▶ Starting FastAPI Backend (Port 8000)...${NC}"
PYTHONPATH=. python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --log-level warning &
BACKEND_PID=$!

# Wait a brief moment to let backend initialize
sleep 2

# 2. Start the React Frontend
echo -e "${YELLOW}▶ Starting React/Vite Frontend (Port 5173)...${NC}"
cd frontend
npm run dev -- --host 0.0.0.0 --port 5173 &
FRONTEND_PID=$!

# Trap Ctrl+C (SIGINT) and gracefully shut down both servers
trap "echo -e '\n${CYAN}🛑 Shutting down Digital Twin servers...${NC}'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM

# Give the frontend a couple of seconds to spin up
sleep 3

echo -e "\n${GREEN}========================================================${NC}"
echo -e "${GREEN}✅ ALL SYSTEMS OPERATIONAL!${NC}"
echo -e "${GREEN}========================================================${NC}"
echo -e "🖥️  ${CYAN}Frontend Dashboard${NC}   👉  http://localhost:5173"
echo -e "⚙️  ${CYAN}Backend API${NC}          👉  http://localhost:8000"
echo -e "📖 ${CYAN}API Swagger Docs${NC}     👉  http://localhost:8000/docs"
echo -e "📡 ${CYAN}WebSocket Stream${NC}     👉  ws://localhost:8000/ws"
echo -e "${GREEN}========================================================${NC}"
echo -e "${YELLOW}Press [Ctrl+C] to stop both servers safely.${NC}\n"

# Wait keeps the script running and listening for the trap (Ctrl+C)
wait
