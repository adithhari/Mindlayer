# MEMORY.md — MindLayer Deep Knowledge Base

> This file contains every architectural decision, code pattern, prompt, API detail, and implementation strategy discussed during MindLayer's design phase. Read `CLAUDE.md` first for the overview, then consult this file for implementation depth.

---

## Table of contents
1. Problem statement and validation data
2. System architecture
3. LangGraph state machine
4. Brain dump classifier agent
5. Mood analyzer agent
6. Crisis sentinel agent
7. Mode engine
8. Wellness score algorithm
9. Intervention agent
10. Voice recording pipeline
11. Hume AI integration
12. Supermemory integration
13. Mood slider UX
14. Real-time streaming (SSE + WebSocket)
15. React component architecture
16. Free API reference
17. Budget breakdown
18. Demo script
19. Ethical alignment strategy
20. Pre-loaded demo data

---

## 1. Problem statement and validation data

### The problem
Youth are mentally overloaded, but current coping tools are either too passive, too generic, or only useful once someone is already in crisis.

People already have thoughts, stress, anxiety, overthinking, burnout, and emotional spirals. They vent into notes apps, random chats, social media, or keep everything inside. Traditional journaling is helpful, but many youth quit because they do not know: what to write, how to interpret what they wrote, or what action to take after writing. When someone is overwhelmed, they do not need a blank page only — they need reflection + structure + support + the next step.

### Statistics for the presentation opening
- 47% of college students screen positive for anxiety or depression (Healthy Minds Study 2024-2025, 84,000+ students, 135 colleges)
- Fewer than half (46%) of affected students received therapy or counseling
- 97% of people who download a mental health app stop using it within 30 days (median 30-day retention: 3.3%, Baumel et al., JMIR 2019)
- 58% of 18-34-year-olds say stress is "completely overwhelming" most days (APA Stress in America 2023)
- Only 28% of college students with mental health problems actively seek professional help
- 85% say they think they should handle it on their own (SAMHSA)
- Structured journaling reduces anxiety by up to 42% over six weeks (Behaviour Research and Therapy)
- CBT thought records with structured writing produced effect sizes of d=1.08 vs d=0.63 without them

### Recommended opening line for demo
"47% of college students screen positive for anxiety or depression — but fewer than half get any help. Meanwhile, 97% of people who download a mental health app stop using it within 30 days. The tools exist. They just don't stick."

---

## 2. System architecture

### Three-layer design
```
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND: React 19 + Vite + Tailwind + shadcn/ui           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │Mood slide│ │Voice rec │ │Brain dump│ │Dashboard     │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
├─────────────── SSE + WebSocket ─────────────────────────────┤
│ BACKEND: FastAPI + LangGraph StateGraph                     │
│  ┌───────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐   │
│  │Classifier │→│Mood anal.│→│Mode eng. │→│Intervention │   │
│  └───────────┘ └──────────┘ └──────────┘ └─────────────┘   │
│       ↓ (parallel)    ↓ (parallel)                          │
│  ┌───────────┐ ┌──────────┐                                 │
│  │Crisis sen.│ │Wellness  │                                 │
│  └───────────┘ └──────────┘                                 │
├─────────────────────────────────────────────────────────────┤
│ EXTERNAL SERVICES                                           │
│  Claude API │ Hume AI │ Deepgram │ Supermemory │ Open-Meteo │
├─────────────────────────────────────────────────────────────┤
│ PERSISTENCE                                                 │
│  Supabase Postgres │ LangGraph Checkpoint │ Supermemory     │
└─────────────────────────────────────────────────────────────┘
```

### Communication protocols
- **SSE (Server-Sent Events):** Backend → Frontend. Used for streaming agent progress events ("Analyzing mood...", "Detecting patterns...") and final results. Use `@microsoft/fetch-event-source` on React side (supports POST with body, unlike native EventSource).
- **WebSocket:** Bidirectional audio streaming. Browser mic → Backend → Deepgram/Hume. Used only for voice recording feature.
- **REST:** Standard POST/GET for non-streaming operations (auth, history fetches).

---

## 3. LangGraph state machine

### Shared state schema

```python
# backend/models/state.py
from typing import TypedDict, Optional, Annotated
from datetime import datetime
from langgraph.graph import add_messages
import operator

class MindLayerState(TypedDict):
    # Input
    raw_text: str
    source: str                             # "text" or "voice"
    timestamp: datetime
    manual_mood: Optional[int]              # 1-5 from mood slider

    # Classifier output
    classified: Optional[dict]
    sentiment: Optional[float]              # -1.0 to 1.0
    crisis_flag: bool
    dominant_emotion: Optional[str]
    irrational_ratio: Optional[float]
    has_physical_symptoms: bool
    thought_counts: Optional[dict]

    # Hume AI voice emotion (if voice input)
    voice_emotions: Optional[dict]          # top 48-dimension scores
    voice_emotion_dominant: Optional[str]

    # Mood analyzer output
    mood_state: Optional[str]               # "calm"|"standard"|"stressed"|"anxious"|"crisis"
    mood_intensity: Optional[float]         # 0.0 to 1.0
    mood_trajectory: Optional[str]          # "improving"|"stable"|"declining"

    # Mode config
    mode_config: Optional[dict]

    # Wellness score
    wellness_score: Optional[int]           # 0-100
    wellness_breakdown: Optional[dict]

    # Intervention
    suggested_intervention: Optional[dict]
    intervention_type: Optional[str]        # "grounding"|"reframe"|"habit"|"crisis"|"breathing"
    intervention_reason: Optional[str]

    # History (rolling window)
    entry_history: Annotated[list, operator.add]

    # Supermemory
    user_profile: Optional[dict]            # auto-generated user profile from Supermemory
```

