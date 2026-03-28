# MindLayer - AI-Powered Mental Health Support

A React-based mental health application featuring AI-powered mood tracking, journaling, habit personalization, and crisis support with real-time emotion analysis.

## 🌟 Features

- **Dashboard**: Home screen with mood quick-select, streak tracking, and feature overview
- **Brain Dump**: Organize thoughts into categories (worries, todos, emotions, patterns) or save as journal entries
- **Journal**: Daily journaling with emotional analysis and mood tracking
- **AI Coach Chat**: Real-time conversation with AI-powered mental health coach, happiness meter
- **Mood Tracker**: Visual charts and statistics of mood trends over time
- **Micro-Habits**: AI-generated personalized coping strategies based on current mood and context
- **Thought Reframe**: CBT-based cognitive reframing exercises
- **Crisis Support**: Emergency grounding exercises with crisis hotline resources

## 🛠️ Tech Stack

- **Frontend**: React 18 with Hooks and Context API
- **Build Tool**: Vite
- **State Management**: React Context API
- **APIs**: 
  - Anthropic Claude (text analysis, habit generation, coaching)
  - Hume AI (real-time emotion detection)
- **Styling**: CSS3 with CSS variables
- **Persistence**: localStorage

## 📅 Project Structure

```
mindlayer-react/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Dashboard/          # Home screen
│   │   │   ├── Dashboard.jsx
│   │   │   ├── MoodPills.jsx   # Quick mood selector
│   │   │   └── Streak.jsx      # Daily streak display
│   │   ├── BrainDump/          # Thought organization
│   │   │   ├── BrainDump.jsx
│   │   │   ├── DumpModeSelector.jsx
│   │   │   ├── DumpInput.jsx
│   │   │   └── DumpResult.jsx
│   │   ├── Journal/            # Journal feature (skeleton)
│   │   ├── Chat/               # AI coach (skeleton)
│   │   ├── Tracker/            # Mood visualization (skeleton)
│   │   ├── Habits/             # Micro-habits (skeleton)
│   │   ├── Reframe/            # CBT exercises (skeleton)
│   │   ├── Crisis/             # Emergency support
│   │   │   └── CrisisOverlay.jsx
│   │   └── Navigation/         # Main nav bar
│   │       └── Navigation.jsx
│   ├── context/
│   │   └── AppContext.jsx      # Global state management
│   ├── utils/
│   │   ├── api.js              # API integration layer
│   │   ├── constants.js        # App-wide constants
│   │   └── helpers.js          # Utility functions
│   ├── styles/
│   │   └── index.css           # Global styling
│   ├── App.jsx                 # Main app component
│   └── index.js                # React entry point
├── package.json
├── vite.config.js
├── .env.example
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/mindlayer.git
   cd mindlayer-react
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your API keys:
   - `VITE_ANTHROPIC_API_KEY`: Get from https://console.anthropic.com
   - `VITE_HUME_API_KEY`: Get from https://hume.ai

4. **Start development server**
   ```bash
   npm run dev
   ```
   Opens automatically at `http://localhost:3000`

### Build for Production

```bash
npm run build
npm run preview  # Preview the production build
```

## 🧠 Core Components

### Global State (AppContext)

The app uses React Context API for state management. Key state includes:
- `moodLog`: Daily mood entries
- `journalEntries`: Saved journal entries with analysis
- `chatHistory`: Coach conversation history
- `userHappinessScores`: Emotion tracking scores
- `streakDays`: Current daily streak
- `activeScreen`: Current view (home, dump, journal, etc.)
- `reframeThought`: Thought being reframed

### API Integration

- **Claude API** (`/src/utils/api.js`):
  - Text analysis and summarization
  - Habit generation
  - Cognitive reframing challenges
  - Coach responses

- **Hume API** (`/src/utils/api.js`):
  - Real-time emotion detection
  - Sentiment analysis
  - Happiness score calculation

### Constants & Helpers

- **constants.js**: Crisis keywords, color mappings, habit templates
- **helpers.js**: Sentiment scoring, happiness calculation, mood mapping

## 📲 Key Pages

### Dashboard
- Welcome message based on time of day
- Daily streak counter
- Quick mood selector (5 options)
- Feature cards linking to main features

### Brain Dump
- Two modes: Brain Dump (organize) or Journal Entry (analyze & save)
- Text input with AI analysis
- Claude organizes into categories or Hume analyzes emotions
- Results display with semantic information

### Crisis Support
- Triggered by crisis keywords
- 4-7-8 breathing exercise visualization
- Emergency hotline resources (988, Crisis Text Line)
- Grounding techniques

## 🔄 Data Flow

```
User Input → Component State → AppContext → localStorage
                   ↓           ↓
              Child Components  API Calls (Claude, Hume)
```

## 🎨 Styling

The app uses a dark theme with:
- **Primary Colors**: Purple/Indigo (`--accent`: #a78bfa)
- **Backgrounds**: Deep blue (`--bg1`: #0a0e27)
- **Text**: Light purple (`--text`: #e0e0ff)
- **Status Colors**: Red (#f87171), Green (#4ade80), Yellow (#fbbf24)

All colors are defined as CSS variables in `src/styles/index.css` for easy theming.

## 🛣️ Navigation Structure

The app has 7 main sections accessible from the left sidebar:
1. **Home** - Dashboard overview
2. **Brain Dump** - Thought organization
3. **Journal** - Daily journaling
4. **Coach** - AI conversation
5. **Tracker** - Mood visualization
6. **Habits** - Daily micro-habits
7. **Reframe** - Cognitive reframing

## 💾 Data Persistence

The app persists data to localStorage under the `ml_` prefix:
- `ml_moodlog`: Array of mood entries
- `ml_journalentries`: Array of journal entries
- `ml_streakdays`: Current streak count
- `ml_lastvisit`: Last visit timestamp
- `ml_chatwithcoach`: Chat history
- `ml_happinessscores`: Emotion analysis scores

## 🐛 Debugging

To enable console logging for state changes:
1. Open DevTools (F12)
2. Check React DevTools tab for Context API state
3. Inspect localStorage to verify data persistence

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_ANTHROPIC_API_KEY` | Claude API key | Yes |
| `VITE_HUME_API_KEY` | Hume AI API key | Yes |
| `VITE_ENV` | Environment (development/production) | No |

## 🤝 Contributing

1. Create a feature branch (`git checkout -b feature/AmazingFeature`)
2. Commit your changes (`git commit -m 'Add AmazingFeature'`)
3. Push to the branch (`git push origin feature/AmazingFeature`)
4. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Anthropic for Claude AI API
- Hume AI for emotion detection technology
- React community for excellent documentation

## 📞 Support

For issues, questions, or suggestions:
1. Open an issue on GitHub
2. Start a discussion in the Discussions tab
3. Contact us at support@mindlayer.app

---

**Status**: ✅ React architecture complete. Foundation ready. Skeleton components ready for feature implementation.

**Next Steps**: 
1. Complete Chat.jsx with message history and happiness meter
2. Build Tracker with mood visualization
3. Implement Habits with personalization
4. Add Reframe CBT workflow
5. Expand Journal feature
