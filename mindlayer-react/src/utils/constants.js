export const CRISIS_KEYWORDS = [
  "suicide",
  "kill myself",
  "end it all",
  "want to die",
  "no reason to live",
  "hurt myself",
  "self harm",
  "can't go on",
  "hopeless",
  "worthless",
  "disappear forever",
];

export const COLOR_MAP = {
  red: { bg: "rgba(248,113,113,0.15)", color: "#f87171" },
  amber: { bg: "rgba(251,191,36,0.15)", color: "#fbbf24" },
  green: { bg: "rgba(74,222,128,0.15)", color: "#4ade80" },
  teal: { bg: "rgba(45,212,191,0.15)", color: "#2dd4bf" },
  purple: { bg: "rgba(167,139,250,0.15)", color: "#a78bfa" },
};

export const HABITS_DATA = {
  anxious: [
    {
      name: "Box breathing — 4 rounds",
      why: "Activates your parasympathetic nervous system in under 2 minutes",
    },
    {
      name: "Write 3 things within your control",
      why: "Redirects focus from uncertainty to agency",
    },
    {
      name: "Cold water on your face or wrists",
      why: "Triggers the dive reflex, slowing your heart rate quickly",
    },
  ],
  sad: [
    {
      name: "Text one person you care about",
      why: "Social connection is one of the strongest mood lifters",
    },
    {
      name: "Step outside for 5 minutes",
      why: "Natural light and movement shift brain chemistry",
    },
    {
      name: "Write 2 lines about something small you appreciate",
      why: "Gratitude rewires the brain over time, even in small doses",
    },
  ],
  angry: [
    {
      name: "Vigorous physical movement for 3 minutes",
      why: "Burns off cortisol and adrenaline that fuel anger",
    },
    {
      name: "Write an unsent letter to whoever/whatever you are angry at",
      why: "Externalizing the feeling reduces its grip on you",
    },
    {
      name: "Delay any response by 10 minutes",
      why: "The anger spike in your brain literally fades in 6–10 minutes",
    },
  ],
  tired: [
    {
      name: "10-minute non-phone rest (eyes closed)",
      why: "Even non-sleep rest restores cognitive function",
    },
    {
      name: "Drink a full glass of water",
      why: "Even mild dehydration causes fatigue and brain fog",
    },
    {
      name: "Do the one smallest task on your list",
      why: "Starting creates momentum; completion gives dopamine",
    },
  ],
  numb: [
    {
      name: "Hold something textured — notice 5 sensations",
      why: "Grounds you back into your body through sensory input",
    },
    {
      name: "Listen to a song that usually moves you",
      why: "Music bypasses the logical brain to access emotion",
    },
    {
      name: "Write: what would I feel right now if I let myself?",
      why: "Numbness often masks something underneath — this opens the door gently",
    },
  ],
  okay: [
    {
      name: "Use this window to do one thing you've been avoiding",
      why: "Stability is the best time for progress — not crisis",
    },
    {
      name: "Journal 3 things that went well today",
      why: "Reinforces positive neural pathways when you're receptive",
    },
    {
      name: "Plan one thing to look forward to this week",
      why: "Anticipation generates as much wellbeing as the event itself",
    },
  ],
};

export const checkCrisis = (text) => {
  const lower = text.toLowerCase();
  return CRISIS_KEYWORDS.some((kw) => lower.includes(kw));
};

// Emotion Category Mapping: Hume emotions → 5 main categories
export const EMOTION_CATEGORY_MAP = {
  stressed: {
    label: "Stressed",
    color: "red",
    emoji: "😰",
    humeEmotions: [
      "anxiety",
      "worry",
      "tension",
      "distress",
      "panic",
      "nervous",
    ],
    response: `I can feel the weight of what you're carrying. Stress is your system saying "this matters to me." Let's break it down into smaller pieces you can handle right now.`,
  },
  overwhelmed: {
    label: "Overwhelmed",
    color: "amber",
    emoji: "😵",
    humeEmotions: ["overwhelm", "overload", "confusion", "chaos", "flooded"],
    response: `That's a lot on your plate. When everything feels like too much, it's actually a sign you need to simplify, not push harder. Let's identify what truly needs your attention right now.`,
  },
  neutral: {
    label: "Neutral",
    color: "purple",
    emoji: "😐",
    humeEmotions: ["neutral", "indifferent", "detached", "apathy", "bored"],
    response: `You're in neutral territory — neither down nor up. This is actually a stable place. What's one thing that used to bring you energy that you could reconnect with?`,
  },
  calm: {
    label: "Calm",
    color: "teal",
    emoji: "😌",
    humeEmotions: [
      "calm",
      "peaceful",
      "relaxed",
      "tranquil",
      "composed",
      "serene",
      "content",
    ],
    response: `You're in a good headspace. This is your moment to plan, reflect, and strengthen yourself. What's something you want to protect or build that you have the clarity to do right now?`,
  },
  energized: {
    label: "Energized",
    color: "green",
    emoji: "😄",
    humeEmotions: [
      "joy",
      "excited",
      "happy",
      "energetic",
      "enthusiastic",
      "triumph",
      "pride",
      "hopeful",
      "inspired",
      "grateful",
    ],
    response: `You're flying right now. Channel this energy into something meaningful — not just productivity, but moving toward what matters to you. What's one big thing you want to tackle while you've got this momentum?`,
  },
};

// Helper to map Hume emotion to category
export const categorizeEmotion = (humeEmotionName) => {
  const emotionLower = humeEmotionName.toLowerCase();

  for (const [category, data] of Object.entries(EMOTION_CATEGORY_MAP)) {
    if (data.humeEmotions.some((hume) => emotionLower.includes(hume))) {
      return category;
    }
  }

  return "neutral"; // Default fallback
};
