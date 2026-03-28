# CLAUDE.md — MindLayer Project Guide

> **READ THIS FIRST.** This file is the single source of truth for every Claude Code session across all 4 team members. Before writing any code, read this file and MEMORY.md completely.

## Project overview

**MindLayer** is a multi-agent AI mental health toolkit being built for the Claude Hackathon at Indiana University (March 27-29, 2026). It's in **Track 2: Neuroscience & Mental Health**.

**One-liner:** MindLayer turns mental chaos into clarity — you dump your messy thoughts (text or voice), and AI agents classify, analyze, and respond with evidence-based support.

**Submission deadline:** March 29, 2026 at 2:30 PM EST

## Team

| Name | Role | GitHub | Focus area |
|------|------|--------|------------|
| **Ayan** (lead) | AI engineer | Repo owner — all PRs merge here | LangGraph agents, Claude API, prompt engineering |
| **Aaryan** | AI engineer | Contributor | Hume AI integration, Supermemory, voice pipeline |
| **Chirag** | Software dev | Contributor | React frontend, UI components, animations |
| **Adith** | Software dev | Contributor | FastAPI backend, SSE streaming, database |

## Tech stack

```
Frontend:  React 19 + TypeScript + Vite + Tailwind CSS 4 + shadcn/ui + Framer Motion
Backend:   Python 3.11+ + FastAPI + LangGraph + Anthropic SDK
AI:        Claude Sonnet 4 (via Anthropic API)
Voice:     Hume AI (emotion from voice) + Deepgram Nova-3 (STT) + Web Speech API (live preview)
Memory:    Supermemory (per-user AI memory)
Database:  Supabase (Postgres + auth)
Weather:   Open-Meteo API (mood-weather correlation)
Streaming: SSE (agent → frontend) + WebSocket (audio → backend)
```

## Repository structure

```
mindlayer/
├── CLAUDE.md              ← YOU ARE HERE
├── MEMORY.md              ← Deep knowledge base — read this too
├── README.md
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── components/
│   │   │   ├── MoodSlider.tsx          ← 5-point emoji check-in
│   │   │   ├── VoiceRecorder.tsx       ← Hold-to-talk button
│   │   │   ├── BrainDump.tsx           ← Text input + submit
│   │   │   ├── ClassifiedResults.tsx   ← 4-bucket display
│   │   │   ├── ReframeCard.tsx         ← CBT thought reframing
│   │   │   ├── BreathingExercise.tsx   ← Animated breathing circle
│   │   │   ├── GroundingExercise.tsx   ← 5-4-3-2-1 guided grounding
│   │   │   ├── InterventionCard.tsx    ← Micro-intervention wrapper
│   │   │   ├── MoodIndicator.tsx       ← Live mood badge
│   │   │   ├── WellnessScore.tsx       ← Score + breakdown bars
│   │   │   ├── Dashboard.tsx           ← Charts + heatmap
│   │   │   └── CrisisResources.tsx     ← 988 Lifeline display
│   │   ├── hooks/
│   │   │   ├── useVoiceRecorder.ts     ← Web Speech API hook
│   │   │   ├── useAudioRecorder.ts     ← MediaRecorder for Deepgram
│   │   │   ├── useStreamingLLM.ts      ← SSE consumption hook
│   │   │   └── useMoodTheme.ts         ← Emotional color theming
│   │   ├── lib/
│   │   │   ├── api.ts                  ← API client
│   │   │   └── constants.ts            ← Mood configs, colors
│   │   └── styles/
│   │       └── globals.css
│   └── public/
├── backend/
│   ├── requirements.txt
│   ├── main.py                         ← FastAPI app entry
│   ├── config.py                       ← API keys, settings
│   ├── models/
│   │   ├── state.py                    ← MindLayerState TypedDict
│   │   └── brain_dump.py               ← Pydantic schemas
│   ├── agents/
│   │   ├── classifier.py               ← Brain dump → 4 buckets
│   │   ├── mood_analyzer.py            ← Sentiment + trajectory
│   │   ├── crisis_sentinel.py          ← Parallel safety monitor
│   │   ├── mode_engine.py              ← UI mode determination
│   │   ├── wellness.py                 ← 0-100 composite score
│   │   └── intervention.py             ← Micro-intervention selector
│   ├── graph/
│   │   └── mindlayer_graph.py          ← LangGraph StateGraph wiring
│   ├── services/
│   │   ├── hume_service.py             ← Hume AI voice emotion
│   │   ├── deepgram_service.py         ← Deepgram STT
│   │   ├── supermemory_service.py      ← Per-user memory
│   │   └── weather_service.py          ← Open-Meteo integration
│   └── routes/
│       ├── entries.py                  ← POST /api/process-entry
│       ├── streaming.py                ← SSE /api/stream
│       └── auth.py                     ← Supabase auth routes
└── docs/
    └── demo-script.md
```

