export const CRISIS_KEYWORDS = [
  'suicide', 'kill myself', 'end it all', 'want to die',
  'no reason to live', 'hurt myself', 'self harm', "can't go on",
  'hopeless', 'worthless', 'disappear forever',
];

export const checkCrisis = (text: string): boolean => {
  const lower = text.toLowerCase();
  return CRISIS_KEYWORDS.some(kw => lower.includes(kw));
};

export const MOOD_SCALE = [
  { score: -2, label: 'Very Negative' },
  { score: -1, label: 'Negative' },
  { score:  0, label: 'Neutral' },
  { score:  1, label: 'Positive' },
  { score:  2, label: 'Very Positive' },
];

export function getMoodScore(value: number): number {
  if (value <= 15) return -2;
  if (value <= 35) return -1;
  if (value <= 60) return 0;
  if (value <= 80) return 1;
  return 2;
}

export function getMoodLabel(value: number): string {
  const score = getMoodScore(value);
  return MOOD_SCALE.find(m => m.score === score)?.label ?? 'Neutral';
}

export const EMOTION_CATEGORY_MAP: Record<string, {
  label: string; color: string; emoji: string; humeEmotions: string[]; response: string;
}> = {
  stressed: {
    label: 'Stressed', color: 'red', emoji: '😰',
    humeEmotions: ['anxiety', 'worry', 'tension', 'distress', 'panic', 'nervous'],
    response: "I can feel the weight of what you're carrying. Stress is your system saying \"this matters to me.\" Let's break it down into smaller pieces you can handle right now.",
  },
  overwhelmed: {
    label: 'Overwhelmed', color: 'amber', emoji: '😵',
    humeEmotions: ['overwhelm', 'overload', 'confusion', 'chaos', 'flooded'],
    response: "That's a lot on your plate. When everything feels like too much, it's actually a sign you need to simplify, not push harder.",
  },
  neutral: {
    label: 'Neutral', color: 'purple', emoji: '😐',
    humeEmotions: ['neutral', 'indifferent', 'detached', 'apathy', 'bored'],
    response: "You're in neutral territory — neither down nor up. This is actually a stable place.",
  },
  calm: {
    label: 'Calm', color: 'teal', emoji: '😌',
    humeEmotions: ['calm', 'peaceful', 'relaxed', 'tranquil', 'composed', 'serene', 'content'],
    response: "You're in a good headspace. This is your moment to plan, reflect, and strengthen yourself.",
  },
  energized: {
    label: 'Energized', color: 'green', emoji: '😄',
    humeEmotions: ['joy', 'excited', 'happy', 'energetic', 'enthusiastic', 'triumph', 'pride', 'hopeful', 'inspired', 'grateful'],
    response: "You're flying right now. Channel this energy into something meaningful.",
  },
};
