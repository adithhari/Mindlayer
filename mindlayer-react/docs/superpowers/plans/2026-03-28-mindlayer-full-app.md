# MindLayer Full-Fledged App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform MindLayer into a complete, polished mental wellness web app with onboarding, significantly better AI responses (single fast Claude call with richer output), TTS playback, a working Insights chart page, and a restyled Journal — all within the existing React 18 + Vite + vanilla CSS stack.

**Architecture:** All data lives in localStorage via AppContext. No backend — Claude, Deepgram, and Hume are called directly from the browser with keys from `.env.local`. New AI function `analyzeEntry()` replaces the two-call chain (`brainDumpSummarize` + `getEmotionAwareResponse`) with one unified Claude call that returns richer structured output including a `stressLevel` score that drives orb color.

**Tech Stack:** React 18, Vite, vanilla CSS (CSS custom properties), Claude Opus 4.6 (direct browser), Deepgram Nova-2 STT + TTS, Hume AI batch emotion (optional), localStorage, SVG charts (no new npm dependencies)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/utils/api.js` | Modify | Add `analyzeEntry()` — single Claude call, richer JSON output |
| `src/context/AppContext.jsx` | Modify | Add `userProfile` state (name, concern), `conversationHistory` |
| `src/components/Onboarding/Onboarding.jsx` | Create | First-run screen: name + primary concern |
| `src/components/Home/Home.jsx` | Modify | Use `analyzeEntry()`, add TTS play button, better response layout |
| `src/components/Insights/Insights.jsx` | Create | Mood chart (SVG), streak, emotion breakdown |
| `src/components/Journal/Journal.jsx` | Modify | Restyle cards to match dark orb aesthetic |
| `src/components/Journal/JournalModal.jsx` | Modify | Minor style refresh |
| `src/components/Navigation/Navigation.jsx` | Modify | Highlight active tab more clearly |
| `src/App.jsx` | Modify | Add onboarding gate (show Onboarding if no profile) |
| `src/styles/index.css` | Modify | Add styles for onboarding, insights chart, journal cards |

---

## Task 1 — Better AI: Replace Two-Call Chain with `analyzeEntry()`

**Why:** Currently Home.jsx makes two sequential Claude calls (~4–6s total). One unified call is faster (~2s), more coherent, and returns `stressLevel` (0–100) so the orb color is AI-driven, not guessed from keywords.

**Files:**
- Modify: `src/utils/api.js`

- [ ] **Step 1: Add `analyzeEntry` function to `api.js`**

Open `src/utils/api.js`. After the `extractJSON` helper (line ~16), add:

```js
// Single unified analysis call — replaces brainDumpSummarize + getEmotionAwareResponse
export const analyzeEntry = async (text, userName = '', moodLabel = 'Neutral', recentThemes = []) => {
  const context = [
    userName ? `The user's name is ${userName}.` : '',
    `Their self-reported mood right now is: ${moodLabel}.`,
    recentThemes.length > 0
      ? `Recent themes from their journal: ${recentThemes.slice(0, 3).join(', ')}.`
      : '',
  ].filter(Boolean).join(' ');

  const systemPrompt = `You are a warm, perceptive mental wellness companion. You speak like a trusted friend who also has training in psychology — never clinical, never generic.

${context}

The user has shared something with you. Your job:
1. ACKNOWLEDGE what they shared with genuine warmth (2–3 sentences, use their name if provided, reference specific details they mentioned — never say "I hear you" or "I understand")
2. INSIGHT: Name the core emotional pattern in 1 sentence. Be specific — not "you seem stressed" but "it sounds like the pressure is coming from feeling like you have no control over the timeline"
3. MICRO_ACTION: One tiny, specific action they can do in the next 10 minutes. Concrete ("open Notes app and list 3 things") not vague ("try journaling")
4. AFFIRMATION: 1 sentence. Empowering, specific to their situation, not a cliché
5. STRESS_LEVEL: Integer 0–100 representing how much distress this entry conveys (0 = serene, 100 = in crisis)
6. THEME: One of: anxiety | sadness | anger | overwhelm | neutral | positive | grief | loneliness

Return ONLY this JSON, no preamble:
{
  "acknowledgment": "...",
  "insight": "...",
  "microAction": "...",
  "affirmation": "...",
  "stressLevel": 45,
  "theme": "anxiety"
}`;

  const raw = await askClaude(systemPrompt, text);
  return extractJSON(raw);
};
```

- [ ] **Step 2: Verify build still passes**

```bash
cd mindlayer-react && npx vite build 2>&1 | tail -5
```
Expected: `✓ built in ...ms`

- [ ] **Step 3: Commit**

```bash
git add src/utils/api.js
git commit -m "feat: add analyzeEntry() — single unified Claude call with stressLevel + theme"
```

---

## Task 2 — AppContext: Add `userProfile` + `conversationHistory`

**Why:** The improved AI prompt needs the user's name and recent themes. `conversationHistory` powers multi-turn context on the Home screen.

**Files:**
- Modify: `src/context/AppContext.jsx`

- [ ] **Step 1: Add `userProfile` state**

Open `src/context/AppContext.jsx`. After the existing `const [streakDays, setStreakDays]` block, add:

```js
// User profile (onboarding)
const [userProfile, setUserProfile] = useState(() =>
  JSON.parse(localStorage.getItem('ml_profile') || 'null')
);