## API keys and environment

Each team member has $15 in Anthropic API credits (total $60). Most other services are FREE.

```env
# .env file — NEVER commit this
ANTHROPIC_API_KEY=sk-ant-...          # Claude Sonnet 4
HUME_API_KEY=...                       # $20 free credits per account
HUME_SECRET_KEY=...                    # From platform.hume.ai
DEEPGRAM_API_KEY=...                   # $200 free credit on signup
SUPERMEMORY_API_KEY=...                # Free tier: 1M tokens
SUPABASE_URL=...                       # Free tier
SUPABASE_ANON_KEY=...
OPEN_METEO_API_KEY=                    # No key needed — free, no auth
```

**Budget allocation:** Put all $60 toward Claude. Everything else is free tier.

**Cost-saving during development:** Use `claude-haiku-3-5-20241022` for testing. Switch to `claude-sonnet-4-20250514` only for the demo. Control via `MODEL_NAME` env var.

## Current progress tracker

> **UPDATE THIS SECTION** every time you complete a task. This is how other team members' Claude sessions know what's done.

### Status: 🟢 CONVERSATION-FIRST PIVOT COMPLETE — DEMO PHASE

| Component | Status | Owner | Notes |
|-----------|--------|-------|-------|
| Project scaffolding (Vite + FastAPI) | ✅ 2026-03-28 | Chirag + Adith | Full folder structure, package.json, vite.config.ts, main.py, FastAPI skeleton |
| LangGraph state schema (`MindLayerState`) | ✅ 2026-03-28 | Ayan | backend/models/state.py — full TypedDict |
| Classifier agent | ✅ 2026-03-28 | Ayan | backend/agents/classifier.py — full impl with Claude tool use + streaming |
| Mood analyzer agent | ✅ 2026-03-28 | Ayan | 7-state model (crisis/anxious/stressed/standard/calm/positive/energized) + voice blending |
| Crisis sentinel agent | ✅ 2026-03-28 | Ayan | Parallel safety: keywords + trajectory + absolutist lang + escalation velocity |
| Mode engine | ✅ 2026-03-28 | Ayan | 7 modes with theme colors (incl. green/vibrant for positive states), CSS vars |
| Wellness score calculator | ✅ 2026-03-28 | Ayan | 6-component weighted, progressive activation, sigmoid compression, EWMA |
| Intervention agent | ✅ 2026-03-28 | Ayan | Priority selection + Claude CBT reframe + anti-repetition + emotion mapping |
| Response generator agent | ✅ 2026-03-28 | Ayan | Claude streaming for empathic conversation, multi-turn history, crisis protocol |
| Deepgram TTS | ✅ 2026-03-28 | Ayan | aura-2-thalia-en voice, /api/tts endpoint, browser audio playback |
| Chat-first UI | ✅ 2026-03-28 | Ayan | Dark theme (aesop.live/hume.ai inspired), token-by-token streaming, speaking indicator |
| LangGraph graph wiring | ✅ 2026-03-28 | Ayan | 8-node pipeline: transcribe→classify→fan-out→mode→intervention→respond→save→END |
| Hume AI voice emotion | ✅ 2026-03-28 | Ayan | Batch Expression Measurement API, parallel with Deepgram, voice-text blending |
| Deepgram STT integration | ✅ 2026-03-28 | Ayan | Nova-3, filler_words=True, POST /api/transcribe, graceful fallback |
| Supermemory per-user memory | ✅ 2026-03-28 | Ayan | save_entry + get_profile + search_history, wired into graph nodes |
| Open-Meteo weather correlation | ✅ 2026-03-28 | Ayan | weather_service.py implemented, not wired into pipeline (stretch goal) |
| Mood slider component | ✅ 2026-03-28 | Ayan | 5-point emoji tap, spring animations, affirming microcopy |
| Voice recorder component | ✅ 2026-03-28 | Ayan | Hold-to-talk, MediaRecorder for audio capture, mic button |
| Brain dump input + results | ✅ 2026-03-28 | Ayan | BrainDump textarea + VoiceRecorder + 4-bucket ClassifiedResults inline in App.tsx |
| Breathing exercise animation | ✅ 2026-03-28 | Ayan | Box + 4-7-8 patterns, Framer Motion circle, countdown, cycles |
| CBT reframe card | ✅ 2026-03-28 | Ayan | Progressive reveal inline in App.tsx (InterventionDisplay), Chirag extracts |
| Wellness dashboard + charts | ✅ 2026-03-28 | Ayan | WellnessDisplay inline in App.tsx + GET /api/demo/load for 14-day data. Chirag: add Recharts |
| Mode-switching UI theming | ✅ 2026-03-28 | Ayan | CSS custom properties on data-mood attribute, 800ms transition, 5 themes in globals.css |
| FastAPI SSE streaming endpoint | ✅ 2026-03-28 | Ayan | POST /api/stream with graph.astream(), typed SSE events, error handling |
| WebSocket audio endpoint | 🔶 Deferred | Adith | Not needed for demo — /api/transcribe handles file upload |
| Supabase auth + user storage | 🔶 Deferred | Adith | Using "demo_user" for demo, not blocking |
| API routes (entries, stream) | ✅ 2026-03-28 | Ayan | /api/process-entry, /api/stream, /api/test, /api/transcribe, /api/demo/load |
| CORS + middleware setup | ✅ 2026-03-28 | Ayan | CORS for localhost:5173, lifespan startup, /api/health |
| Crisis resources (988 display) | ✅ 2026-03-28 | Ayan | Warm coral palette, prominent 988, correct language, Framer Motion |
| Demo video recording | ⬜ Not started | All | Target: March 29, morning |
| Submission form | ⬜ Not started | Ayan | Deadline: March 29, 2:30 PM EST |

