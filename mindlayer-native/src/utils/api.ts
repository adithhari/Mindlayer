import * as FileSystem from 'expo-file-system/legacy';
import { Audio } from 'expo-av';

const CLAUDE_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '';
const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-opus-4-6';

const DEEPGRAM_API_KEY = process.env.EXPO_PUBLIC_DEEPGRAM_API_KEY || '';
const DEEPGRAM_STT_URL = 'https://api.deepgram.com/v1/listen';
const DEEPGRAM_TTS_URL = 'https://api.deepgram.com/v1/speak?model=aura-2-thalia-en';

const HUME_API_KEY = process.env.EXPO_PUBLIC_HUME_API_KEY || '';
const HUME_BATCH_URL = 'https://api.hume.ai/v0/batch/jobs';

const extractJSON = (raw: string) => {
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]);
  return {
    acknowledgment: raw.trim(),
    insight: '',
    microAction: 'Take a slow breath. Reach out to someone you trust.',
    affirmation: 'You are not alone in this.',
    stressLevel: 75,
    theme: 'crisis',
  };
};

function getMoodStrategy(moodLabel: string): string {
  switch (moodLabel) {
    case 'Very Positive':
      return `The user self-reports as VERY POSITIVE (+2). Celebrate, amplify, and lock in this state.
- ACKNOWLEDGE: Celebrate with genuine enthusiasm. Reflect their energy back.
- INSIGHT: Name the strength or pattern driving this positivity.
- MICRO_ACTION: Something to lock in or extend this state.
- AFFIRMATION: Empowering and celebratory.
- STRESS_LEVEL: LOW (0–20).
- THEME: "positive"`;
    case 'Positive':
      return `The user self-reports as POSITIVE (+1). Affirm, ground, and build on this baseline.
- ACKNOWLEDGE: Warmly validate what's going right.
- INSIGHT: Name what's working.
- MICRO_ACTION: Something small to sustain this.
- AFFIRMATION: Grounding and encouraging.
- STRESS_LEVEL: LOW-MODERATE (15–35).
- THEME: "positive" or "neutral"`;
    case 'Neutral':
      return `The user self-reports as NEUTRAL (0). Meet them where they are.
- ACKNOWLEDGE: Validate that neutral is completely okay.
- INSIGHT: Name what's sitting underneath.
- MICRO_ACTION: Something tiny that shifts energy slightly.
- AFFIRMATION: Steady and real.
- STRESS_LEVEL: MODERATE (30–55).
- THEME: "neutral"`;
    case 'Negative':
      return `The user self-reports as NEGATIVE (-1). Be a calm, compassionate presence.
- ACKNOWLEDGE: Lead with deep warmth. Name exactly what they're going through.
- INSIGHT: Gently name the emotional root.
- MICRO_ACTION: Something that immediately reduces distress.
- AFFIRMATION: Compassionate and specific.
- STRESS_LEVEL: MODERATE-HIGH (50–72).
- THEME: anxiety, sadness, overwhelm, or anger`;
    case 'Very Negative':
      return `The user self-reports as VERY NEGATIVE (-2). Be a steady, non-judgmental presence.
- ACKNOWLEDGE: Lead with deep genuine empathy. 2–3 full warm sentences.
- INSIGHT: Gently name the core of this distress.
- MICRO_ACTION: Something grounding and immediate.
- AFFIRMATION: Deeply compassionate.
- STRESS_LEVEL: HIGH (72–95).
- THEME: anxiety, sadness, grief, overwhelm, or loneliness`;
    default:
      return `The user's mood is neutral. Respond with warmth, balance, and genuine presence.`;
  }
}