### Graph wiring

```python
# backend/graph/mindlayer_graph.py
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

def build_mindlayer_graph():
    graph = StateGraph(MindLayerState)

    # Nodes
    graph.add_node("transcribe", transcribe_node)      # voice → text (skip if text input)
    graph.add_node("classify", classify_brain_dump)     # text → 4 buckets
    graph.add_node("crisis_check", check_crisis)        # parallel safety
    graph.add_node("analyze_mood", analyze_mood)        # parallel mood
    graph.add_node("wellness", calculate_wellness)      # parallel score
    graph.add_node("determine_mode", determine_mode)    # mode switching
    graph.add_node("intervention", suggest_intervention) # final output
    graph.add_node("save_memory", save_to_supermemory)  # persist

    # Entry
    graph.set_entry_point("transcribe")

    # Transcribe → Classify
    graph.add_edge("transcribe", "classify")

    # Classify fans out to 3 parallel nodes
    graph.add_edge("classify", "crisis_check")
    graph.add_edge("classify", "analyze_mood")
    graph.add_edge("classify", "wellness")

    # All 3 converge to mode engine
    graph.add_edge("crisis_check", "determine_mode")
    graph.add_edge("analyze_mood", "determine_mode")
    graph.add_edge("wellness", "determine_mode")

    # Mode → Intervention
    graph.add_conditional_edges(
        "determine_mode",
        lambda s: "crisis" if s.get("crisis_flag") else "normal",
        {"crisis": "intervention", "normal": "intervention"}
    )

    # Intervention → Save → END
    graph.add_edge("intervention", "save_memory")
    graph.add_edge("save_memory", END)

    checkpointer = MemorySaver()
    return graph.compile(checkpointer=checkpointer)
```

### Generating the graph visualization for presentation

```python
# Run this to get a PNG of the graph for the architecture slide
graph = build_mindlayer_graph()
png_bytes = graph.get_graph().draw_mermaid_png()
with open("mindlayer_graph.png", "wb") as f:
    f.write(png_bytes)
```

---

## 4. Brain dump classifier agent

### Pydantic schemas

```python
# backend/models/brain_dump.py
from pydantic import BaseModel, Field
from enum import Enum

class StressLevel(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"

class ThoughtItem(BaseModel):
    text: str = Field(description="The extracted thought, preserving user's words")
    stress_level: StressLevel | None = Field(default=None)
    actionable: bool = Field(default=False)

class DetectedEmotion(BaseModel):
    emotion: str = Field(description="Named emotion: anxiety, overwhelm, sadness, etc.")
    physical_signal: str | None = Field(default=None, description="Body sensation if mentioned")
    is_dominant: bool = Field(default=False)

class IrrationalThought(BaseModel):
    original: str = Field(description="The exact irrational statement from the user")
    distortion_type: str = Field(description="CBT distortion type")

class BrainDumpResult(BaseModel):
    worries: list[ThoughtItem] = Field(default_factory=list)
    todos: list[ThoughtItem] = Field(default_factory=list)
    emotions: list[DetectedEmotion] = Field(default_factory=list)
    irrational_thoughts: list[IrrationalThought] = Field(default_factory=list)
    overall_sentiment: float = Field(description="-1.0 (very negative) to 1.0 (very positive)")
    crisis_flag: bool = Field(default=False)
```

### System prompt for the classifier

```
You are the Triage Agent inside MindLayer. Your role: take raw, unstructured thought dumps and organize them into four psychologically meaningful categories.

## THE FOUR CATEGORIES

### 1. WORRIES
Things causing stress, anxiety, or fear. Forward-looking concerns.
- Tag stress_level: "low" (minor), "medium" (recurring), "high" (causing distress or physical symptoms)
- Physical symptoms mentioned → always "high"

### 2. TO-DOS
Actionable tasks mentioned explicitly or implicitly.
- "I need to email my professor" → explicit
- "I haven't called mom back" → implicit (guilt about unfinished task)
- Tag actionable=true if doable right now in under 30 minutes

### 3. EMOTIONS
Named or implied emotional states:
- Explicit: "I feel overwhelmed"
- Implicit: "everything feels impossible" → hopelessness
- Somatic: "my chest feels tight" → anxiety (note physical_signal)
- Mark exactly ONE as is_dominant

### 4. IRRATIONAL THOUGHTS (Cognitive Distortions)
Identify thoughts reflecting the 15 CBT cognitive distortions (Burns, 1980):
- ALL-OR-NOTHING: "I'm a complete failure"
- OVERGENERALIZATION: "I always mess up" / "nothing ever works"
- MENTAL FILTER: Focusing only on negatives
- JUMPING TO CONCLUSIONS: Mind-reading or fortune-telling
- MAGNIFICATION: Blowing things up
- EMOTIONAL REASONING: "I feel stupid, so I must be stupid"
- SHOULD STATEMENTS: "I should be able to handle this"
- LABELING: "I'm a loser"
- PERSONALIZATION: Blaming yourself for external things
- CATASTROPHIZING: "This is the worst thing ever"

Quote exact words in "original". Name the distortion type.

## RULES
- A single sentence CAN appear in multiple categories
- Preserve the user's voice — don't sanitize
- Be generous with irrational_thoughts
- crisis_flag=true ONLY for: suicidal ideation, self-harm, wanting to not exist, harm to others
- overall_sentiment reflects EMOTIONAL TONE, not content
```

