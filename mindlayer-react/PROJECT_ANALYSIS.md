# MindLayer - Complete Project Analysis & Architecture Guide

## Executive Summary

**MindLayer** is an AI-powered mental health support application built with React that combines real-time emotion detection, journaling, habit personalization, and crisis support into a cohesive mental wellness platform. The app uses cutting-edge AI APIs (Anthropic Claude, Hume AI, Deepgram) to provide compassionate, personalized mental health coaching.

**Core Value Proposition:**
- Transform scattered thoughts into actionable insights using AI
- Real-time emotion detection and personalized responses
- Voice-to-text journaling with automatic title generation
- Evidence-based micro-habits for emotional regulation
- Crisis support with immediate resources

---

## 1. SYSTEM ARCHITECTURE

### 1.1 Technology Stack

```
Frontend:
├── React 18.3.1 (UI Framework)
├── Vite 5.0.10 (Build Tool & Dev Server)
└── CSS3 with CSS Variables (Styling)

State Management:
├── React Context API (AppContext)
└── localStorage (Persistent Storage)

External APIs:
├── Anthropic Claude (Text Analysis, Coaching)
├── Hume AI (Emotion Detection from Text)
├── Deepgram (Speech-to-Text & Text-to-Speech)
└── (Optional) Crisis Hotline APIs

Architecture Pattern:
├── Component-Based UI
├── Custom Hooks (useAudioRecorder, useAudioPlayer)
├── Context-Driven State Sharing
└── Utility Functions (API Calls, Helpers)
```

### 1.2 Project Structure

```
mindlayer-react/
│
├── src/
│   ├── App.jsx                           # Main app router/switcher
│   ├── index.js                          # Entry point
│   │
│   ├── context/
│   │   └── AppContext.jsx                # Global state (journals, moods, streak)
│   │
│   ├── hooks/
│   │   ├── useAudioRecorder.js          # Microphone recording management
│   │   └── useAudioPlayer.js             # Audio playback management
│   │
│   ├── utils/
│   │   ├── api.js                        # All API integrations (Claude, Hume, Deepgram)
│   │   ├── constants.js                  # Crisis keywords, habits data
│   │   └── helpers.js                    # Utility functions
│   │
│   ├── components/
│   │   ├── Navigation/
│   │   │   └── Navigation.jsx            # Tab navigation (Home, Dump, Journal, etc)
│   │   │
│   │   ├── Dashboard/
│   │   │   ├── Dashboard.jsx             # Home screen layout
│   │   │   ├── MoodPills.jsx             # Quick mood selector buttons
│   │   │   └── Streak.jsx                # Daily streak counter
│   │   │
│   │   ├── BrainDump/
│   │   │   ├── BrainDump.jsx             # Main controller/orchestrator
│   │   │   ├── DumpModeSelector.jsx      # "Dump" vs "Journal" mode toggle
│   │   │   ├── DumpInput.jsx             # Text input + speech-to-text button
│   │   │   └── DumpResult.jsx            # Results display + TTS button
│   │   │
│   │   ├── Journal/
│   │   │   ├── Journal.jsx               # Journal grid display
│   │   │   └── JournalModal.jsx          # Journal entry detail view/edit
│   │   │
│   │   ├── Chat/
│   │   │   └── Chat.jsx                  # AI coach conversation (skeleton)
│   │   │
│   │   ├── Tracker/
│   │   │   └── Tracker.jsx               # Mood charts (skeleton)
│   │   │
│   │   ├── Habits/
│   │   │   └── Habits.jsx                # Personalized habits (skeleton)
│   │   │
│   │   ├── Reframe/
│   │   │   └── Reframe.jsx               # CBT exercises (skeleton)
│   │   │
│   │   └── Crisis/
│   │       └── CrisisOverlay.jsx         # Emergency support overlay
│   │
│   └── styles/
│       └── index.css                     # Global styling + CSS variables
│
├── public/
│   └── index.html                        # HTML entry point
│
├── .env                                  # API keys configuration
├── vite.config.js                        # Vite configuration
├── package.json                          # Dependencies & scripts
└── README.md                             # Project readme
```

---

## 2. FEATURE BREAKDOWN & IMPLEMENTATION

### Feature 1: BRAIN DUMP (Core Feature - Fully Implemented)

#### 2.1.1 Purpose & Value
Transform scattered thoughts and emotions into structured insights using AI analysis. Users can:
- Rant freely without filter (cathartic processing)
- Get AI-powered emotional validation
- Receive personalized micro-actions
- Save reflections as journal entries
- Record voice input for hands-free entry

#### 2.1.2 Technical Implementation

**Components Involved:**
1. **BrainDump.jsx** (Orchestrator)
   - State: dumpMode ('dump' or 'journal'), dumpText, loading, result
   - Handles the analysis pipeline:
     ```
     User Input → Claude Summary → Hume Emotion Detection → 
     Top Emotions Extract → Coaching Response → Display Results
     ```

2. **DumpModeSelector.jsx**
   - Two buttons: "Pour Your Heart Out" (dump mode) and "Today's Reflection" (journal mode)
   - Changes UI hints and labeling based on mode
   - Purely presentational

3. **DumpInput.jsx**
   - Textarea for text input
   - Speech-to-text button with:
     - Neon animation (cyan/magenta waves around cloud icon)
     - Real-time timer display
     - Error handling for microphone access
   - "Understand my feelings →" button triggers analysis
   - Integration with useAudioRecorder hook

4. **DumpResult.jsx**
   - Displays emotion analysis results
   - Shows Claude's acknowledgment and summary
   - Lists top 3 detected emotions with confidence percentages
   - Coaching card with:
     - Personalized emotional response
     - Micro-action (specific, actionable step)
     - Affirmation (supportive statement)
   - Text-to-speech button (🔊 Listen) to hear response
   - "Save to Journal" button for persistence

#### 2.1.3 API Pipeline