export const analyzeEntry = async (
  text: string,
  userName = '',
  moodLabel = 'Neutral',
  recentThemes: string[] = []
) => {
  const moodStrategy = getMoodStrategy(moodLabel);
  const context = [
    userName ? `The user's name is ${userName}.` : '',
    recentThemes.length > 0
      ? `Recent themes from their journal: ${recentThemes.slice(0, 3).join(', ')}.`
      : '',
  ].filter(Boolean).join(' ');

  const systemPrompt = `You are MindFlyer — a deeply perceptive mental wellness companion who is also the most emotionally intelligent friend the user has ever had. You are NOT a therapist. You are NOT a generic wellness bot.

${context ? context + '\n\n' : ''}MOOD CONTEXT & RESPONSE STRATEGY:
${moodStrategy}

## Your voice rules (never break these)
- Reference SPECIFIC words/phrases/contradictions from what they wrote — never be generic
- Name the feeling *underneath* what they said — go one layer deeper
- The acknowledgment is spoken aloud — write it like natural speech, 2-4 warm sentences
- NEVER start with "It sounds like..." or "I hear you" or "That makes sense" or "I understand"
- NEVER use their name in every sentence — once at most
- The insight should be a fresh reframe, not a summary
- The microAction should be one tiny concrete thing they can do in the next 5 minutes

Return ONLY this JSON, no preamble, no markdown:
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

export const askClaude = async (systemPrompt: string, userMessage: string): Promise<string> => {
  if (!CLAUDE_API_KEY) throw new Error('EXPO_PUBLIC_ANTHROPIC_API_KEY is not set');

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return data.content[0].text;
};

export const generateJournalHeading = async (summary: string, dominantEmotion: string): Promise<string | null> => {
  if (!summary) return null;
  const systemPrompt = `You are a creative writer. Given a journal summary and detected emotion, create a short, evocative journal entry heading (3-6 words max).
The heading should be: Poetic, reflect the emotion/theme, written in title case, no colons or punctuation.
Examples: "Finding Peace in Chaos", "When Anxiety Met Courage", "A Moment of Clarity"
Return ONLY the heading text, nothing else.`;
  try {
    const heading = await askClaude(systemPrompt, `Emotion: ${dominantEmotion}\nSummary: ${summary}`);
    return heading.trim();
  } catch {
    return null;
  }
};

// React Native version — accepts a file:// URI instead of a Blob
export const deepgramSpeechToText = async (uri: string): Promise<{ text: string; confidence: number }> => {
  if (!DEEPGRAM_API_KEY) throw new Error('EXPO_PUBLIC_DEEPGRAM_API_KEY is not set');

  const formData = new FormData();
  formData.append('audio', { uri, type: 'audio/m4a', name: 'audio.m4a' } as any);

  const url = `${DEEPGRAM_STT_URL}?model=nova-2&language=en`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Token ${DEEPGRAM_API_KEY}`,
      'Content-Type': 'multipart/form-data',
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Deepgram error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
  const confidence = result.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0;

  if (!transcript.trim()) throw new Error('No speech detected. Please speak clearly and try again.');
  return { text: transcript, confidence };
};

// React Native TTS — writes audio to cache, plays with expo-av, waits for completion
export const deepgramTextToSpeech = async (text: string): Promise<void> => {
  if (!DEEPGRAM_API_KEY) throw new Error('EXPO_PUBLIC_DEEPGRAM_API_KEY is not set');
  if (!text.trim()) return;

  // Ensure playback audio mode
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
  });

  const response = await fetch(DEEPGRAM_TTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Token ${DEEPGRAM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Deepgram TTS error: ${response.status} - ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  const uri = (FileSystem.cacheDirectory || '') + 'tts_response.mp3';
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });

  const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });

  // Wait for playback to fully complete
  await new Promise<void>((resolve) => {
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
        resolve();
      }
    });
  });
};

