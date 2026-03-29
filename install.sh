#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# MindLayer — Install dependencies for backend + frontend
# Usage: ./install.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/mindlayer-react"

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}"
echo "  ╔══════════════════════════════════════╗"
echo "  ║          🧠 MindLayer                ║"
echo "  ║     Installing dependencies...       ║"
echo "  ╚══════════════════════════════════════╝"
echo -e "${NC}"

# ── Check prerequisites ─────────────────────────────────────────────────────
echo -e "${CYAN}🔍 Checking prerequisites...${NC}"

# Check Python 3
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 not found. Please install Python 3.11+${NC}"
    exit 1
fi
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
echo -e "   ${GREEN}✓${NC} Python $PYTHON_VERSION"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 16+${NC}"
    exit 1
fi
NODE_VERSION=$(node --version)
echo -e "   ${GREEN}✓${NC} Node.js $NODE_VERSION"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found. Please install npm${NC}"
    exit 1
fi
NPM_VERSION=$(npm --version)
echo -e "   ${GREEN}✓${NC} npm $NPM_VERSION"

echo ""

# ── Backend installation ────────────────────────────────────────────────────
echo -e "${CYAN}📦 Installing backend dependencies...${NC}"
cd "$BACKEND_DIR"

# Check if venv exists
if [ ! -d ".venv" ]; then
    echo -e "   Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate venv
if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
elif [ -f ".venv/Scripts/activate" ]; then
    . .venv/Scripts/activate
fi

# Install requirements
echo -e "   Installing packages from requirements.txt..."
pip install -q --upgrade pip
pip install -q -r requirements.txt

echo -e "   ${GREEN}✓${NC} Backend dependencies installed"

echo ""

# ── Frontend installation ───────────────────────────────────────────────────
echo -e "${CYAN}📦 Installing frontend dependencies...${NC}"
cd "$FRONTEND_DIR"

echo -e "   Installing packages from package.json..."
npm install --silent

echo -e "   ${GREEN}✓${NC} Frontend dependencies installed"

echo ""

# ── Verify/Create environment files ────────────────────────────────────────
echo -e "${CYAN}🔐 Setting up environment configuration...${NC}"

# Create backend .env if it doesn't exist
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo -e "   Creating backend/.env with placeholder values..."
    cat > "$BACKEND_DIR/.env" << 'EOF'
# ─────────────────────────────────────────────────────────────────────────────
# MindLayer Backend Configuration
# Replace these with your actual API keys from the respective services
# ─────────────────────────────────────────────────────────────────────────────

# Claude API (required for core functionality)
# Get from: https://console.anthropic.com/
ANTHROPIC_API_KEY=your-api-key-here

# Hume AI (optional - for voice emotion detection)
# Get from: https://platform.hume.ai/
HUME_API_KEY=your-api-key-here
HUME_SECRET_KEY=your-secret-key-here

# Deepgram (optional - for speech-to-text)
# Get from: https://console.deepgram.com/
DEEPGRAM_API_KEY=your-api-key-here

# Supermemory (optional - for user memory/history)
# Get from: https://supermemory.ai/
SUPERMEMORY_API_KEY=your-api-key-here

# Claude Model (optional - defaults to claude-opus-4-6)
# Options: claude-opus-4-6, claude-sonnet-4, claude-haiku-3-5
CLAUDE_MODEL=claude-opus-4-6

# Port (optional - defaults to 8000)
PORT=8000
EOF
    echo -e "   ${YELLOW}⚠${NC}  backend/.env created with placeholder values"
    echo -e "      Edit backend/.env and add your actual API keys"
else
    echo -e "   ${GREEN}✓${NC} backend/.env found"
fi

if [ ! -f "$FRONTEND_DIR/.env.local" ]; then
    echo -e "   ${YELLOW}⚠${NC}  mindlayer-react/.env.local not found"
    echo -e "      Some features may not work without Firebase configuration"
else
    echo -e "   ${GREEN}✓${NC} mindlayer-react/.env.local found"
fi

echo ""

# ── Summary ─────────────────────────────────────────────────────────────────
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Installation complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}Next steps:${NC}"
echo -e "  1. ${YELLOW}(IMPORTANT)${NC} Add your API keys to backend/.env"
echo -e "     ${CYAN}nano backend/.env${NC}"
echo ""
echo -e "  2. Start the app:"
echo -e "     ${CYAN}./start.sh${NC}"
echo ""
echo -e "  ${CYAN}What's needed:${NC}"
echo -e "     • ANTHROPIC_API_KEY (required)"
echo -e "     • HUME_API_KEY, DEEPGRAM_API_KEY, SUPERMEMORY_API_KEY (optional)"
echo ""