**Step 1: Claude Summary Generation**
```javascript
// Function: brainDumpSummarize(text)
// Input: User's brain dump text
// Output: { acknowledgment, summary, theme }

System Prompt: "You are a compassionate mental health assistant..."
- Validate the user's feelings
- Create 1-2 sentence summary
- Identify main theme/concern
```

**Step 2: Hume Emotion Detection**
```javascript
// Function: humeAnalyzeText(text)
// API: Hume AI Batch Processing
// Method: POST job submission → Poll for completion → Get predictions

Process:
1. Submit text to Hume batch API
2. Poll status endpoint every 1 second (max 30 seconds)
3. When status = "COMPLETED", fetch predictions
4. Extract emotion objects: { name, score (0-1) }
```

**Step 3: Extract Top Emotions**
```javascript
// Function: getTopEmotions(humePredictions, topN = 5)
// Logic:
- Parse Hume response structure
- Aggregate emotion scores across predictions
- Sort by score descending
- Return top N emotions

Output: [
  { name: 'anxiety', score: 0.92 },
  { name: 'sadness', score: 0.78 },
  ...
]
```

**Step 4: Emotion-Aware Coaching**
```javascript
// Function: getEmotionAwareResponse(text, topEmotions)
// Uses Claude to generate personalized response

Input to Claude:
- User's emotions (list of emotion names)
- Original text
- Context from analysis

Output JSON:
{
  "response": "2-3 sentence acknowledgment of emotions",
  "microAction": "1-2 sentence specific action",
  "affirmation": "1 sentence supportive statement"
}

Examples:
- Response: "I can sense your anxiety is quite high right now. It sounds like you're feeling overwhelmed by multiple demands simultaneously."
- MicroAction: "Try the 4-7-8 breathing technique: breathe in for 4 counts, hold for 7, exhale for 8."
- Affirmation: "You're taking a brave step by acknowledging these feelings."
```

#### 2.1.4 Speech-to-Text Integration (Deepgram)

**Component: useAudioRecorder Hook**
```javascript
// Custom hook managing microphone recording lifecycle

Methods:
- startRecording(): Requests mic access, initializes MediaRecorder
- stopRecording(): Returns Promise<Blob> with audio data

State:
- isRecording: boolean
- recordingTime: seconds elapsed
- formattedTime: "MM:SS" display format

Audio Format: Browser's native format (WebM/Opus on most browsers)
```

**DumpInput Integration:**
```javascript
Flow:
1. User clicks "🎙️ Speak" button
2. Cloud animation appears + red button + timer starts
3. Audio chunks collected via MediaRecorder
4. Click button again to stop
5. Audio blob sent to Deepgram via deepgramSpeechToText()
6. Transcribed text appended to textarea
7. User can then analyze the text normally
```

**Deepgram API Configuration:**
```javascript
// Function: deepgramSpeechToText(audioBlob)

Endpoint: https://api.deepgram.com/v1/listen

Parameters:
- model: nova-2 (latest/fastest)
- language: en
- encoding: auto-detected for compressed formats

Headers:
- Authorization: Token {DEEPGRAM_API_KEY}
- Content-Type: audioBlob.type (e.g., "audio/webm")

Response: { text, confidence, raw }
- text: Transcribed speech
- confidence: 0-1 accuracy score
- raw: Raw Deepgram response object
```

#### 2.1.5 Visual Design

**Neon Cloud Animation (Recording State)**
```
Display: Animated SVG with neon effects
- Center: White cloud shape
- Inner ring: Cyan circle expanding (1.5s cycle)
- Outer ring: Magenta circle expanding (2s cycle)

Animation Properties:
- cloudFloat: 0→-4px vertical movement + scale 1→1.1
- cloudPulse: Glow intensity pulsing
- cloudGlowEffect: Cyan + magenta neon drop-shadow

Effect: Looks like audio visualization/spectrum analyzer
```

**Emotion Color Mapping**
```javascript
// Function: emotionColor(emotionName)

Positive emotions → Green: joy, excitement, admiration, amusement, enthusiasm, etc.
Negative emotions → Red: anger, fear, sadness, disgust, distress, anxiety, etc.
Neutral emotions   → Accent color: surprise, anticipation, etc.

Applied to:
- Card borders
- Badge backgrounds
- Text accents
- Top emotion display
```

#### 2.1.6 Data Flow Diagram

```
User Types/Speaks
      ↓
[Optional: Speech-to-Text via Deepgram]
      ↓
User clicks "Understand my feelings →"
      ↓
Parallel API Calls:
├─→ Claude: brainDumpSummarize()
│   Output: { acknowledgment, summary, theme }
│
└─→ Hume: humeAnalyzeText()
    Output: Raw emotion predictions
    
↓ (Wait for both)

JavaScript Processing:
├─→ getTopEmotions() from Hume data
│   Output: [{ name, score }, ...]
│
└─→ emotionColor() for UI styling
    
↓

getEmotionAwareResponse(text, topEmotions)
Claude generates personalized response
Output: { response, microAction, affirmation }

↓

Display Results in DumpResult.jsx with:
- Emotion badges
- Claude's acknowledgment
- Top emotions list
- Coaching response
- TTS button (🔊 Listen)
- Save to Journal button
```

---

### Feature 2: JOURNAL (Fully Implemented)

#### 2.2.1 Purpose & Value
Persistent, emotional-aware journaling system that:
- Auto-generates meaningful titles from AI analysis
- Stores emotional context with entries
- Provides card-based grid view
- Modal-based editing and viewing
- Persistent storage (localStorage)

#### 2.2.2 Technical Implementation