### Claude tool use pattern for structured output

```python
message = client.messages.create(
    model="claude-sonnet-4-20250514",  # or HAIKU for dev
    max_tokens=2048,
    system=CLASSIFIER_SYSTEM_PROMPT,
    messages=[{"role": "user", "content": f"Classify this brain dump:\n\n{raw_text}"}],
    tools=[{
        "name": "classify_thoughts",
        "description": "Classify brain dump into structured categories",
        "input_schema": BrainDumpResult.model_json_schema()
    }],
    tool_choice={"type": "tool", "name": "classify_thoughts"}
)
tool_block = next(b for b in message.content if b.type == "tool_use")
result = BrainDumpResult(**tool_block.input)
```

### Pre-loaded demo brain dump (guaranteed to produce all 4 categories)

```
I can't stop thinking about the exam tomorrow. I'm such a failure. Need to email professor about extension. My chest feels tight and I haven't eaten since morning. Also have to do laundry and call mom back. Everything feels impossible right now. I'll never be good enough for grad school. Maybe I should just go for a walk but I can't even get out of bed.
```

Expected output: 3 worries, 3 to-dos, 3 emotions (overwhelm dominant, anxiety with chest tightness), 2 irrational thoughts ("I'm such a failure" = labeling, "I'll never be good enough" = fortune-telling).

---

## 5. Mood analyzer agent

### Logic (rule-based + trajectory computation, NOT another LLM call)

The mood analyzer does NOT re-analyze text with Claude. It synthesizes the classifier's structured output with historical context.

**7 mood states:** crisis, anxious, stressed, standard, calm, positive, energized

**Mood state determination priority:**
1. If `crisis_flag=true` → "crisis"
2. If dominant emotion maps to a mood state (see EMOTION_MOOD_MAP) → use that
3. If sentiment ≤ -0.5 AND physical symptoms → "anxious"
4. If sentiment ≤ -0.3 OR irrational_ratio ≥ 0.3 → "stressed"
5. If sentiment ≥ 0.6 → "energized" (high positive arousal)
6. If sentiment ≥ 0.3 → "calm"
7. Default → "standard"

**EMOTION_MOOD_MAP:**
- panic/despair/hopelessness → crisis
- anxiety/fear/dread → anxious
- overwhelm/frustration/anger/sadness/loneliness → stressed
- neutral → standard
- contentment/relief/joy → calm
- hope/gratitude/proud/inspired → positive
- excited/enthusiastic/elated/motivated/determination → energized

**Mood intensity (0.0-1.0) is a weighted composite:**
- sentiment_intensity (|sentiment|) × 0.4
- distortion_intensity (min(irrational_ratio × 1.5, 1.0)) × 0.25
- physical_intensity (0.3 if symptoms, else 0.0) × 0.15
- worry_load (min(worry_count/5, 1.0)) × 0.2

**Trajectory uses EWMA comparison:**
- Compare current sentiment to average of last 3 entries
- Delta > 0.15 → "improving"
- Delta < -0.15 → "declining"
- Else → "stable"

**Escalation rule:** If trajectory=="declining" AND intensity > 0.7, bump mood_state up one severity level (standard→stressed, stressed→anxious, anxious→crisis). Positive states (positive, energized) NEVER escalate.

---

## 6. Crisis sentinel agent

Runs in PARALLEL with mood analyzer on every entry. Uses a sliding window over last 5 entries to detect escalation patterns.

**Crisis score formula (0.0-1.0):**
- Keyword presence: suicidal language, self-harm references, hopelessness markers
- Sentiment trajectory: sustained negative decline across entries
- Absolutist language frequency: "always", "never", "nothing", "everyone", "no one"
- Escalation velocity: how fast the sentiment is dropping

**Action thresholds:**
- score > 0.3: Subtly introduce grounding ("Would you like to try a breathing exercise?")
- score > 0.5: Surface crisis resources prominently ("You deserve support right now")
- score > 0.8: Override all other agents. Display 988 Lifeline. Suspend normal conversation.

**The app should NEVER say "I'm here for you" during a crisis. It should say "You deserve support from a real person right now."**

---

## 7. Mode engine

Translates mood_state into a UI mode configuration. Purely rule-based, no LLM call.

| Mode | Color scheme | UI density | Agent tone | Show interventions |
|------|-------------|-----------|------------|-------------------|
| energized | Vibrant gold (40deg) | Full | Channeling | No |
| positive | Fresh green (145deg) | Full | Celebratory | No |
| calm | Soft blues/greens | Full | Reflective | No |
| standard | Neutral grays | Full | Supportive | No |
| stressed | Warm amber | Simplified | Gentle, shorter | Yes |
| anxious | Muted lavender | Minimal | Grounding focus | Yes |
| crisis | Warm coral (NOT red) | Crisis only | Crisis protocol | Yes + 988 |

React implementation: CSS custom properties on `document.documentElement`, transitioned with `800ms cubic-bezier(0.4, 0, 0.2, 1)`. Use `data-mood` attribute for CSS selectors.

---

