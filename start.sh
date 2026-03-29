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

# ── Check/Create backend .env ──────────────────────────────────────────────────────
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo -e "${YELLOW}⚠  backend/.env not found${NC}"
    echo -e "   App will start but may have limited functionality"
    echo -e "   To enable all features, edit backend/.env and add API keys"
fi

# ── Install backend deps if needed ──────────────────────────────────────────
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo -e "${CYAN}📦 Installing backend dependencies...${NC}"
    if [ -f "$BACKEND_DIR/.venv/bin/activate" ]; then
        source "$BACKEND_DIR/.venv/bin/activate"
    elif [ -f "$BACKEND_DIR/.venv/Scripts/activate" ]; then
        . "$BACKEND_DIR/.venv/Scripts/activate"
    fi
    pip install -q -r "$BACKEND_DIR/requirements.txt"
fi

# ── Install frontend deps if needed ─────────────────────────────────────────
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo -e "${CYAN}📦 Installing frontend dependencies...${NC}"
    cd "$FRONTEND_DIR" && npm install --silent
fi

# ── Start backend (FastAPI on port 8000) ────────────────────────────────────
echo -e "${GREEN}🚀 Starting backend on http://localhost:8000${NC}"
cd "$BACKEND_DIR"
(
    # Activate venv if it exists
    if [ -f ".venv/bin/activate" ]; then
        source .venv/bin/activate
    elif [ -f ".venv/Scripts/activate" ]; then
        . .venv/Scripts/activate
    fi
    uvicorn main:app --reload --port 8000 --host 0.0.0.0
) &
BACKEND_PID=$!

# Wait for backend to be ready
echo -n "   Waiting for backend"
BACKEND_READY=0
for i in {1..20}; do
    if curl -s http://localhost:8000/docs > /dev/null 2>&1; then
        echo -e " ${GREEN}✓${NC}"
        BACKEND_READY=1
        break
    fi
    echo -n "."
    sleep 1
done

if [ $BACKEND_READY -eq 0 ]; then
    echo -e " ${YELLOW}(timeout)${NC}"
    echo -e "   ${YELLOW}⚠  Backend may still be starting...${NC}"
fi

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
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    wait $BACKEND_PID 2>/dev/null || true
    wait $FRONTEND_PID 2>/dev/null || true
    echo -e "${GREEN}Done.${NC}"
}

trap cleanup SIGINT SIGTERM

# Wait for either process to exit
wait