**State in AppContext:**
```javascript
journalEntries: [
  {
    id: 1711646400000,                    // timestamp
    date: "Fri, Mar 28",                  // formatted date
    time: "01:55 AM",                     // formatted time
    title: "Finding Peace in Chaos",      // claude-generated
    text: "Full journal entry text...",
    emotions: [
      { name: 'anxiety', score: 0.92 },
      { name: 'calm', score: 0.45 },
      ...
    ],
    dominantEmotion: 'anxiety',           // top emotion
    intensity: 9,                         // 0-10 scale
    summary: "Core issue summary..."      // from brainDumpSummarize
  },
  ...
]

Storage: localStorage.setItem('ml_journal', JSON.stringify(journalEntries))
Limit: Max 50 entries (auto-trim oldest)
```

**Components:**

1. **Journal.jsx** (Grid View)
   - Displays all journal entries as cards
   - Grid layout: auto-fill, minmax(300px, 1fr)
   - Empty state: Shows icon + hint to create entries
   - Click card → Opens JournalModal

2. **JournalCard.jsx** (Sub-component)
   - Card structure:
     ```
     ┌─────────────────────┐
     │ Date    │ [Time]    │
     │ Title (Generated)   │ ← Auto-generated by Claude
     │ Emotion (Bold)      │
     │ [3 lines of text]   │
     │ Click to view & edit│
     └─────────────────────┘
     ```
   - Border color matches emotion color
   - Hover: translateY(-4px) + shadow glow
   - Click opens details in modal

3. **JournalModal.jsx** (Detail View)
   - Full-screen modal with backdrop
   - Header shows:
     - Date, time
     - Auto-generated title (large, bold)
     - Dominant emotion
   - Body: Editable textarea + buttons
   - Footer: Delete, Save, Close buttons
   - Supports edit mode toggle
   - Delete with confirmation

#### 2.2.3 Auto-Generated Titles

**Function: generateJournalHeading(summary, dominantEmotion)**

```javascript
System Prompt to Claude:
"You are a creative writer. Given a journal summary and emotion,
create a short, evocative heading (3-6 words max).

The heading should be:
- Poetic and meaningful
- Reflect emotion and theme
- Title case
- No punctuation

Examples:
- Finding Peace in Chaos
- When Anxiety Met Courage
- Letting Go of Control
- A Moment of Clarity"

Input: summary text + emotion name
Output: String (single heading)

Error Handling:
- If generation fails, entry saves without title
- Frontend displays title only if exists
```

#### 2.2.4 Journal Entry Flow

```
From Brain Dump:
1. User analyzes text → Gets emotion analysis
2. Clicks "📔 Save to Journal"
3. System captures:
   - Original text (textarea content)
   - Top emotions array
   - Dominant emotion (first in array)
   - Claude summary
   - Intensity (score × 10, 0-10 scale)
   
4. generateJournalHeading() called asynchronously
   - createsjournalEntry() is now async
   - Waits for title generation
   
5. Entry object created with auto-generated title

6. Entry added to journalEntries state

7. State persisted to localStorage

8. UI updates → Card appears in Journal screen
```

#### 2.2.5 Emotion Color System

Same emotionColor() function used throughout:
- Card border & background tint
- Title color
- Badge color for emotion pill
- Modal header background

---

### Feature 3: SPEECH-TO-TEXT (Fully Implemented)

#### 2.3.1 Purpose & Value
Enable hands-free journaling and faster thought capture using voice input.

#### 2.3.2 Technical Implementation

**Custom Hook: useAudioRecorder**

```javascript
State:
- isRecording: boolean (controls button state)
- recordingTime: number (seconds)
- mediaRecorderRef: Reference to MediaRecorder
- audioChunksRef: Array of audio chunks
- streamRef: MediaStream reference
- timerRef: Interval ID for timer

Methods:

startRecording():
├─ Request microphone: navigator.mediaDevices.getUserMedia({ audio: true })
├─ Create MediaRecorder instance
├─ Set ondataavailable handler (collects chunks)
├─ Start recording
├─ Start timer interval (increment every 1s)
└─ Set isRecording = true

stopRecording():
├─ Return Promise
├─ On mediaRecorder.onstop:
│  ├─ Create Blob from audio chunks
│  ├─ Get correct MIME type from mediaRecorder
│  ├─ Stop all microphone tracks
│  ├─ Clear timer
│  ├─ Set isRecording = false
│  └─ Resolve (audioBlob)
└─ Handle errors (camera permissions, etc.)

formatTime():
└─ Convert seconds → "MM:SS" format (e.g., "00:05")
```

**Integration: DumpInput.jsx**

```
UI Layer:
┌─────────────────────────────────────────────┐
│ [Analyze Button]  [Speak Button]            │
│                                             │
│ IDE States:                                 │
│ - Default: "🎙️ Speak"                      │
│ - Recording: Cloud animation + timer       │
│ - Processing: "🔄 Processing..."           │
└─────────────────────────────────────────────┘

Handler: handleStartRecording()
└─ await useAudioRecorder.startRecording()
└─ Show animation + Start timer

Handler: handleStopRecording()
├─ setIsTranscribing = true
├─ await useAudioRecorder.stopRecording()
├─ Validate audio blob (size > 0)
├─ Call deepgramSpeechToText(audioBlob)
├─ Append transcribed text to textarea
└─ setIsTranscribing = false
```

**Deepgram Speech-to-Text API**

```javascript
Endpoint: https://api.deepgram.com/v1/listen

Method: POST
Headers:
  Authorization: Token {DEEPGRAM_API_KEY}
  Content-Type: {audioBlob.type} (auto-detected)

Body: Raw audio blob (NOT FormData)

URL Parameters:
  model=nova-2          (Latest, fastest model)
  language=en           (English preferred)
  encoding=auto         (For compressed formats)
  sample_rate=auto      (Auto-detected)

Response JSON:
{
  "results": {
    "channels": [
      {
        "alternatives": [
          {
            "transcript": "spoken text here",
            "confidence": 0.95
          }
        ]
      }
    ]
  }
}

Error Handling:
- 400: Corrupt/unsupported audio → "Please try again"
- 401: Invalid API key → Stops with error
- Network errors → User-friendly messages
```

#### 2.3.3 Visual Feedback