## 8. Wellness score algorithm

**6 components, weighted, with progressive data activation:**

| Component | Weight | Active after | Calculation |
|-----------|--------|-------------|-------------|
| Mood sentiment | 0.30 | 1 entry | EWMA of sentiment over 7 entries, normalized to 0-100 |
| Cognitive health | 0.25 | 3 entries | (1 - avg_irrational_ratio) × 100 |
| Consistency | 0.15 | 3 entries | (entries_in_7_days / 7)^0.7 × 100 |
| Physical awareness | 0.10 | 1 entry | 90 - (physical_mentions × 10), floor 30 |
| Engagement | 0.10 | 5 entries | intervention_engagement_rate × 100 |
| Trajectory bonus | 0.10 | 1 entry | improving=80, stable=50, declining=20 |

**When a component is inactive, its weight redistributes proportionally to active ones.**

**Sigmoid compression at extremes:** Effective range is 5-95 (not 0-100). Prevents floor/ceiling effects.

**Bands:** Thriving (80-100), Doing well (60-79), Managing (40-59), Struggling (20-39), Needs attention (0-19).

**Disclaimer (ALWAYS show):** "This is a personal reflection tool, not a clinical assessment."

---

## 9. Intervention agent

### Selection priority
1. Crisis → always crisis_support (988 + grounding)
2. Has irrational thoughts + stressed/anxious → thought_reframe (uses Claude)
3. Mood-emotion match → best matching from hardcoded library
4. Fallback → box breathing

### Intervention library (hardcoded, evidence-based)
- **grounding_54321**: 5-4-3-2-1 sensory grounding (DBT distress tolerance)
- **box_breathing**: 4-4-4-4 pattern, 4 cycles (Navy SEAL protocol)
- **478_breathing**: 4-7-8 pattern, 3 cycles (Dr. Andrew Weil)
- **thought_reframe**: Claude-generated CBT reframe (requires LLM call)
- **walk_5min**: Micro-walk for lethargy/sadness
- **hydrate**: Drink water prompt for physical symptoms
- **text_someone**: Social connection for loneliness
- **body_scan**: MBSR body scan for anxiety
- **gratitude_one**: "Name one good thing" for neutral/low moods

### CBT reframe prompt (when intervention_type == "reframe")

```
You are a CBT thought reframing assistant. Given an irrational thought and its cognitive distortion type, generate:
1. A gentle explanation of WHY this is a distortion (2 sentences max)
2. Evidence AGAINST the thought (what a kind friend would point out)
3. A balanced reframe (not toxic positivity — realistic and compassionate)

Use "we" language: "When we think in all-or-nothing terms..."
Never dismiss the emotion. Validate it, then offer perspective.
```

### Anti-repetition logic
Check last suggested intervention in history. If same, rotate to next best candidate.

---

## 10. Voice recording pipeline

### Dual-path architecture
1. **Web Speech API** (browser-native): Live transcription preview while user speaks. Zero cost, Chrome only. Words appear in real-time. This is the UX layer — disposable.
2. **Deepgram Nova-3** (server-side): Accurate final transcript. $200 free credit. Sub-300ms latency via WebSocket. This is the truth layer.

### React implementation
- `react-speech-recognition` v4.0.1 for live preview hook
- Native `MediaRecorder` API for capturing audio blob (WebM/Opus format)
- Hold-to-talk UX: `onMouseDown`/`onMouseUp`/`onTouchStart`/`onTouchEnd`/`onMouseLeave`/`onTouchCancel`
- Audio blob POSTed to `/api/transcribe` as FormData

### Key gotcha: filler word suppression
Both Web Speech API and Whisper ACTIVELY SUPPRESS filler words ("um", "uh"). For a mental health app where hesitations carry meaning, this matters. Deepgram has `filler_words=true` parameter. Whisper can be coaxed with `initial_prompt` containing fillers.

---

## 11. Hume AI integration

### What it does
Detects 48 emotions from voice PROSODY (not just text content). Captures what text analysis misses: trembling voice when saying "I'm fine", forced laughter, sighs, hesitation.

### API details
- **Expression Measurement API**: Send audio file → get 48-dimension emotion vector
- **Streaming via WebSocket**: Real-time emotion detection as user speaks
- **Cost**: $0.0639/minute audio. Free $20 credit per account ($80 total across team).
- **Python SDK**: `pip install hume` → `AsyncHumeClient`
- **React SDK**: `npm i @humeai/voice-react` → `<VoiceProvider>` + hooks

### Integration point in MindLayer
Voice input → Hume Expression Measurement (parallel with Deepgram) → 48 emotions returned → top 3 emotions injected into LangGraph state → mood analyzer uses both text sentiment AND voice emotion for more accurate mood detection.

```python
# Example: combine text and voice emotion
if state.get("voice_emotions"):
    # Weight voice emotion at 40%, text at 60%
    voice_anxiety = state["voice_emotions"].get("anxiety", 0)
    text_anxiety = 1.0 if state["dominant_emotion"] == "anxiety" else 0.0
    combined_anxiety = text_anxiety * 0.6 + voice_anxiety * 0.4
```

### Key emotions for MindLayer (from Hume's 48)
Most relevant: anxiety, sadness, distress, tiredness, contemplation, determination, confusion, empathic pain, relief, contentment, amusement, joy.

---

## 12. Supermemory integration

