# MindLayer

> MindLayer turns mental chaos into clarity — you dump your messy thoughts (text or voice), and AI agents classify, analyze, and respond with evidence-based support.

**IU Claude Hackathon 2026 · Track 2: Neuroscience & Mental Health**
**Submission deadline: March 29, 2026 at 2:30 PM EST**

---

## What it does

MindLayer is a multi-agent AI mental health toolkit built on Claude. Users dump their raw, unstructured thoughts — by typing or speaking — and a LangGraph pipeline of specialized agents:

1. **Classifies** thoughts into 4 buckets: worries, to-dos, emotions, and irrational thoughts (CBT cognitive distortions)
2. **Analyzes mood** from text sentiment + voice prosody (Hume AI)
3. **Monitors for crisis** signals in parallel, routing to 988 Lifeline when needed
4. **Calculates a wellness score** (0–100) that tracks over time
5. **Suggests evidence-based interventions**: breathing exercises, CBT reframes, grounding, micro-habits

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS 4 + shadcn/ui + Framer Motion |
| Backend | Python 3.11+ + FastAPI + LangGraph + Anthropic SDK |
| AI | Claude Sonnet 4 (via Anthropic API) |
| Voice | Hume AI (emotion from voice) + Deepgram Nova-3 (STT) + Web Speech API |
| Memory | Supermemory (per-user AI memory) |
| Database | Supabase (Postgres + auth) |
| Weather | Open-Meteo API (mood-weather correlation) |
| Streaming | SSE (agents → frontend) + WebSocket (audio → backend) |

---

## Team

| Name | Role | Focus |
|------|------|-------|
| **Ayan** (lead) | AI engineer | LangGraph agents, Claude API, prompt engineering |
| **Aaryan** | AI engineer | Hume AI, Supermemory, voice pipeline |
| **Chirag** | Software dev | React frontend, UI components, animations |
| **Adith** | Software dev | FastAPI backend, SSE streaming, database |

---

## Setup

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env           # Fill in your API keys
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                    # Runs on http://localhost:5173
```

The Vite dev server proxies `/api/*` to `http://localhost:8000`.

---

## Environment variables

Copy `backend/.env.example` to `backend/.env` and fill in your keys:

```env
ANTHROPIC_API_KEY=sk-ant-...
HUME_API_KEY=...
HUME_SECRET_KEY=...
DEEPGRAM_API_KEY=...
SUPERMEMORY_API_KEY=...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
MODEL_NAME=claude-haiku-3-5-20241022   # Use haiku for dev, sonnet-4 for demo
```

---

## Architecture

```
Frontend (React)
    │  SSE stream (agent progress events)
    │  WebSocket (audio)
    ▼
FastAPI Backend
    │
    ▼
LangGraph StateGraph
  ┌─────────────┐
  │  transcribe  │  (voice → text via Deepgram)
  └──────┬──────┘
         │
  ┌──────▼──────┐
  │   classify   │  (Claude: text → 4 buckets)
  └──┬───┬───┬──┘
     │   │   │  (parallel fan-out)
  ┌──▼─┐┌▼──┐┌▼──────┐
  │mood││wlns││crisis │
  └──┬─┘└┬──┘└┬──────┘
     │   │    │  (converge)
  ┌──▼───▼────▼──┐
  │  mode engine  │
  └──────┬────────┘
         │
  ┌──────▼──────┐
  │ intervention │  (Claude: CBT reframe if needed)
  └──────┬──────┘
         │
  ┌──────▼──────┐
  │ save memory  │  (Supermemory)
  └─────────────┘
```

---

## Submission

[Hackathon submission form](https://docs.google.com/forms/d/e/1FAIpQLSd3C9Lms7pnerrVI3H1BBgH2xvT9CEag_hXpqREKMciu5gdyQ/viewform)
# Mindlayer