**Recording State UI:**
```
Normal: "🎙️ Speak"
        (Green button, Interactive)

Recording: [Neon Cloud Animation] 00:12
          (Red button, Can click to stop)
          
          Animation:
          - Cyan circle pulsing outward
          - Magenta circle pulsing outward
          - White cloud in center glowing
          - Looks like audio spectrum analyzer

Processing: "🔄 Processing..."
           (Button disabled, Loading state)

Result: Text appended to textarea
        "Neon cloud animation" + "00:12" replaced by input text
```

---

### Feature 4: TEXT-TO-SPEECH (Fully Implemented)

#### 2.4.1 Purpose & Value
Allow users to listen to AI coaching responses for auditory learning and accessibility.

#### 2.4.2 Technical Implementation

**Custom Hook: useAudioPlayer**

```javascript
State:
- isPlaying: boolean
- duration: number (in seconds)
- currentTime: number
- audioRef: Reference to Audio element

Methods:

play(audioUrl):
├─ Create/reuse Audio element
├─ Set src = audioUrl
├─ Call .play() method
├─ setIsPlaying = true
└─ Handle load events (duration)

pause():
├─ audioRef.current.pause()
└─ setIsPlaying = false

stop():
├─ audioRef.current.pause()
├─ audioRef.current.currentTime = 0
└─ setIsPlaying = false

togglePlayPause(audioUrl):
├─ If isPlaying: pause()
└─ Else: play(audioUrl)

seek(time):
├─ audioRef.current.currentTime = time
└─ Update UI

Event Handlers:
- loadedmetadata: Update duration
- timeupdate: Update currentTime
- play: Set isPlaying = true
- pause: Set isPlaying = false
- ended: Reset currentTime
- error: Handle playback errors
```

**Integration: DumpResult.jsx**

```
UI:
┌──────────────────────────────────────┐
│ Our Response    [🔊 Listen] Button   │ ← TTS trigger
│                                      │
│ Main coaching response text...       │
│ Micro-action...                      │
│ "Affirmation..."                     │
└──────────────────────────────────────┘

Button States:
- Default: "🔊 Listen" (Green/accent color)
- Playing: "⏸️ Pause" (Red color)
- Loading: "🔊 Loading..." (Disabled, opacity 0.6)

Handler: handlePlayText()
├─ If ttsAudioUrl exists:
│  └─ togglePlayPause(ttsAudioUrl)
├─ Else:
│  ├─ setTtsLoading = true
│  ├─ Combine text: response.response + response.affirmation
│  ├─ Call deepgramTextToSpeech(textToSpeak)
│  ├─ Get audioUrl from response
│  ├─ setTtsAudioUrl = audioUrl
│  ├─ Call play(audioUrl)
│  └─ setTtsLoading = false
└─ Handle errors with user messages
```

**Deepgram Text-to-Speech API**

```javascript
Endpoint: https://api.deepgram.com/v1/speak

Method: POST
Headers:
  Authorization: Token {DEEPGRAM_API_KEY}
  Content-Type: application/json

Body JSON:
{
  "text": "Full coaching response text to speak"
}

URL Parameters:
  (None required - uses defaults)

Response:
- Content-Type: audio/mpeg (MP3 audio)
- Body: Binary audio data (Blob)

Usage:
1. Generate audio blob
2. Create object URL: URL.createObjectURL(audioBlob)
3. Pass to useAudioPlayer.play(audioUrl)
4. Play in native <audio> element

Error Handling:
- 400: Bad request → "Audio format not supported"
- 401: Invalid API key
- Network errors → Graceful fallback
```

#### 2.4.3 Flow Diagram

```
User Views Brain Dump Result
        ↓
Clicks "🔊 Listen" Button
        ↓
First Time:
├─ deepgramTextToSpeech() called
├─ Audio blob generated + stored (audioUrl)
├─ useAudioPlayer.play(audioUrl)
├─ Button changes to "⏸️ Pause"
└─ Audio plays in background

Re-click:
├─ If playing: pause()
│  └─ Button → "🔊 Listen"
└─ If paused: play()
   └─ Button → "⏸️ Pause"
```

---

### Feature 5: MICRO-HABITS (Skeleton - Data Defined, UI Pending)

#### 2.5.1 Purpose & Value
AI-generated personalized coping strategies based on:
- Detected emotions
- Current mood context
- User's past effectiveness
- Evidence-based interventions

#### 2.5.2 Data Structure

**Location: constants.js**

```javascript
HABITS_DATA = {
  anxiety: [
    {
      name: "Box Breathing",
      description: "4-4-4-4 breathing pattern",
      duration: "2 min",
      difficulty: 1,
      steps: ["Breathe in for 4 counts", ...]
    },
    {
      name: "Progressive Muscle Relaxation",
      description: "Tense and release muscle groups",
      duration: "5 min",
      difficulty: 2,
      steps: [...]
    },
    ...
  ],
  
  sadness: [
    {
      name: "Movement Therapy",
      description: "Light walk or stretching",
      duration: "10 min",
      difficulty: 1,
      steps: [...]
    },
    ...
  ],
  
  // ... more emotions
}
```

#### 2.5.3 Planned Implementation

**Component: Habits.jsx** (Skeleton exists)

```
Flow:
1. Get user's current emotion from context
2. Fetch habits for that emotion
3. Display 3-5 recommended habits
4. User selects habit
5. Step-by-step guided walkthrough
6. Progress tracking
7. Feedback: "How did this help?" (1-5 scale)

UI:
┌─────────────────────────────────┐
│ Suggested for: Anxiety          │
│                                 │
│ [Habit Card 1]  Score: 4.5/5   │
│ [Habit Card 2]  Score: 4.2/5   │
│ [Habit Card 3]  Score: 3.8/5   │
│                                 │
│ Click to start guided practice  │
└─────────────────────────────────┘
```

---

### Feature 6: MOOD TRACKER (Skeleton - Data Structure Ready)