### What it provides
Persistent, per-user AI memory across sessions. Automatically extracts facts, builds profiles, resolves contradictions, and forgets expired info.

### API usage

```python
from supermemory import Supermemory
client = Supermemory()

# Save entry context
client.add(
    content=f"User brain dump: {raw_text}. Mood: {mood_state}. Score: {wellness_score}",
    container_tags=[f"user_{user_id}"],
    metadata={"type": "entry", "mood": mood_state, "score": wellness_score}
)

# Retrieve user profile (auto-generated)
profile = client.profile(container_tag=f"user_{user_id}")
# profile.profile.static → "User has recurring exam anxiety, prefers breathing exercises"
# profile.profile.dynamic → "Currently stressed about grad school applications"

# Semantic search over past entries
results = client.search(
    query="What triggers the user's anxiety?",
    container_tags=[f"user_{user_id}"],
    limit=5
)
```

### Free tier: 1M processed tokens + 10K search queries/month

### Use in MindLayer
1. On session start: load user profile → inject into classifier system prompt as context
2. After each entry: save classified results + mood + score to Supermemory
3. In wellness dashboard: use search to surface patterns ("You tend to feel anxious on Mondays")
4. In intervention selection: use profile to avoid repeating ineffective interventions

---

## 13. Mood slider UX

### Design: 5-point emoji tap selector (NOT a continuous slider)

```tsx
const MOODS = [
  { value: 1, emoji: "😞", label: "Awful",  color: "bg-red-50" },
  { value: 2, emoji: "😔", label: "Low",    color: "bg-orange-50" },
  { value: 3, emoji: "😐", label: "Okay",   color: "bg-yellow-50" },
  { value: 4, emoji: "🙂", label: "Good",   color: "bg-emerald-50" },
  { value: 5, emoji: "😊", label: "Great",  color: "bg-green-50" },
];
```

### Interaction model: "Anchor and Adjust"
1. Session starts with mood slider → user taps their conscious assessment
2. AI analysis runs in background during the session
3. If AI-detected mood significantly diverges from self-report, surface observation gently: "You checked in feeling 'Good,' but I notice some tension in what you shared"
4. Manual mood is the ANCHOR. AI never overrides it — only complements.

### Key design rules
- Rounded corners everywhere (rounded-3xl)
- Spring-physics animations (Framer Motion)
- Time-of-day greeting: "Good morning — How are you feeling right now?"
- Muted pastel colors — NOT harsh red-to-green
- Never show numeric values like "3/5"
- Affirming microcopy: "Thanks for sharing" or "It's okay to feel that way" for lower moods

---

## 14. Real-time streaming

### FastAPI SSE endpoint

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from langgraph.config import get_stream_writer

@app.post("/api/stream")
async def stream_analysis(entry: EntryRequest):
    async def event_generator():
        async for event in graph.astream(
            {"raw_text": entry.text, "source": entry.source, ...},
            stream_mode=["custom", "updates"],
            config={"configurable": {"thread_id": entry.user_id}}
        ):
            yield f"data: {json.dumps(event)}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
```

### LangGraph streaming progress events

```python
# Inside any agent node:
from langgraph.config import get_stream_writer

async def classify_brain_dump(state):
    writer = get_stream_writer()
    writer({"type": "step_start", "step": "classify", "message": "Sorting your thoughts..."})
    # ... Claude API call ...
    writer({"type": "step_complete", "step": "classify", "message": "Thoughts organized"})
    return {**state, "classified": result}
```

### React SSE consumption

```tsx
import { fetchEventSource } from '@microsoft/fetch-event-source';