// Multi-turn conversational AI — keeps full history, returns plain text response
export const continueConversation = async (
  history: { role: 'user' | 'assistant'; text: string }[],
  userName = '',
  moodLabel = 'Neutral',
): Promise<string> => {
  if (!CLAUDE_API_KEY) throw new Error('EXPO_PUBLIC_ANTHROPIC_API_KEY is not set');

  const name = userName ? userName : 'friend';

  const systemPrompt = `You are MindFlyer — a deeply perceptive, warm mental wellness companion having a real voice conversation. You are NOT a chatbot. You are NOT a therapist. You are the most emotionally intelligent friend ${name} has ever talked to.

${userName ? `The user's name is ${name}. Use it naturally — once every few exchanges, not every reply.` : ''}
Self-reported mood right now: ${moodLabel}.

## Your voice and character
- You speak like a trusted friend who spent years studying psychology — warm, direct, real
- You notice the *specific* things they say and reflect them back with precision
- You name emotions they haven't named yet — gently, curiously, not clinically
- You make them feel genuinely *seen*, not processed
- You have quiet confidence — you don't over-explain or hedge everything

## What makes a great reply
1. **Reference exactly what they said** — pull out a specific word, phrase, or contradiction and speak directly to it
2. **Name the feeling underneath** — go one layer deeper than what they said ("sounds like it's less about X and more about Y")
3. **Validate without being sycophantic** — no "that's so valid!" or "I totally get that"
4. **Ask one real question** — not "how does that make you feel?" — something specific that invites them to go deeper
5. **Keep it short** — 2-3 sentences max. You are speaking aloud. No lists, no headers, no asterisks.

## Hard rules — violating these breaks the experience
- NEVER say: "I hear you", "That sounds hard", "I understand", "That makes sense", "That's valid", "Absolutely", "Of course", "I can imagine"
- NEVER start with "It sounds like..." or "It seems like..." — these are filler openers
- NEVER give advice unless they explicitly ask for it — your job is to help them think, not solve for them
- NEVER be generic — if your reply could apply to anyone, rewrite it
- NEVER use bullet points, numbered lists, or asterisks — this is a spoken conversation
- Do NOT ask more than one question per reply
- Do NOT repeat phrases from previous replies in this conversation

## Mood adaptation
${moodLabel === 'Very Positive' || moodLabel === 'Positive'
  ? 'They are feeling good. Match their energy — be warm and slightly celebratory. Help them name what is working.'
  : moodLabel === 'Neutral'
  ? 'They are in a neutral zone. Be grounded and curious. Help them explore what is underneath the surface calm.'
  : moodLabel === 'Negative'
  ? 'They are struggling. Lead with warmth. Slow down. Let them feel fully heard before anything else.'
  : 'They are in real pain right now. Be a steady, non-judgmental presence. No fixing. Just genuine human warmth.'}

Reply now — short, specific, real. Spoken aloud.`;

  const messages = history.map(m => ({
    role: m.role,
    content: m.text,
  }));

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 300,
      system: systemPrompt,
      messages,
    }),
  });

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return data.content[0].text.trim();
};

export const humeAnalyzeText = async (text: string) => {
  if (!HUME_API_KEY) throw new Error('EXPO_PUBLIC_HUME_API_KEY is not set');

  const submitRes = await fetch(HUME_BATCH_URL, {
    method: 'POST',
    headers: { 'X-Hume-Api-Key': HUME_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: [text], models: { language: {} } }),
  });

  if (!submitRes.ok) throw new Error(`Hume submit ${submitRes.status}`);
  const { job_id } = await submitRes.json();

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const statusRes = await fetch(`${HUME_BATCH_URL}/${job_id}`, {
      headers: { 'X-Hume-Api-Key': HUME_API_KEY },
    });
    const statusData = await statusRes.json();
    if (statusData.state?.status === 'COMPLETED') {
      const predRes = await fetch(`${HUME_BATCH_URL}/${job_id}/predictions`, {
        headers: { 'X-Hume-Api-Key': HUME_API_KEY },
      });
      return await predRes.json();
    }
    if (statusData.state?.status === 'FAILED') throw new Error('Hume job failed');
  }
  throw new Error('Hume timed out after 30 seconds');
};