#### 2.6.1 Purpose & Value
Visual tracking of mood trends over 7-30 days for:
- Pattern recognition
- Identifying triggers
- Celebrating progress
- Motivating consistency

#### 2.6.2 Data Structure

**State in AppContext:**
```javascript
moodLog: [
  {
    date: "2025-03-28",
    time: 1711646400000,
    mood: "anxious",
    score: 7/10
  },
  ...
]

Storage: localStorage.setItem('ml_moodlog', JSON.stringify(moodLog))
Limit: Max 30 entries (auto-trim)
```

**Update Flow:**
```
User selects mood from Dashboard MoodPills
        ↓
logMood(mood, score) called
        ↓
Entry added to moodLog
        ↓
Persisted to localStorage
```

#### 2.6.3 Planned Visualization

```
Component: Tracker.jsx

Chart Types:
1. Line Chart: Score over time (7-day moving average)
2. Bar Chart: Mood frequency (count of each mood)
3. Heatmap: Mood by day of week
4. Trend Analysis: Is mood improving?

Library: Chart.js or D3.js (TBD)

Display Options:
- Weekly view
- Monthly view
- 30-day view
- Custom date range
```

---

### Feature 7: AI COACH CHAT (Skeleton - Infrastructure Ready)

#### 2.7.1 Purpose & Value
Ongoing conversation with AI for:
- Real-time mental health coaching
- Deeper exploration of issues
- Personalized advice
- Mood-aware responses

#### 2.7.2 Data Structure

**State in AppContext:**
```javascript
chatHistory: [
  {
    role: 'user',
    content: 'I am feeling anxious about...'
  },
  {
    role: 'assistant',
    content: 'I understand. Let\'s talk about...'
  },
  ...
]
```

#### 2.7.3 Planned Implementation

**Component: Chat.jsx**

```
UI:
┌────────────────────────────────┐
│ AI Coach Chat                  │
├────────────────────────────────┤
│ [Chat messages]                │
│                                │
│ Assistant: How are you doing?  │
│                                │
│ User: I'm feeling tired...     │
│                                │
│ Assistant: That sounds...      │
├────────────────────────────────┤
│ [Text input] [Send Button]     │
│                                │
│ Happiness Meter: ████░ 7/10    │
└────────────────────────────────┘
```

**Flow:**
1. User types message
2. Send to Claude with system prompt + context
3. Claude responds with empathetic, personalized message
4. Add to chatHistory
5. Update happiness score based on sentiment
6. Persist conversation

---

### Feature 8: THOUGHT REFRAME (Skeleton - CBT Framework Ready)

#### 2.8.1 Purpose & Value
Cognitive Behavioral Therapy (CBT) exercises for:
- Identifying cognitive distortions
- Reframing negative thoughts
- Building resilience
- Evidence-based mental health

#### 2.8.2 Framework

```
CBT Distortion Types:
- Catastrophizing: "This will be a disaster"
- All-or-nothing thinking: "If I fail once, I'm a failure"
- Overgeneralization: "This always happens to me"
- Mind reading: "People think I'm stupid"
- Fortune telling: "Bad things will happen"

Reframe Process:
1. User inputs negative thought
2. Identify distortion type (Claude)
3. Validate the feeling
4. Present evidence against thought
5. Generate reframed thought
6. Affirmation and next steps
```

**Component: Reframe.jsx**

```
UI:
┌────────────────────────────────┐
│ Reframe Your Thoughts          │
├────────────────────────────────┤
│ Negative thought:              │
│ [Text input]                   │
│                                │
│ [Analyze Button]               │
├────────────────────────────────┤
│ Distortion: Catastrophizing    │
│                                │
│ Evidence against:              │
│ - Similar situations worked... │
│ - You've handled worse...      │
│                                │
│ Reframed thought:              │
│ "While challenging, I can..."  │
└────────────────────────────────┘
```

---

### Feature 9: CRISIS SUPPORT (Partially Implemented)

#### 2.9.1 Purpose & Value
Immediate emotional support and hotline resources for:
- Crisis situations
- Suicidal ideation
- Self-harm concerns
- Severe mental health emergencies

#### 2.9.2 Technical Implementation

**Crisis Detection: constants.js**

```javascript
CRISIS_KEYWORDS = [
  'suicide', 'kill myself', 'harm myself', 'self harm',
  'overdose', 'cut myself', 'die', 'death',
  // ... more patterns
]

Function: checkCrisis(text)
├─ Convert to lowercase
├─ Check for crisis keywords
├─ Pattern matching
└─ Return: boolean (isCrisis)
```

**Component: CrisisOverlay.jsx**

```
Display: Full-screen modal overlay

Content:
┌──────────────────────────────────┐
│ 🆘 We Care About You             │
│                                  │
│ If you're in crisis, reach out:  │
│                                  │
│ 988 Suicide & Crisis Lifeline    │
│ Call/Text: 988                   │
│                                  │
│ International Association...     │
│                                  │
│ [Emergency Services: 911]        │
│                                  │
│ Grounding Exercises:             │
│ - 5-4-3-2-1 technique           │
│ - Cold water on face            │
│ - Ice on wrists                 │
│                                  │
│ [Talk to AI Coach] [Close]       │
└──────────────────────────────────┘
```

**Trigger Flow:**
```
User analyzes Brain Dump text
        ↓
checkCrisis(dumpText) called
        ↓
If crisis keywords detected:
├─ App.jsx sets showCrisis = true
├─ CrisisOverlay displays
├─ User has options:
│  ├─ Call 988 (link to phone)
│  ├─ View grounding exercises
│  │  └─ Step-by-step guidance
│  └─ Talk to AI Coach
├─ User must acknowledge before leaving
└─ Overlay closeable by button
```

---

## 3. GLOBAL STATE MANAGEMENT (AppContext.jsx)

### 3.1 State Variables