const useStreamingAnalysis = () => {
  const [events, setEvents] = useState<any[]>([]);
  
  const startStream = async (text: string) => {
    await fetchEventSource('/api/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, source: 'text' }),
      onmessage(ev) {
        const data = JSON.parse(ev.data);
        setEvents(prev => [...prev, data]);
      },
    });
  };
  
  return { events, startStream };
};
```

### Thinking indicators (React component)
Show step-by-step progress as agents run:
- "Sorting your thoughts..." (classifier)
- "Analyzing emotional patterns..." (mood analyzer)
- "Checking in on you..." (crisis sentinel)
- "Calculating wellness..." (wellness scorer)
- "Finding the right support..." (intervention)

Use Framer Motion `AnimatePresence` to fade indicators in/out as steps complete.

---

## 15. React component architecture

### Key components and their data flow

```
App.tsx
├── MoodSlider → emits manual_mood (1-5) → stored in state
├── InputArea
│   ├── BrainDump → emits text → POST to /api/stream
│   └── VoiceRecorder → emits transcript → same POST
├── StreamingResults (appears after submission)
│   ├── ThinkingIndicator → shows agent progress
│   ├── ClassifiedResults → 4-bucket grid
│   │   └── ReframeCard → progressive CBT reveal (on irrational thought click)
│   ├── MoodIndicator → live badge with state + trajectory arrow
│   └── InterventionCard
│       ├── BreathingExercise → animated circle
│       ├── GroundingExercise → 5-4-3-2-1 steps
│       └── CrisisResources → 988 + hotlines
├── WellnessScore → score + breakdown bars
└── Dashboard → Recharts mood trends + heatmap
```

### Emotional theming (CSS custom properties)

```typescript
const THEME_COLORS = {
  blue:       { primary: '210 60% 55%', surface: '210 30% 97%' },  // calm
  neutral:    { primary: '220 10% 50%', surface: '220 10% 97%' },  // standard
  warm:       { primary: '35 80% 55%',  surface: '35 40% 97%' },   // stressed
  soft:       { primary: '270 40% 65%', surface: '270 20% 97%' },  // anxious
  supportive: { primary: '15 60% 60%',  surface: '15 30% 97%' },   // crisis
};
```

Apply via `document.documentElement.style.setProperty()` with 800ms transition.

### Visualization libraries
- **Recharts**: Mood trend line charts (bundled with shadcn/ui charts)
- **react-calendar-heatmap**: GitHub-style mood calendar heatmap
- **@nivo/radar**: Emotion radar/spider chart (Joy, Calm, Energy, Focus, Social, Sleep dimensions)

---

## 16. Free API reference

| Service | Free tier | Key features for MindLayer | Auth |
|---------|----------|---------------------------|------|
| Claude Sonnet 4 | $60 total budget | Classification, reframing, reasoning | API key |
| Hume AI | $20/account × 4 = $80 | 48 voice emotions, EVI | API key + secret |
| Deepgram | $200 free credit | Nova-3 STT, filler words, sentiment | API key |
| Supermemory | 1M tokens + 10K searches/mo | Per-user memory, auto profiles | API key |
| Open-Meteo | 10K calls/day | Weather for mood correlation | None needed |
| Web Speech API | Unlimited | Live transcript preview | None (browser) |
| Supabase | Free tier (500MB, unlimited API) | Postgres + auth | URL + anon key |
| Affirmations.dev | Unlimited | Positive affirmations | None |
| ZenQuotes.io | Rate-limited | Mood-matched quotes | None |

---

## 17. Budget breakdown

| Service | Budget | Cost per call | Calls available |
|---------|--------|--------------|----------------|
| Claude Sonnet 4 | $50 | ~$0.021 (2K in + 1K out) | ~2,380 sessions |
| Claude Haiku 3.5 (dev) | - | ~$0.006 | ~8,300 sessions |
| Hume AI | $0 (free credits) | $0.0639/min | ~1,252 minutes |
| Everything else | $0 | Free | Unlimited |
| Reserve | $10 | Emergency buffer | - |

**Cost-saving strategy:** Use Haiku 3.5 during development via `MODEL_NAME` env var. Switch to Sonnet 4 for demo only.

---

## 18. Demo script (4 minutes)

### Act 1 — The Hook (0:00-0:30)
Dark screen. Statistic fades in. Voiceover: "Right now, a teenager is lying awake at 2 AM, overwhelmed by thoughts they can't sort through. 47% of college students screen positive for anxiety or depression — but fewer than half get any help. And 97% who download a mental health app stop using it within 30 days."

### Act 2 — Elevator Pitch (0:30-0:50)
"This is MindLayer — a multi-agent AI system built on Claude that helps youth process overwhelming thoughts. You talk or type a brain dump. Our AI agents classify your thoughts, detect your mood from both text and voice, reframe negative patterns using CBT, and track your wellness over time. And if it detects a crisis, a dedicated safety agent intervenes immediately."

### Act 3 — Live Demo (0:50-2:50)
1. Open app → mood slider → tap "Low" (10s)
2. Type pre-loaded brain dump → watch classification animation (30s)
3. Tap irrational thought → progressive CBT reframe (30s)
4. Record voice note → Hume emotion detected → UI theme shifts (30s)
5. Wellness dashboard → score + charts + mood-weather insight (20s)

### Act 4 — Architecture (2:50-3:30)
Show LangGraph graph visualization. Name: Claude, Hume, Deepgram, Supermemory. Highlight parallel crisis sentinel. "This isn't a wrapper around an API. It's a multi-agent system with 7 specialized agents."

### Act 5 — Ethics + Vision (3:30-4:00)
"Three ethical design decisions: Crisis detection routes to 988 immediately. MindLayer tells users it's a tool, not a therapist. All data is encrypted and user-owned." Close on the 2 AM image.

---

## 19. Ethical alignment strategy (25 points)

### Three-tier crisis protocol
1. Mild distress: offer grounding + gentle professional resource reminder
2. Moderate signals: prominently display crisis resources + ask "Would you like help connecting?"
3. Acute crisis: immediately display 988 + Crisis Text Line, suspend AI chat, offer grounding ONLY while connecting

### Anti-dependency features
- Weekly prompt: "Have you talked to someone you trust?"
- "Therapy readiness" module helping prepare for professional conversations
- Direct links to IU Counseling Services (812-855-5711)
- Sunset clause suggesting users deepen work with a counselor

### Language decisions (signal ethical awareness)
- "We suggest" NOT "you should" → preserves autonomy
- "Pattern" NOT "diagnosis" → avoids clinical overreach
- "Notice" NOT "detect" → emphasizes user-driven insight
- "Practice" NOT "treatment" → frames as skills
- Never anthropomorphize: "You deserve support from a real person" NOT "I'm here for you"

### WHO six principles mapping
1. Protect Autonomy: skip buttons on every interaction
2. Promote Well-being: evidence-based exercises only
3. Ensure Transparency: "How this works" buttons, confidence indicators
4. Foster Accountability: feedback mechanisms
5. Ensure Inclusiveness: accessibility, cultural sensitivity
6. Promote Sustainability: regular updates from user feedback

---

## 20. Pre-loaded demo data

### Mock 14-day history (for wellness dashboard demo)

```python
DEMO_HISTORY = [
    {"day": 1,  "sentiment": 0.2,  "irrational_ratio": 0.1,  "mood_state": "standard",  "worry_count": 1},
    {"day": 2,  "sentiment": 0.15, "irrational_ratio": 0.12, "mood_state": "standard",  "worry_count": 2},
    {"day": 3,  "sentiment": 0.0,  "irrational_ratio": 0.2,  "mood_state": "standard",  "worry_count": 2},
    {"day": 5,  "sentiment": -0.1, "irrational_ratio": 0.25, "mood_state": "stressed",  "worry_count": 3},
    {"day": 6,  "sentiment": -0.25,"irrational_ratio": 0.3,  "mood_state": "stressed",  "worry_count": 4},
    {"day": 7,  "sentiment": -0.4, "irrational_ratio": 0.35, "mood_state": "stressed",  "worry_count": 4},
    {"day": 8,  "sentiment": -0.5, "irrational_ratio": 0.4,  "mood_state": "anxious",   "worry_count": 5},
    {"day": 9,  "sentiment": -0.45,"irrational_ratio": 0.35, "mood_state": "stressed",  "worry_count": 4},
    {"day": 10, "sentiment": -0.3, "irrational_ratio": 0.25, "mood_state": "stressed",  "worry_count": 3},
    {"day": 11, "sentiment": -0.15,"irrational_ratio": 0.2,  "mood_state": "standard",  "worry_count": 2},
    {"day": 12, "sentiment": 0.0,  "irrational_ratio": 0.18, "mood_state": "standard",  "worry_count": 2},
    {"day": 13, "sentiment": 0.1,  "irrational_ratio": 0.15, "mood_state": "standard",  "worry_count": 1},
    {"day": 14, "sentiment": 0.15, "irrational_ratio": 0.12, "mood_state": "standard",  "worry_count": 1},
]
# This arc produces: score ~52 ("Managing"), trajectory "improving"
# Narratively interesting — shows system recognizing recovery
```

### Pre-loaded brain dump for demo

```
I can't stop thinking about the exam tomorrow. I'm such a failure. Need to email professor about extension. My chest feels tight and I haven't eaten since morning. Also have to do laundry and call mom back. Everything feels impossible right now. I'll never be good enough for grad school. Maybe I should just go for a walk but I can't even get out of bed.
```

---

## 21. Final integration status (as of March 28, 2026 evening)

### Working endpoints

| Endpoint | Method | Status | Description |
|----------|--------|--------|-------------|
| `/health` | GET | Working | Returns `{"status": "ok"}` |
| `/api/health` | GET | Working | Same as above |
| `/api/process-entry` | POST | Working | Full pipeline, returns JSON result |
| `/api/stream` | POST | Working | SSE streaming of agent progress events |
| `/api/test` | POST | Working | Demo brain dump shortcut, accepts optional `{text}` |
| `/api/transcribe` | POST | Working | Audio upload → Deepgram STT + Hume emotion (parallel) |
| `/api/demo/load` | GET | Working | 14-day mock history for wellness dashboard |
| `/api/demo/history` | GET | Working | Raw 14-day entries for charting |

### Required environment variables (backend/.env)

```env
ANTHROPIC_API_KEY=sk-ant-...          # REQUIRED — Claude API for classifier + reframe
MODEL_NAME=claude-3-5-haiku-20241022  # Use haiku for dev, claude-sonnet-4-20250514 for demo
SUPERMEMORY_API_KEY=sm_...            # Optional — per-user memory (silent fallback if missing)
HUME_API_KEY=...                      # Optional — voice emotion (silent fallback if missing)
DEEPGRAM_API_KEY=...                  # Optional — STT (silent fallback, uses Web Speech API)
SUPABASE_URL=                         # Not used yet — deferred
SUPABASE_ANON_KEY=                    # Not used yet — deferred
CORS_ORIGINS=http://localhost:5173    # Vite dev server
```

**Only ANTHROPIC_API_KEY is strictly required.** All other services fall back gracefully.

### Commands to run the full app

```bash
# Terminal 1: Backend
cd backend
/opt/homebrew/anaconda3/bin/python3 -m uvicorn main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm install   # first time only
npm run dev   # Vite on http://localhost:5173
```

**Important:** Use Anaconda Python (`/opt/homebrew/anaconda3/bin/python3`), NOT system Python (`/usr/bin/python3` is 3.9 and missing deps).

### Known issues and workarounds

1. **System Python 3.9 vs Anaconda 3.13:** All pip installs must use Anaconda. The `from __future__ import annotations` import in every file ensures syntax compatibility with both.
2. **Deepgram not configured:** Transcription falls back to `null` — frontend should use Web Speech API transcript instead. Not blocking for demo (text input works).
3. **Supermemory profile on first use:** First call to `get_profile()` returns None since no entries exist yet. This is handled gracefully.
4. **WebSocket audio streaming:** Not implemented — using file upload via `/api/transcribe` instead. Works fine for demo.
5. **Supabase auth:** Not implemented — using hardcoded `"demo_user"` for all requests. Not blocking.
6. **Thread IDs:** Each request gets a unique `uuid` thread_id to prevent checkpoint state collision. History doesn't carry across requests (fresh each time). For the demo this is fine.

### Actual demo flow (what exists right now)

1. Open http://localhost:5173
2. **Mood slider** appears: "How are you feeling right now?" — tap an emoji (e.g., "Low")
3. **Brain dump** textarea: type or paste text (click "Load demo" for pre-loaded example)
4. **Voice recorder**: hold mic button to record (captures audio blob, but Deepgram not configured yet so transcript won't populate)
5. Click **"Untangle my thoughts"** button
6. **Streaming phase**: animated thinking indicators show each agent completing:
   - "Sorting your thoughts..." (classifier — calls Claude)
   - "Analyzing emotional patterns..." (mood analyzer — instant)
   - "Checking in on you..." (crisis sentinel — instant)
   - "Calculating your wellness score..." (wellness — instant)
   - "Figuring out the best support..." (mode engine — instant)
   - "Finding the right support..." (intervention — may call Claude for reframe)
   - "Saving your progress..." (save to Supermemory)
7. **Results phase** appears with:
   - **Mood badge**: "stressed ↓" or similar with intensity percentage
   - **4-bucket grid**: worries, to-dos, emotions, thought patterns (staggered animation)
   - **Intervention card**: either CBT reframe (with progressive reveal), breathing exercise (with animated circle), or grounding steps
   - **Wellness score**: number + 6-component breakdown bars (animated)
   - If crisis detected: warm coral 988 Lifeline card appears at top
8. **Theme shifts**: background color transitions smoothly based on mood_state (blue/gray/amber/lavender/coral)
9. Click **"Start a new entry"** to reset

### Crisis detection verification

Test with this input to verify crisis flow:
```
I don't want to be here anymore. Nothing matters. Everyone would be better off without me.
```
Expected: crisis_flag=true, CrisisResources component appears immediately during streaming AND in results, mode switches to crisis (warm coral theme), intervention is crisis_support with 988 number.

---

## 22. Conversation-first pivot (March 28, 2026 night)

### What changed

MindLayer pivoted from a dashboard-first UI to a **conversation-first voice companion**. The entire LangGraph pipeline stays identical. A new **response_generator** agent was added on top, and the frontend was rebuilt as a chat interface with TTS.

### New pipeline flow

```
User speaks/types
    ↓