**Remaining polish for Chirag:** See `docs/CHIRAG-HANDOFF.md` for detailed instructions.
**Demo prep for all:** See `docs/DEMO-CHECKLIST.md` for recording steps.

**When you complete a task, change ⬜ to ✅ and add the date.**

## Build timeline (36 hours)

### Phase 1: Foundation (Hours 0-4) — TONIGHT
- **Adith:** Scaffold FastAPI with CORS, health check, `.env` loading. Set up Supabase project.
- **Chirag:** Scaffold Vite + React + Tailwind + shadcn/ui. Build MoodSlider and BrainDump input components.
- **Ayan:** Define `MindLayerState` TypedDict. Build the classifier agent with Claude structured output.
- **Aaryan:** Set up Hume AI account, get API keys. Build `hume_service.py` with Expression Measurement API.

### Phase 2: Core pipeline (Hours 4-12)
- **Adith:** Build SSE streaming endpoint. Wire `/api/process-entry` to LangGraph.
- **Chirag:** Build ClassifiedResults display (4-bucket cards). Build VoiceRecorder with `useVoiceRecorder` hook.
- **Ayan:** Build mood_analyzer + crisis_sentinel + mode_engine agents. Wire LangGraph StateGraph.
- **Aaryan:** Build Deepgram STT service. Build Supermemory integration. Build wellness score calculator.

### Phase 3: Integration (Hours 12-20)
- **Adith:** Connect Deepgram WebSocket for audio streaming. Add Supabase user auth.
- **Chirag:** Build BreathingExercise animation. Build ReframeCard with progressive reveal. Build MoodIndicator badge.
- **Ayan:** Add Hume voice emotion data to mood analyzer. Tune classifier prompt. Test full pipeline end-to-end.
- **Aaryan:** Build intervention agent with CBT reframe generation. Integrate Open-Meteo weather correlation.