```javascript
// Mood & Journal
const [moodLog, setMoodLog]           // Array of mood entries
const [journalEntries, setJournalEntries]  // Array of journal entries

// Streak Tracking
const [streakDays, setStreakDays]          // Current streak count
const [lastVisit, setLastVisit]            // Last visit date

// Chat & Habits
const [chatHistory, setChatHistory]        // Conversation log
const [userHappinessScores, setUserHappinessScores]  // Scores array
const [currentMoodContext, setCurrentMoodContext]    // Current mood

// UI Navigation
const [activeScreen, setActiveScreen]      // Current page
const [reframeThought, setReframeThought]  // Reframe input
```

### 3.2 Key Functions

**logMood(mood, score)**
```javascript
Purpose: Log user's current mood
Input: mood string, score 0-10
Output: Updates moodLog state

Logic:
- Create entry with timestamp
- Add to moodLog array
- Remove older entries if > 30
- Persist to localStorage
- Update streak if new day
```

**addJournalEntry(text, claudeData, humePredictions)**
```javascript
Purpose: Save analyzed brain dump as journal entry
Input: 
  - text: Original brain dump text
  - claudeData: { emotions, dominantEmotion, summary, intensity }
  - humePredictions: Raw Hume API response (unused for storage)
Output: Updates journalEntries state

Logic:
- Call generateJournalHeading(summary, dominantEmotion) - ASYNC
- Create entry object with title, emotions, metadata
- Add to journalEntries array
- Remove oldest if > 50 entries
- Persist to localStorage
```

**updateJournalEntry(entryId, updates)**
```javascript
Purpose: Modify existing journal entry
Input: Entry ID, updates object
Output: Updates specific entry in state

Example Updates:
- { text: "New text..." }
- { title: "New title..." }
- { emotions: [...new emotions] }
```

**deleteJournalEntry(entryId)**
```javascript
Purpose: Remove journal entry
Input: Entry ID
Output: Removes from state and localStorage
```

**addHappinessScore(score)**
```javascript
Purpose: Track user's happiness metric
Input: Score 0-10
Output: Adds to happiness array for trend analysis
```

### 3.3 useEffect Hooks

**Streak Initialization:**
```javascript
// On component mount
- Check if lastVisit is today
- If not:
  - Check if yesterday
  - If yes: increment streak
  - If no: reset streak to 1
  - Update lastVisit to today
  - Persist to localStorage
```

**Persistence Hooks:**
```javascript
// For moodLog
useEffect(() => {
  localStorage.setItem('ml_moodlog', JSON.stringify(moodLog))
}, [moodLog])

// For journalEntries
useEffect(() => {
  localStorage.setItem('ml_journal', JSON.stringify(journalEntries))
}, [journalEntries])

// For streak
useEffect(() => {
  localStorage.setItem('ml_streak', streakDays)
}, [streakDays])
```

---

## 4. API INTEGRATIONS

### 4.1 Anthropic Claude

**Endpoint:** `https://api.anthropic.com/v1/messages`
**Model:** claude-opus-4-6 (Latest, most capable)
**Max Tokens:** 1000 per request

**Authentication:**
```
Header: x-api-key: {VITE_ANTHROPIC_API_KEY}
Header: anthropic-version: 2023-06-01
Header: anthropic-dangerous-direct-browser-access: true
```

**Use Cases:**
1. Brain dump summarization
2. Emotion-aware coaching responses
3. Journal title generation
4. Thought reframing
5. Chat responses
6. Habit personalization

**Example Request:**
```json
{
  "model": "claude-opus-4-6",
  "max_tokens": 1000,
  "system": "You are a compassionate mental health assistant...",
  "messages": [
    {
      "role": "user",
      "content": "I am feeling anxious about my job interview..."
    }
  ]
}
```

### 4.2 Hume AI

**Endpoint:** `https://api.hume.ai/v0/batch/jobs`
**Authentication:** Header: X-Hume-Api-Key: {VITE_HUME_API_KEY}

**Process:**
1. Submit text for analysis (POST /batch/jobs)
2. Poll status (GET /batch/jobs/{job_id})
3. Retrieve predictions (GET /batch/jobs/{job_id}/predictions)

**Response Structure:**
```
Predictions → Results → Predictions → Models → Language → 
  Grouped Predictions → Predictions → Emotions

Final emotion array:
[
  { name: "anxiety", score: 0.92 },
  { name: "sadness", score: 0.78 },
  ...
]
```

**Raw Emotions Supported:**
- Positive: joy, excitment, admiration, amusement, triumph, relief, love
- Negative: anger, fear, sadness, disgust, shame, guilt, anxiety
- Neutral: anticipation, surprise, interest, confusion

---

### 4.3 Deepgram

#### Speech-to-Text
**Endpoint:** `https://api.deepgram.com/v1/listen`
**Model:** nova-2 (Latest, fastest)
**Format:** Audio blob (WebM, WAV, MP3, etc.)

#### Text-to-Speech
**Endpoint:** `https://api.deepgram.com/v1/speak`
**Model:** Default (Neural voices available)
**Format:** Returns MP3 audio blob

---

## 5. STYLING & DESIGN SYSTEM

### 5.1 CSS Variables (index.css)

```css
/* Colors */
--bg1: Dark background (main)
--bg2: Secondary background
--bg3: Tertiary background
--text: Primary text
--text2: Secondary text
--text3: Tertiary text
--red: Negative emotions (danger, warning)
--green: Positive emotions (success, calm)
--accent: Primary accent color
--radius: Border radius (rounded corners)
--radius-sm: Small border radius

/* Usage in Components */
background: var(--bg2);
color: var(--text);
border-radius: var(--radius);
```

### 5.2 Design Patterns

**Card Design:**
- Rounded borders
- Subtle shadow on hover
- Color-coded by emotion
- Smooth transitions

**Button Designs:**
- Primary: Accent color, hover glow
- Secondary: Outline style
- Disabled: Reduced opacity
- Loading: Animation or spinner