transcribe (Supermemory profile load)
    ↓
classify (Claude structured output → 4 buckets)
    ↓ (parallel fan-out)
┌─────────────┬──────────────┬────────────┐
crisis_check   analyze_mood    wellness
└─────────────┴──────────────┴────────────┘
    ↓ (converge)
determine_mode
    ↓
intervention (CBT reframe if needed)
    ↓
response_generator ← NEW (Claude streaming → natural conversation)
    ↓
save_memory (Supermemory + history)
    ↓
END → Frontend receives: chat tokens + dashboard data + audio URL
```

### Response generator (backend/agents/response_generator.py)

The response generator receives the COMPLETE pipeline state and produces a warm, natural response:
- Leads with empathy and validation
- Translates analysis into human language (never exposes raw data)
- Presents interventions as gentle invitations
- 2-3 sentences max for spoken delivery
- Uses "we" language, avoids "you should"
- Crisis: drops everything, validates, surfaces 988
- Supports multi-turn via conversation_history in state
- Streams tokens via get_stream_writer() → chat_token SSE events

### Deepgram TTS (backend/services/tts_service.py)

- REST API: POST https://api.deepgram.com/v1/speak
- Voice: aura-2-thalia-en (calm, smooth, professional)
- Returns mp3 bytes for browser Audio() playback
- Endpoint: POST /api/tts

### New endpoints

- POST /api/chat/stream — primary endpoint: full pipeline + response generator, streams step events + chat_token events + dashboard event + done with thread_id
- POST /api/tts — text-to-speech, returns audio/mpeg

### Frontend (conversation-first dark theme)

Inspired by aesop.live (dark, bold typography) + hume.ai (empathic voice AI).

**Layout:**
- Sidebar: MindLayer logo, new conversation, wellness mini-display, insights toggle
- Main: full-height chat with scrollable messages
- Dashboard: slide-out right panel with wellness score + classified thoughts + breakdown bars

**Chat behavior:**
- First message: mood check-in (emoji tap in chat bubble)
- User types → SSE stream → AI response appears token-by-token
- After response completes, TTS audio plays automatically (mute toggle available)
- Speaking indicator (animated equalizer bars) during playback
- Each exchange updates sidebar wellness display

**Styling:**
- Background: #0a0a0a (near-black)
- Text: #f5f5f0 (warm off-white)
- Accent: #6BB5C9 (soft teal) — adapts per mood via --mood-accent CSS var
- Cards: #141414 with #2a2a2a border
- Animations: Framer Motion spring physics, token streaming cursor

### Updated demo script (conversation-style)

1. **Open app** → dark chat interface appears
2. **Mood check-in** → tap "Low" → AI: "Thanks for being honest. What's on your mind?"
3. **Type brain dump** → watch chat_token events stream in the response bubble
4. **AI responds** empathically + audio plays: "It sounds like you're carrying a lot right now..."
5. **Click Insights** → dashboard slides out showing wellness score, classified thoughts
6. **Continue conversation** → "I feel like I'll never be good enough"
7. **AI reframes** with CBT: "When we feel that way, it's often the stress talking..."
8. **Test crisis** → "I don't want to be here anymore"
9. **988 card** appears inline in chat + AI: "You deserve support from a real person right now"
10. **Show architecture** slide: 8-node LangGraph pipeline with parallel execution