### Phase 4: Polish + Demo (Hours 20-36)
- **All (Hours 20-28):** Mode-switching UI theming (Chirag). Wellness dashboard with Recharts (Chirag). Bug fixes and edge cases (Adith). Agent prompt tuning (Ayan + Aaryan).
- **All (Hours 28-32):** STOP CODING at hour 32. Final integration testing.
- **All (Hours 32-36):** Record demo video. Fill out submission form. Submit by 2:30 PM.

## Coding conventions

### Python (backend)
- Python 3.11+ (for `get_stream_writer()` support in LangGraph)
- Use `async def` for all FastAPI routes and LangGraph nodes
- Type hints everywhere — Pydantic models for all Claude structured outputs
- Use `anthropic` SDK directly (not LangChain's `ChatAnthropic`) for structured output via tool use
- Environment variables via `python-dotenv`

### TypeScript (frontend)
- Strict mode enabled
- Use React functional components with hooks only
- shadcn/ui components — don't reinvent buttons, cards, inputs
- Framer Motion for animations (not CSS animations)
- `@microsoft/fetch-event-source` for SSE consumption
- Never use `localStorage` — use React state or Supabase

### Git workflow
- Main branch: `main`
- Everyone works on feature branches: `feat/classifier-agent`, `feat/mood-slider`, etc.
- Pull from `main` before starting any work
- Push to your branch, create PR, merge quickly (no long-lived branches in a hackathon)
- Commit messages: `feat: add classifier agent`, `fix: SSE streaming reconnect`

## Key files reference

When Claude Code needs to understand a specific part of the system, read these files:

- **Overall architecture:** `CLAUDE.md` (this file) + `MEMORY.md`
- **State schema:** `backend/models/state.py` — the TypedDict that flows through all agents
- **Agent pipeline:** `backend/graph/mindlayer_graph.py` — the LangGraph StateGraph
- **Classifier prompt:** `backend/agents/classifier.py` — the system prompt for brain dump classification
- **API routes:** `backend/routes/entries.py` — the FastAPI endpoints
- **Frontend app structure:** `frontend/src/App.tsx` — main layout and routing

## Demo flow (what judges will see)

The demo video should show this exact sequence in ~4 minutes:

1. **Hook (0:00-0:30):** "47% of college students screen positive for anxiety — but 97% of people who download a mental health app quit within 30 days."
2. **Pitch (0:30-0:50):** "MindLayer is a multi-agent AI system that turns mental chaos into clarity."
3. **Live demo (0:50-2:50):**
   - User opens app → mood slider check-in (tap "Low")
   - User types brain dump → classified into 4 buckets (animated)
   - Irrational thought flagged → CBT reframe shown (progressive reveal)
   - Voice note recorded → Hume detects anxiety in voice tone
   - Wellness score updates → mode switches to "Stressed" (UI theme shifts)
   - Breathing exercise suggested → animated breathing circle
4. **Architecture (2:50-3:30):** Show LangGraph graph visualization + external services
5. **Ethics + Vision (3:30-4:00):** Crisis sentinel, 988 Lifeline, "not a therapist" disclaimer, anti-dependency

## Hackathon judging criteria (100 points total)

| Category | Points | What judges look for |
|----------|--------|---------------------|
| Impact Potential | 25 | Specific population, real problem, could it scale? |
| Technical Execution | 30 | Does it work? Is AI used purposefully? |
| Ethical Alignment | 25 | Risks considered? Empowers not replaces? |
| Presentation | 20 | Clear demo video, explains problem + solution |

## Submission form
https://docs.google.com/forms/d/e/1FAIpQLSd3C9Lms7pnerrVI3H1BBgH2xvT9CEag_hXpqREKMciu5gdyQ/viewform

**Deadline: March 29, 2:30 PM — 1 submission per team**

## Emergency contacts
- Hackathon Discord: https://discord.gg/BPqgjeBEe
- IU Hackathon site: https://claude-hackathon-at-iu.netlify.app