**Responsive Layout:**
- Mobile-first approach
- Flex containers for alignment
- Grid for multi-item layouts
- Media queries for breakpoints

---

## 6. ENVIRONMENT CONFIGURATION

### 6.1 .env File (Required)

```
# Anthropic Claude API
VITE_ANTHROPIC_API_KEY=sk-ant-api03-...

# Hume AI Emotion Detection
VITE_HUME_API_KEY=baIloAZwvvEk8lyvCu2KbkO3migOpgGHLgkdDSWnE...

# Deepgram Speech & Audio
VITE_DEEPGRAM_API_KEY=9176b53591bb8c4cecd499e7e2589f16b353c30e

# Environment
VITE_ENV=development
```

### 6.2 Getting API Keys

1. **Claude:** https://console.anthropic.com/account/keys
2. **Hume AI:** https://www.hume.ai/
3. **Deepgram:** https://console.deepgram.com/

---

## 7. RUNTIME FLOW & KEY WORKFLOWS

### 7.1 Complete Brain Dump Flow

```
START: User on Dashboard
  ↓
  Click "Brain Dump" tab
  ↓
  BrainDump.jsx mounted
  ├─ State: dumpMode = 'dump'
  ├─ State: dumpText = ''
  └─ State: result = null

User Optionally Speaks:
  ├─ Click "🎙️ Speak"
  ├─ useAudioRecorder.startRecording()
  ├─ Cloud animation displays + Timer
  ├─ [Recording audio samples]
  ├─ Click again to stop
  ├─ useAudioRecorder.stopRecording()
  ├─ Audio blob generated
  ├─ deepgramSpeechToText(audioBlob)
  ├─ Transcribed text added to textarea
  └─ User can edit text

User Types or Edits Text:
  ├─ onChange updates dumpText state
  └─ "Understand my feelings →" enabled if text > 0

User Clicks "Understand my feelings →":
  ├─ setLoading = true
  ├─ PARALLEL REQUESTS:
  │  ├─ brainDumpSummarize(dumpText)
  │  │  └─ Returns: { acknowledgment, summary, theme }
  │  │
  │  └─ humeAnalyzeText(dumpText)
  │     └─ Returns: Raw emotion predictions
  │
  ├─ PROCESSING:
  │  ├─ topEmotions = getTopEmotions(humeData)
  │  └─ coachResponse = getEmotionAwareResponse(text, topEmotions)
  │     └─ Returns: { response, microAction, affirmation }
  │
  └─ setResult({ claudeSummary, humeData, topEmotions, coachResponse })
     setLoading = false

DumpResult renders analysis:
  ├─ Emotion badges (top 3)
  ├─ "What We Heard" section
  ├─ Coaching response + micro-action + affirmation
  ├─ "🔊 Listen" button for TTS
  └─ "📔 Save to Journal" button

User Clicks "📔 Save to Journal":
  ├─ handleSaveToJournal() called
  ├─ Create claudeData object
  ├─ Call addJournalEntry(text, claudeData, humeData) [ASYNC]
  ├─ generateJournalHeading(summary, emotion) called
  ├─ Claude creates poetic title
  ├─ Entry saved with auto-generated title
  ├─ journalEntries state updated
  ├─ localStorage persisted
  ├─ Button shows "✓ Saved to Journal"
  └─ User can view in Journal tab

User Clicks "🔊 Listen":
  ├─ handlePlayText()
  ├─ If first time:
  │  ├─ deepgramTextToSpeech(response text) [ASYNC]
  │  ├─ Audio blob generated
  │  ├─ URL created: URL.createObjectURL(audioBlob)
  │  └─ Stored in ttsAudioUrl state
  │
  ├─ useAudioPlayer.play(audioUrl)
  ├─ Audio plays in background
  ├─ Button changes to "⏸️ Pause"
  └─ User can pause/resume

END

```

### 7.2 Journal Entry Lifetime

```
Entry Created via Brain Dump:
  └─ generateJournalHeading() generates title
  └─ Stored in journalEntries state

View in Journal Tab:
  ├─ Journal.jsx displays grid
  ├─ JournalCard shows title, emotion, preview
  └─ Click card → JournalModal opens

In Modal:
  ├─ Full text displayed
  ├─ Edit button toggles edit mode
  ├─ Save updates content
  ├─ Delete removes entry (with confirmation)
  └─ Close returns to grid

Entry Always Persisted:
  └─ localStorage.setItem('ml_journal', JSON.stringify(journalEntries))

On App Reload:
  ├─ AppContext loads from localStorage
  ├─ All entries restored
  └─ Grid shows all saved entries
```

---

## 8. ERROR HANDLING & EDGE CASES

### 8.1 API Errors

```javascript
Network Errors:
├─ Wrap in try-catch blocks
├─ Display user-friendly messages
└─ Suggest retry or alternative

Timeout Errors (Hume):
├─ Poll max 30 seconds
├─ If still pending: "Analysis taking longer..."
├─ Retry button
└─ Fallback to basic text analysis

Quota/Rate Limits:
├─ Cache responses when possible
├─ Implement retry with exponential backoff
└─ Show "Please try again later"

Invalid API Keys:
├─ 401 Unauthorized
├─ Log error: "Missing or invalid {API_NAME} credentials"
└─ Check .env configuration
```

### 8.2 Audio Errors

```javascript
Microphone Access Denied:
├─ User denies permission
├─ Show: "Microphone access required for speech recording"
└─ Fallback: Text input only

Audio Format Errors:
├─ Deepgram rejects audio
├─ Show: "Audio format not supported. Please try again."
└─ Validate: audioBlob.size > 0

BrowserCompatibilities:
├─ MediaRecorder API (all modern browsers)
├─ getUserMedia (all modern browsers except IE)
├─ Web Audio API (all modern browsers)
└─ LocalStorage (all browsers >= IE8
```

### 8.3 State Edge Cases

