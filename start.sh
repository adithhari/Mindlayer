#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# MindLayer — Start everything with one command
# Usage: ./start.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/mindlayer-react"

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}"
echo "  ╔══════════════════════════════════════╗"
echo "  ║          🧠 MindLayer                ║"
echo "  ║   Starting backend + frontend...     ║"
echo "  ╚══════════════════════════════════════╝"
echo -e "${NC}"

# ── Check backend .env ──────────────────────────────────────────────────────
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo -e "${YELLOW}⚠  backend/.env not found — copy from .env.example and add your keys${NC}"
    exit 1
fi

# ── Install backend deps if needed ──────────────────────────────────────────
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo -e "${CYAN}📦 Installing backend dependencies...${NC}"
    pip install -r "$BACKEND_DIR/requirements.txt" --break-system-packages -q
fi

# ── Install frontend deps if needed ─────────────────────────────────────────
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo -e "${CYAN}📦 Installing frontend dependencies...${NC}"
    cd "$FRONTEND_DIR" && npm install --silent
fi

# ── Start backend (FastAPI on port 8000) ────────────────────────────────────
echo -e "${GREEN}🚀 Starting backend on http://localhost:8000${NC}"
cd "$BACKEND_DIR"
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# Wait for backend to be ready
echo -n "   Waiting for backend"
for i in {1..15}; do
    if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
        echo -e " ${GREEN}✓${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

# ── Start frontend (Vite on port 3000) ──────────────────────────────────────
echo -e "${GREEN}🚀 Starting frontend on http://localhost:3000${NC}"
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  MindLayer is running!${NC}"
echo -e "  Frontend:  ${CYAN}http://localhost:3000${NC}"
echo -e "  Backend:   ${CYAN}http://localhost:8000${NC}"
echo -e "  Health:    ${CYAN}http://localhost:8000/api/health${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""
echo -e "  Press ${YELLOW}Ctrl+C${NC} to stop both servers"
echo ""

# ── Cleanup on exit ─────────────────────────────────────────────────────────
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down MindLayer...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    wait $BACKEND_PID 2>/dev/null
    wait $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}Done.${NC}"
}

trap cleanup SIGINT SIGTERM

# Wait for either process to exit
wait