// Conversation history for Home screen (last 6 messages)
const [conversationHistory, setConversationHistory] = useState([]);
```

- [ ] **Step 2: Persist `userProfile` to localStorage**

After the existing `useEffect` blocks that persist `moodLog` and `journalEntries`, add:

```js
useEffect(() => {
  if (userProfile) localStorage.setItem('ml_profile', JSON.stringify(userProfile));
}, [userProfile]);
```

- [ ] **Step 3: Add `addConversationTurn` helper**

After the existing `deleteJournalEntry` callback, add:

```js
const addConversationTurn = useCallback((userText, aiResponse) => {
  setConversationHistory(prev => {
    const updated = [...prev, { role: 'user', text: userText }, { role: 'ai', text: aiResponse }];
    return updated.slice(-6); // keep last 3 exchanges
  });
}, []);
```

- [ ] **Step 4: Expose new values in context `value` object**

Add to the `value` object:
```js
userProfile,
setUserProfile,
conversationHistory,
addConversationTurn,
```

- [ ] **Step 5: Verify build**

```bash
npx vite build 2>&1 | tail -5
```
Expected: `✓ built in ...ms`

- [ ] **Step 6: Commit**

```bash
git add src/context/AppContext.jsx
git commit -m "feat: add userProfile + conversationHistory to AppContext"
```

---

## Task 3 — Onboarding Screen

**Why:** The AI needs the user's name. First-time visitors should see a welcoming setup screen before the Home page. Only shown once (gated by `userProfile === null` in AppContext).

**Files:**
- Create: `src/components/Onboarding/Onboarding.jsx`
- Modify: `src/App.jsx`
- Modify: `src/styles/index.css`

- [ ] **Step 1: Create `Onboarding.jsx`**

Create `src/components/Onboarding/Onboarding.jsx`:

```jsx
import { useState } from 'react';
import { useApp } from '../../context/AppContext';

const CONCERNS = [
  { key: 'anxiety',    label: 'Anxiety & worry',    emoji: '😰' },
  { key: 'stress',     label: 'Stress & burnout',   emoji: '😤' },
  { key: 'sadness',    label: 'Sadness & low mood',  emoji: '😔' },
  { key: 'overwhelm',  label: 'Feeling overwhelmed', emoji: '😵' },
  { key: 'general',   label: 'General wellness',    emoji: '🌱' },
];