```javascript
Empty States:
├─ No journal entries: Show icon + hint
├─ No emotions detected: Default to 'neutral'
├─ No title generated: Display without title
└─ Empty mood log: Show "No data yet"

Boundary Conditions:
├─ Max journal entries: 50 (auto-trim oldest)
├─ Max mood log: 30 (auto-trim oldest)
├─ Max text length: No hardcoded limit (API dependent)
└─ Concurrent operations: Disable buttons during loading

Data Consistency:
├─ journalEntries always in sorted order (newest first)
├─ moodLog indexed by date for deduplication
├─ All timestamps in UTC
└─ Emotion scores always 0-1 range
```

---

## 9. DEPLOYMENT & OPTIMIZATION

### 9.1 Build & Deployment

```bash
# Development
npm run dev
# Runs Vite dev server on localhost:3000 with HMR

# Production Build
npm run build
# Outputs optimized bundle in dist/

# Preview Build
npm run preview
# Serves dist/ locally to test production build
```

### 9.2 Performance Optimizations

```javascript
Frontend Optimizations:
├─ React.memo() for pure components
├─ useCallback for stable function references
├─ Lazy loading (TBD)
└─ Code splitting for features

API Optimizations:
├─ Parallel requests where possible
├─ Cache non-sensitive API responses
├─ Batch operations (Hume supports batch)
└─ Minimize tokens sent to Claude

LocalStorage Optimization:
├─ Compress large entries if needed
├─ Periodic cleanup of old entries
├─ Index by date for faster queries
└─ Lazy load for better initial load
```

### 9.3 Production Checklist

- [ ] Remove console.log statements
- [ ] Validate all API keys in .env
- [ ] Test on multiple browsers
- [ ] Verify responsive design
- [ ] Test error states
- [ ] Monitor API usage/costs
- [ ] Set up error logging (Sentry, etc)
- [ ] Enable CORS if needed
- [ ] Minify CSS/JS
- [ ] Add service worker for offline support
- [ ] Security review
- [ ] Privacy policy for data handling

---

## 10. FUTURE ENHANCEMENT IDEAS

### 10.1 Planned Features (Mentioned in Code)

1. **Mood Patterns Visualization**
   - Weekly/monthly trends
   - Trigger identification
   - Predictive analytics

2. **Micro-Habits Completion**
   - Step-by-step guided exercises
   - Effectiveness rating
   - Habit completion streaks
   - Evidence-based interventions

3. **AI Coach Chat Full Implementation**
   - Multi-turn conversations
   - Context awareness
   - Personalized advice
   - Happiness meter

4. **Thought Reframe CBT Framework**
   - Distortion identification
   - Evidence presentation
   - Reframing exercises
   - Progress tracking

### 10.2 Possible Enhancements

- [ ] User authentication (Firebase, Supabase)
- [ ] Cloud synchronization
- [ ] Mobile app (React Native)
- [ ] Wearable integration (heart rate, sleep)
- [ ] Therapist notes sharing (with permissions)
- [ ] Group support features
- [ ] Video/voice sessions with counselors
- [ ] Medication tracking
- [ ] Sleep tracking integration
- [ ] Export journal to PDF
- [ ] Dark mode toggle
- [ ] Multi-language support
- [ ] Accessibility improvements (WCAG AA)
- [ ] Offline support (Service Worker)

---

## 11. TESTING CHECKLIST

### 11.1 Unit Tests (TBD)

- [ ] API functions error handling
- [ ] emotionColor() mapping
- [ ] getTopEmotions() extraction
- [ ] checkCrisis() detection
- [ ] Formatting utilities

### 11.2 Integration Tests (TBD)

- [ ] Brain Dump → Journal flow
- [ ] Speech-to-text → Text processing
- [ ] API error recovery
- [ ] State persistence
- [ ] Navigation flow

### 11.3 E2E Tests (TBD)

- [ ] Complete user journey
- [ ] All API integrations
- [ ] Audio recording/playback
- [ ] Data persistence
- [ ] Crisis detection

### 11.4 Manual Testing

- [ ] Microphone permissions
- [ ] Large text input
- [ ] Network disconnection
- [ ] Long recording sessions
- [ ] Rapid button clicks
- [ ] Cross-browser compatibility
- [ ] Mobile responsiveness

---

## 12. SECURITY CONSIDERATIONS

### 12.1 API Key Management

```
❌ DO NOT:
- Commit .env to git
- Log API keys
- Expose keys in client-side console
- Use development keys in production

✅ DO:
- Use environment variables
- Rotate keys regularly
- Monitor API usage
- Use API key restrictions
- Implement rate limiting
```

### 12.2 Data Privacy

```
User Data Handling:
- Journal entries stored locally (not synced)
- Mood logs stored in localStorage
- Chat history in memory only
- No server-side persistence (unless added)

GDPR Compliance (if applicable):
- [ ] Privacy policy on website
- [ ] User consent for data processing
- [ ] Right to export data
- [ ] Right to deletion
- [ ] Data retention policies
```

### 12.3 Input Validation

```javascript
// Before sending to APIs
- Validate text not empty
- Trim whitespace
- No XSS injection
- Reasonable length limits
- Sanitize user input (DOMPurify if needed)
```

---

## CONCLUSION

MindLayer is a comprehensive mental health support application that demonstrates:

1. **Advanced AI Integration**: Seamless combination of Claude, Hume, and Deepgram APIs
2. **Modern React Patterns**: Hooks, Context, custom hooks for reusable logic
3. **Thoughtful UX**: Emotion-aware design, accessibility, error handling
4. **Feature-Rich**: Multiple Mental health tools in one cohesive platform
5. **Extensible Architecture**: Easy to add new features without breaking existing ones

The project prioritizes **compassion** in every interaction, using AI not to replace human judgment but to provide immediate, personalized support when it matters most.

---

**Document Version:** 1.0
**Last Updated:** March 28, 2026
**Status:** Complete Project Specification