export default function Onboarding() {
  const { setUserProfile } = useApp();
  const [step, setStep] = useState(1); // 1 = name, 2 = concern
  const [name, setName] = useState('');
  const [concern, setConcern] = useState('');

  const handleNameNext = (e) => {
    e.preventDefault();
    if (name.trim().length < 1) return;
    setStep(2);
  };

  const handleFinish = (selectedConcern) => {
    setUserProfile({ name: name.trim(), concern: selectedConcern, createdAt: Date.now() });
  };

  return (
    <div className="onboarding-screen">
      <div className="onboarding-card">
        {step === 1 && (
          <>
            <div className="onboarding-orb" />
            <h1 className="onboarding-title">Welcome to MindLayer</h1>
            <p className="onboarding-sub">Your private space to untangle your thoughts.</p>
            <form onSubmit={handleNameNext} className="onboarding-form">
              <label className="onboarding-label">What should I call you?</label>
              <input
                className="onboarding-input"
                type="text"
                placeholder="Your name…"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                maxLength={40}
              />
              <button
                className="onboarding-btn"
                type="submit"
                disabled={!name.trim()}
              >
                Continue →
              </button>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="onboarding-title">Hey {name} 👋</h1>
            <p className="onboarding-sub">What brings you here most?</p>
            <div className="concern-grid">
              {CONCERNS.map(({ key, label, emoji }) => (
                <button
                  key={key}
                  className={`concern-btn ${concern === key ? 'selected' : ''}`}
                  onClick={() => { setConcern(key); setTimeout(() => handleFinish(key), 200); }}
                >
                  <span className="concern-emoji">{emoji}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add onboarding gate to `App.jsx`**

Open `src/App.jsx` and replace its content:

```jsx
import { useApp } from './context/AppContext';
import Navigation from './components/Navigation/Navigation';
import Home from './components/Home/Home';
import Journal from './components/Journal/Journal';
import Tracker from './components/Tracker/Tracker';
import Onboarding from './components/Onboarding/Onboarding';

function App() {
  const { activeScreen, setActiveScreen, userProfile } = useApp();

  if (!userProfile) return <Onboarding />;

  const renderScreen = () => {
    switch (activeScreen) {
      case 'home':     return <Home />;
      case 'insights': return <Tracker />;
      case 'journal':  return <Journal />;
      default:         return <Home />;
    }
  };

  return (
    <div className="mindlayer-app">
      <main className="screen-container">
        {renderScreen()}
      </main>
      <Navigation activeScreen={activeScreen} onScreenChange={setActiveScreen} />
    </div>
  );
}

export default App;
```

- [ ] **Step 3: Add onboarding CSS to `index.css`**

Append to `src/styles/index.css`:

```css
/* ─── Onboarding ─────────────────────────────────────────────────────────────────── */
.onboarding-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg1);
  padding: 24px;
}

.onboarding-card {
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  text-align: center;
}

.onboarding-orb {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 32%, hsl(25 78% 88%), hsl(25 78% 66%) 50%, hsl(25 78% 48%));
  box-shadow: 0 0 30px 8px hsl(25 78% 66% / 0.5), 0 0 70px 18px hsl(25 78% 66% / 0.2);
  animation: orb-breathe 5s ease-in-out infinite;
  margin-bottom: 8px;
}

.onboarding-title {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.5px;
  color: var(--text);
}

.onboarding-sub {
  font-size: 15px;
  color: var(--text2);
  margin-top: -12px;
}

.onboarding-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
}

.onboarding-label {
  font-size: 14px;
  color: var(--text2);
  text-align: left;
  font-weight: 600;
}

.onboarding-input {
  width: 100%;
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  color: var(--text);
  font-family: 'Sora', sans-serif;
  font-size: 16px;
  outline: none;
  transition: border-color 0.2s;
}
.onboarding-input:focus { border-color: rgba(167,139,250,0.5); }

.onboarding-btn {
  background: var(--accent);
  color: #0d1117;
  border: none;
  border-radius: var(--radius-md);
  padding: 14px;
  font-family: 'Sora', sans-serif;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s;
  margin-top: 4px;
}
.onboarding-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
.onboarding-btn:disabled { opacity: 0.35; cursor: not-allowed; }

.concern-grid {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.concern-btn {
  width: 100%;
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 14px 18px;
  color: var(--text2);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  transition: all 0.2s;
}
.concern-btn:hover  { border-color: rgba(167,139,250,0.4); color: var(--text); background: var(--bg3); }
.concern-btn.selected { border-color: var(--accent); background: rgba(167,139,250,0.1); color: var(--accent); }
.concern-emoji { font-size: 20px; }
```

- [ ] **Step 4: Verify build**

```bash
npx vite build 2>&1 | tail -5
```
Expected: `✓ built in ...ms`

- [ ] **Step 5: Commit**

```bash
git add src/components/Onboarding/Onboarding.jsx src/App.jsx src/styles/index.css
git commit -m "feat: add onboarding screen with name + concern capture"
```

---

## Task 4 — Home: Wire `analyzeEntry()` + TTS Playback

**Why:** Replace the two-call chain with the faster unified call. Add TTS so the AI speaks back. Show `insight` and `microAction` separately in the response card. Use `stressLevel` from the response to set the orb's speaking hue.

**Files:**
- Modify: `src/components/Home/Home.jsx`

- [ ] **Step 1: Update imports**

At the top of `src/components/Home/Home.jsx`, replace the import line for api utils:

```js
import { analyzeEntry, deepgramTextToSpeech } from '../../utils/api';
import { checkCrisis } from '../../utils/constants';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
```

Remove the old imports of `brainDumpSummarize`, `getEmotionAwareResponse`.

- [ ] **Step 2: Add `userProfile`, `addConversationTurn`, `useAudioPlayer` to the component**

Inside the `Home` component, replace:
```js
const { logMood, addJournalEntry } = useApp();
```
with:
```js
const { logMood, addJournalEntry, userProfile, conversationHistory, addConversationTurn } = useApp();
const { play: playAudio, isPlaying: ttsPlaying } = useAudioPlayer();
```

- [ ] **Step 3: Rewrite `handleSubmit` to use `analyzeEntry`**

Replace the entire `handleSubmit` function with:

```js
const handleSubmit = async (text) => {
  if (!text.trim() || isSubmitting) return;

  if (checkCrisis(text)) {
    setShowCrisis(true);
    return;
  }

  setIsSubmitting(true);
  setOrbState('processing');
  setResponse(null);
  setDisplayedText('');
  setErrorMsg('');

  try {
    // Derive recent themes from journal / conversation history for context
    const recentThemes = conversationHistory
      .filter(m => m.role === 'ai')
      .slice(-2)
      .map(m => m.text.slice(0, 60));

    const result = await analyzeEntry(
      text,
      userProfile?.name || '',
      moodLabel,
      recentThemes
    );

    // stressLevel 0-100 → hue: 18 (orange-red) to 210 (blue) to 145 (green)
    const hue = result.stressLevel > 70 ? 18
              : result.stressLevel > 40 ? 220
              : 145;

    setSpeakingHue(hue);
    setOrbState('speaking');
    setResponse(result);
    typewrite(result.acknowledgment);

    addConversationTurn(text, result.acknowledgment);
    logMood(moodLabel.toLowerCase(), sliderValue / 10);

    addJournalEntry(text, {
      emotions: [{ name: result.theme, score: result.stressLevel / 100 }],
      dominantEmotion: result.theme,
      intensity: Math.round(result.stressLevel / 10),
      summary: result.insight,
    }, null).catch(() => {});

    setInputText('');
  } catch (err) {
    console.error('Error:', err);
    setOrbState('idle');
    setErrorMsg(err.message || 'Something went wrong. Check your API key in .env.local');
  } finally {
    setIsSubmitting(false);
  }
};
```

- [ ] **Step 4: Add TTS handler**

After `handleReset`, add:

```js
const handleTTS = async () => {
  if (!response?.acknowledgment) return;
  try {
    const fullText = [response.acknowledgment, response.insight, response.microAction]
      .filter(Boolean).join(' ');
    const { audioUrl } = await deepgramTextToSpeech(fullText);
    playAudio(audioUrl);
  } catch (err) {
    console.error('TTS error:', err);
  }
};
```

- [ ] **Step 5: Update response JSX to show `insight` + `microAction` + TTS button**

Replace the `{(orbState === 'speaking' || displayedText) && displayedText && (...)}` block with:

```jsx
{displayedText && (
  <div className="orb-response">
    <p className="orb-response-ack">{displayedText}</p>

    {response && displayedText === response.acknowledgment && (
      <>
        {response.insight && (
          <div className="orb-insight">
            <span className="orb-section-label">What I notice</span>
            <p>{response.insight}</p>
          </div>
        )}
        {response.microAction && (
          <div className="orb-microaction">
            <span className="microaction-label">Try this now</span>
            <p>{response.microAction}</p>
          </div>
        )}
        {response.affirmation && (
          <p className="orb-affirmation">✦ {response.affirmation}</p>
        )}
        <div className="orb-response-footer">
          <button
            className={`tts-btn ${ttsPlaying ? 'tts-btn--active' : ''}`}
            onClick={handleTTS}
            title="Listen to response"
          >
            {ttsPlaying ? '🔊' : '🔈'} {ttsPlaying ? 'Playing…' : 'Listen'}
          </button>
          <button className="orb-reset-btn" onClick={handleReset}>Clear ✕</button>
        </div>
      </>
    )}
  </div>
)}
```

- [ ] **Step 6: Update state label — remove the reset button from `orb-state-label` since it's now in the response card**

Replace the `{orbState === 'speaking' && response && (...)}` in the state label with:

```jsx
{orbState === 'speaking' && <span className="orb-label--speaking">Responding…</span>}
```

- [ ] **Step 7: Add new CSS to `index.css`**

Append to `src/styles/index.css`:

```css
/* ─── Response card sections ──────────────────────────────────────────────────── */
.orb-response-ack {
  font-size: 15px;
  color: var(--text);
  line-height: 1.75;
}

.orb-insight {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.orb-section-label {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text3);
  margin-bottom: 5px;
}

.orb-insight p {
  font-size: 14px;
  color: var(--text2);
  line-height: 1.65;
}

.orb-affirmation {
  margin-top: 12px;
  font-size: 13px;
  color: var(--accent);
  font-style: italic;
  letter-spacing: 0.01em;
}

.orb-response-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.tts-btn {
  background: var(--bg3);
  border: 1px solid var(--border);
  color: var(--text2);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  padding: 6px 14px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}
.tts-btn:hover { border-color: var(--accent); color: var(--accent); }
.tts-btn--active { border-color: var(--accent); color: var(--accent); background: rgba(167,139,250,0.1); }

.orb-label--speaking {
  color: hsl(var(--orb-h) var(--orb-s) var(--orb-l));
  font-weight: 600;
}
```

- [ ] **Step 8: Verify build**

```bash
npx vite build 2>&1 | tail -5
```
Expected: `✓ built in ...ms`

- [ ] **Step 9: Commit**

```bash
git add src/components/Home/Home.jsx src/styles/index.css
git commit -m "feat: wire analyzeEntry + TTS playback + richer response card on Home"
```

---

## Task 5 — Insights Page (Mood Chart + Streak + Emotion Breakdown)

**Why:** The Insights tab currently shows a stub with just a title. Builds SVG mood chart from `moodLog` in AppContext — no new npm dependencies.

**Files:**
- Create: `src/components/Insights/Insights.jsx`
- Modify: `src/App.jsx` (swap Tracker for Insights)
- Modify: `src/styles/index.css`

- [ ] **Step 1: Create `src/components/Insights/Insights.jsx`**

```jsx
import { useMemo } from 'react';
import { useApp } from '../../context/AppContext';

// Returns last N calendar days as date strings "Mon Mar 25"
function lastNDays(n) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toDateString();
  });
}

const MOOD_SCORE = { 'very unpleasant': 1, unpleasant: 2, neutral: 5, pleasant: 7, 'very pleasant': 9 };

const THEME_COLORS = {
  anxiety:   '#f4a261', sadness: '#74b3ce', anger: '#e76f51',
  overwhelm: '#e9c46a', neutral: '#a8dadc', positive: '#52b788',
  grief:     '#9d8189', loneliness: '#b5838d',
};

export default function Insights() {
  const { moodLog, journalEntries, streakDays } = useApp();

  const days = lastNDays(7);

  // Build score per day (average if multiple logs)
  const scoreByDay = useMemo(() => {
    const map = {};
    moodLog.forEach(entry => {
      const s = entry.score ?? MOOD_SCORE[entry.mood?.toLowerCase()] ?? 5;
      if (!map[entry.date]) map[entry.date] = [];
      map[entry.date].push(s);
    });
    return map;
  }, [moodLog]);

  // Collect themes from journal for breakdown
  const themeCounts = useMemo(() => {
    const counts = {};
    journalEntries.forEach(e => {
      const t = e.dominantEmotion || 'neutral';
      counts[t] = (counts[t] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [journalEntries]);

  const totalEntries = journalEntries.length;
  const avgScore = moodLog.length
    ? (moodLog.reduce((sum, e) => sum + (e.score ?? 5), 0) / moodLog.length).toFixed(1)
    : '–';

  const chartHeight = 120;
  const chartWidth = 280;
  const barW = 28;
  const gap = (chartWidth - days.length * barW) / (days.length + 1);

  return (
    <div className="insights-screen">
      <h1 className="insights-title">Your Patterns</h1>

      {/* Stats row */}
      <div className="insights-stats">
        <div className="stat-card">
          <span className="stat-value">🔥 {streakDays}</span>
          <span className="stat-label">Day streak</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{totalEntries}</span>
          <span className="stat-label">Entries</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{avgScore}</span>
          <span className="stat-label">Avg mood</span>
        </div>
      </div>

      {/* Mood chart */}
      <div className="insights-section">
        <h2 className="insights-section-title">Mood — last 7 days</h2>
        {moodLog.length === 0 ? (
          <p className="insights-empty">Log your mood on the Home screen to see your chart.</p>
        ) : (
          <div className="mood-chart-wrap">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 24}`} className="mood-chart">
              {days.map((day, i) => {
                const scores = scoreByDay[day];
                const avg = scores ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
                const x = gap + i * (barW + gap);
                const barH = avg ? Math.round((avg / 10) * chartHeight) : 4;
                const y = chartHeight - barH;
                const hue = avg
                  ? Math.round(20 + ((avg / 10) * 145))
                  : null;
                const label = new Date(day).toLocaleDateString('en-US', { weekday: 'short' });
                return (
                  <g key={day}>
                    <rect
                      x={x} y={y} width={barW} height={barH}
                      rx={6}
                      fill={avg ? `hsl(${hue} 75% 62%)` : 'var(--bg3)'}
                      opacity={avg ? 0.9 : 0.4}
                    />
                    <text
                      x={x + barW / 2} y={chartHeight + 16}
                      textAnchor="middle"
                      fontSize="10"
                      fill="var(--text3)"
                    >
                      {label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>

      {/* Emotion breakdown */}
      {themeCounts.length > 0 && (
        <div className="insights-section">
          <h2 className="insights-section-title">Top emotions</h2>
          <div className="theme-bars">
            {themeCounts.map(([theme, count]) => {
              const pct = Math.round((count / totalEntries) * 100);
              const color = THEME_COLORS[theme] || 'var(--accent)';
              return (
                <div key={theme} className="theme-bar-row">
                  <span className="theme-bar-label">{theme}</span>
                  <div className="theme-bar-track">
                    <div
                      className="theme-bar-fill"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                  <span className="theme-bar-pct">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent entries teaser */}
      {journalEntries.length === 0 && moodLog.length === 0 && (
        <div className="insights-placeholder">
          <p>🌱</p>
          <p>Your patterns will appear here after a few entries.</p>
          <p>Start by sharing what's on your mind on the Home screen.</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update `App.jsx` to import Insights instead of Tracker**

In `src/App.jsx`:
- Remove: `import Tracker from './components/Tracker/Tracker';`
- Add: `import Insights from './components/Insights/Insights';`
- Replace `case 'insights': return <Tracker />;` with `case 'insights': return <Insights />;`

- [ ] **Step 3: Add Insights CSS to `index.css`**

Append to `src/styles/index.css`:

```css
/* ─── Insights Screen ───────────────────────────────────────────────────────────── */
.insights-screen {
  padding: 28px 20px;
  max-width: 540px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 28px;
  animation: fadeIn 0.3s ease;
}

.insights-title {
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.3px;
}

.insights-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.stat-card {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
}

.stat-label {
  font-size: 11px;
  color: var(--text3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.insights-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.insights-section-title {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text3);
}

.mood-chart-wrap {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px;
  display: flex;
  justify-content: center;
}

.mood-chart { width: 100%; max-width: 320px; }

.insights-empty {
  font-size: 14px;
  color: var(--text3);
  text-align: center;
  padding: 24px 0;
}

.theme-bars {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.theme-bar-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.theme-bar-label {
  width: 90px;
  font-size: 13px;
  color: var(--text2);
  text-transform: capitalize;
  flex-shrink: 0;
}

.theme-bar-track {
  flex: 1;
  height: 8px;
  background: var(--bg3);
  border-radius: 8px;
  overflow: hidden;
}

.theme-bar-fill {
  height: 100%;
  border-radius: 8px;
  transition: width 0.6s ease;
  opacity: 0.85;
}

.theme-bar-pct {
  width: 34px;
  font-size: 12px;
  color: var(--text3);
  text-align: right;
  flex-shrink: 0;
}

.insights-placeholder {
  text-align: center;
  color: var(--text3);
  font-size: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 40px 0;
}
.insights-placeholder p:first-child { font-size: 36px; }
```

- [ ] **Step 4: Verify build**

```bash
npx vite build 2>&1 | tail -5
```
Expected: `✓ built in ...ms`

- [ ] **Step 5: Commit**

```bash
git add src/components/Insights/Insights.jsx src/App.jsx src/styles/index.css
git commit -m "feat: build Insights page with SVG mood chart + streak + emotion breakdown"
```

---

## Task 6 — Journal Page: Restyle to Match Dark Aesthetic

**Why:** The Journal cards use inline styles with inconsistent `var(--radius)` (which doesn't exist — should be `var(--radius-md)`). Align with the new design system.

**Files:**
- Modify: `src/components/Journal/Journal.jsx`
- Modify: `src/styles/index.css`

- [ ] **Step 1: Rewrite `Journal.jsx`**

Replace the entire file content:

```jsx
import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { emotionColor } from '../../utils/api';
import JournalModal from './JournalModal';

export default function Journal() {
  const { journalEntries } = useApp();
  const [selectedEntry, setSelectedEntry] = useState(null);

  return (
    <div className="journal-screen">
      <div className="journal-header">
        <h1>Journal</h1>
        <p>{journalEntries.length} {journalEntries.length === 1 ? 'entry' : 'entries'}</p>
      </div>

      {journalEntries.length === 0 ? (
        <div className="journal-empty">
          <span>📔</span>
          <p>No entries yet</p>
          <p>Entries are saved automatically when you share something on the Home screen.</p>
        </div>
      ) : (
        <div className="journal-grid">
          {journalEntries.map(entry => (
            <JournalCard
              key={entry.id}
              entry={entry}
              onClick={() => setSelectedEntry(entry)}
            />
          ))}
        </div>
      )}

      {selectedEntry && (
        <JournalModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </div>
  );
}

function JournalCard({ entry, onClick }) {
  const color = emotionColor(entry.dominantEmotion || 'neutral');
  return (
    <button className="journal-card" onClick={onClick} style={{ '--entry-color': color }}>
      <div className="journal-card-top">
        <span className="journal-card-date">{entry.date}</span>
        <span className="journal-card-emotion">{entry.dominantEmotion || 'neutral'}</span>
      </div>
      {entry.title && <p className="journal-card-title">{entry.title}</p>}
      <p className="journal-card-preview">{entry.text}</p>
    </button>
  );
}
```

- [ ] **Step 2: Add Journal card CSS to `index.css`**

Append:

```css
/* ─── Journal Cards ─────────────────────────────────────────────────────────────── */
.journal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

.journal-card {
  background: var(--bg2);
  border: 1px solid color-mix(in srgb, var(--entry-color, var(--border)) 30%, var(--border));
  border-left: 3px solid var(--entry-color, var(--accent));
  border-radius: var(--radius-md);
  padding: 16px;
  cursor: pointer;
  text-align: left;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: transform 0.2s, box-shadow 0.2s;
  font-family: 'Sora', sans-serif;
}
.journal-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.25);
}

.journal-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.journal-card-date {
  font-size: 11px;
  font-weight: 600;
  color: var(--text3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.journal-card-emotion {
  font-size: 11px;
  font-weight: 600;
  color: var(--entry-color, var(--accent));
  text-transform: capitalize;
}

.journal-card-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--entry-color, var(--text));
  line-height: 1.4;
}

.journal-card-preview {
  font-size: 13px;
  color: var(--text2);
  line-height: 1.6;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.journal-empty {
  text-align: center;
  padding: 60px 20px;
  color: var(--text3);
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
}
.journal-empty span { font-size: 44px; }
.journal-empty p:first-of-type { font-size: 17px; color: var(--text2); font-weight: 600; }
.journal-empty p:last-of-type { font-size: 13px; max-width: 280px; }
```

- [ ] **Step 3: Verify build**

```bash
npx vite build 2>&1 | tail -5
```
Expected: `✓ built in ...ms`

- [ ] **Step 4: Commit**

```bash
git add src/components/Journal/Journal.jsx src/styles/index.css
git commit -m "feat: restyle Journal page with consistent dark aesthetic + CSS custom property cards"
```

---

## Task 7 — Polish: Greeting with Name + Home Screen Header

**Why:** The AI says the user's name in responses — the Home screen should too.

**Files:**
- Modify: `src/components/Home/Home.jsx`

- [ ] **Step 1: Personalize greeting with user's name**

In `Home.jsx`, update the header JSX. Replace:

```jsx
<span className="home-greeting">{greeting}</span>
<span className="home-tagline">How are you feeling?</span>
```

with:

```jsx
<span className="home-greeting">{greeting}{userProfile?.name ? `, ${userProfile.name}` : ''}</span>
<span className="home-tagline">How are you feeling today?</span>
```

- [ ] **Step 2: Verify build**

```bash
npx vite build 2>&1 | tail -5
```
Expected: `✓ built in ...ms`

- [ ] **Step 3: Commit**

```bash
git add src/components/Home/Home.jsx
git commit -m "feat: personalize Home greeting with user name from profile"
```

---

## Verification Checklist

After all tasks are complete, verify end-to-end:

- [ ] **Onboarding**: Clear localStorage (`localStorage.clear()` in console), reload → onboarding screen with orb pulse appears. Enter name, select concern → goes to Home.
- [ ] **Home orb idle**: Slider at 0 → warm orange. Slider at 50 → blue. Slider at 100 → green. Colors transition smoothly.
- [ ] **Home submit**: Type "I'm feeling anxious about my exam tomorrow" → send → orb turns purple (processing) → turns colored (speaking) → response card appears with acknowledgment typing out → insight + microAction + affirmation appear → Listen button plays TTS.
- [ ] **Home orb voice**: Click orb or mic button → orb turns cyan with ripples → stop → transcript appears in textbox.
- [ ] **Journal**: After submitting on Home, go to Journal → entry card appears with title and emotion color.
- [ ] **Insights**: After a few submissions, go to Insights → streak shows, bar chart shows days, emotion bars show themes.
- [ ] **Error state**: Remove API key from `.env.local`, restart, submit text → red error banner appears with message.
- [ ] **Crisis detection**: Type "I want to hurt myself" → crisis overlay appears (not the AI response).

---

## Notes for Execution

- **No new npm dependencies** — SVG charts, CSS animations, all built-in
- **Never commit `.env.local`** — add it to `.gitignore` if not already there
- **Model**: `claude-opus-4-6` in `api.js` — works with the `anthropic-dangerous-direct-browser-access: true` header for direct browser calls
- **All tasks are independent after Task 2** (AppContext) — Tasks 3-7 can be worked in any order after Task 2 is done
