// Load API keys from environment variables
const CLAUDE_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || "";
const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-opus-4-6";

const HUME_API_KEY = import.meta.env.VITE_HUME_API_KEY || "";
const HUME_BATCH_URL = "https://api.hume.ai/v0/batch/jobs";

const DEEPGRAM_API_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY || "";
const DEEPGRAM_URL = "https://api.deepgram.com/v1/listen";

// Extract the first {...} JSON block from a Claude response, even with preamble text
const extractJSON = (raw) => {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`No JSON found in Claude response: ${raw.slice(0, 120)}`);
  return JSON.parse(match[0]);
};

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

export const askClaude = async (systemPrompt, userMessage) => {
  if (!CLAUDE_API_KEY) {
    throw new Error("VITE_ANTHROPIC_API_KEY environment variable is not set");
  }

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CLAUDE_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return data.content[0].text;
};

export const humeAnalyzeText = async (text) => {
  if (!HUME_API_KEY) {
    throw new Error("VITE_HUME_API_KEY environment variable is not set");
  }

  console.log(
    "🔍 Starting Hume analysis for text:",
    text.substring(0, 50) + "...",
  );

  const body = {
    text: [text], // Hume expects text as an array
    models: {
      language: {},
    },
  };

  console.log("📤 Submitting to Hume API...");
  const submitRes = await fetch(HUME_BATCH_URL, {
    method: "POST",
    headers: {
      "X-Hume-Api-Key": HUME_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!submitRes.ok) {
    const errorText = await submitRes.text();
    console.error("❌ Hume submit failed:", submitRes.status, errorText);
    throw new Error(`Hume submit ${submitRes.status}: ${errorText}`);
  }

  const submitData = await submitRes.json();
  const { job_id } = submitData;
  console.log("✅ Job submitted:", job_id);

  // Poll for up to 30 s
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const statusRes = await fetch(`${HUME_BATCH_URL}/${job_id}`, {
      headers: { "X-Hume-Api-Key": HUME_API_KEY },
    });

    if (!statusRes.ok) {
      const errorText = await statusRes.text();
      console.error(
        "❌ Hume status check failed:",
        statusRes.status,
        errorText,
      );
      throw new Error("Hume status check failed");
    }

    const statusData = await statusRes.json();
    const { state } = statusData;
    console.log(
      `⏳ Job ${job_id} status: ${state.status} (attempt ${i + 1}/30)`,
    );

    if (state.status === "COMPLETED") {
      console.log("🎉 Hume job completed, fetching predictions...");
      const predRes = await fetch(`${HUME_BATCH_URL}/${job_id}/predictions`, {
        headers: { "X-Hume-Api-Key": HUME_API_KEY },
      });

      if (!predRes.ok) {
        const errorText = await predRes.text();
        console.error(
          "❌ Hume predictions fetch failed:",
          predRes.status,
          errorText,
        );
        throw new Error(`Hume predictions ${predRes.status}`);
      }

      const predictions = await predRes.json();
      console.log("📊 Hume predictions received:", predictions);
      return predictions;
    }

    if (state.status === "FAILED") {
      console.error("❌ Hume job FAILED:", state);
      throw new Error("Hume job failed");
    }
  }

  throw new Error("Hume timed out after 30 seconds");
};

export const emotionColor = (name) => {
  const n = name.toLowerCase();
  const pos = [
    "joy",
    "excite",
    "admira",
    "amuse",
    "enthus",
    "satisf",
    "content",
    "pride",
    "triumph",
    "relief",
    "love",
    "adora",
    "calm",
    "interest",
  ];
  const neg = [
    "anger",
    "fear",
    "sad",
    "disgust",
    "distress",
    "anxi",
    "shame",
    "guilt",
    "contempt",
    "horror",
    "envy",
    "pain",
    "bored",
  ];

  if (pos.some((p) => n.includes(p))) return "var(--green)";
  if (neg.some((p) => n.includes(p))) return "var(--red)";
  return "var(--accent)";
};

// Brain Dump Analysis: Summarize and understand the rant
export const brainDumpSummarize = async (text) => {
  const systemPrompt = `You are a compassionate mental health assistant. A user has shared their thoughts, feelings, and experiences with you. 

Your job:
1. Acknowledge what they shared (validate their feelings)
2. Summarize the core issues/feelings in 1-2 sentences
3. Identify the main theme or root concern

Return ONLY valid JSON:
{
  "acknowledgment": "2-3 sentence validation of their feelings",
  "summary": "1-2 sentence summary of core issues",
  "theme": "main theme or root concern"
}`;

  const raw = await askClaude(systemPrompt, text);
  return extractJSON(raw);
};

// Extract top emotions from Hume predictions (raw emotions)
export const getTopEmotions = (humePredictions, topN = 5) => {
  if (!humePredictions || humePredictions.length === 0) {
    console.warn("⚠️ No Hume predictions provided");
    return [];
  }

  console.log("🔬 Processing Hume predictions...");
  const emotionScores = {};

  try {
    humePredictions.forEach((src) => {
      src.results?.predictions?.forEach((pred) => {
        pred.models?.language?.grouped_predictions?.forEach((group) => {
          group.predictions?.forEach((p) => {
            p.emotions?.forEach((e) => {
              console.log(`  Emotion: ${e.name} = ${e.score}`);
              emotionScores[e.name] = (emotionScores[e.name] || 0) + e.score;
            });
          });
        });
      });
    });
  } catch (err) {
    console.error("❌ Error parsing Hume predictions:", err);
    return [];
  }

  console.log("📈 All emotion scores:", emotionScores);

  // Return top N emotions sorted by score
  const topEmotions = Object.entries(emotionScores)
    .map(([name, score]) => ({ name, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  console.log("🎯 Top emotions:", topEmotions);
  return topEmotions;
};

// Get emotion-aware coaching response based on raw emotions
export const getEmotionAwareResponse = async (text, topEmotions) => {
  const emotionsStr = topEmotions.map((e) => e.name).join(", ");

  const systemPrompt = `You are a compassionate mental health coach. The user's detected emotions are: ${emotionsStr}.

Analyze their emotional state and provide:
1. A personalized agentic response (2-3 sentences) that acknowledges these specific emotions
2. One concrete micro-action they can take RIGHT NOW (1-2 sentences)
3. A supportive affirmation (1 sentence)

Return ONLY valid JSON:
{
  "response": "main coaching response",
  "microAction": "one tiny action to take now",
  "affirmation": "supportive statement"
}`;

  const raw = await askClaude(systemPrompt, text);
  return extractJSON(raw);
};

// Generate a journal entry heading from the summary
export const generateJournalHeading = async (summary, dominantEmotion) => {
  if (!summary) {
    console.warn("⚠️ No summary provided for heading generation");
    return null;
  }

  const systemPrompt = `You are a creative writer. Given a journal summary and detected emotion, create a short, evocative journal entry heading (3-6 words max) that captures the essence of the entry.

The heading should be:
- Poetic and meaningful
- Reflect the emotion and theme
- Written in title case
- No colons or punctuation

Examples:
- "Finding Peace in Chaos"
- "When Anxiety Met Courage"
- "A Moment of Clarity"
- "Letting Go of Control"

Return ONLY the heading text, nothing else.`;

  try {
    const heading = await askClaude(
      systemPrompt,
      `Emotion: ${dominantEmotion}\nSummary: ${summary}`,
    );
    console.log("📝 Generated heading:", heading);
    return heading.trim();
  } catch (err) {
    console.error("❌ Failed to generate heading:", err);
    return null;
  }
};

// Deepgram Speech-to-Text API
export const deepgramSpeechToText = async (audioBlob) => {
  if (!DEEPGRAM_API_KEY) {
    throw new Error("VITE_DEEPGRAM_API_KEY environment variable is not set");
  }

  console.log(
    "🎙️ Sending audio to Deepgram...",
    audioBlob.size,
    "bytes, mimeType:",
    audioBlob.type,
  );

  // Determine the MIME type for the Content-Type header
  let contentType = audioBlob.type || "audio/webm";
  console.log("📋 Content-Type header:", contentType);

  // Build URL with parameters
  const url = new URL(DEEPGRAM_URL);

  // Let Deepgram auto-detect encoding for compressed formats (WebM, Ogg, etc.)
  // Only specify encoding for raw audio formats
  if (contentType.includes("wav") || contentType.includes("raw")) {
    url.searchParams.append("encoding", "linear16");
    url.searchParams.append("sample_rate", "16000");
  }

  // Always add smart formatting for better transcription
  url.searchParams.append("model", "nova-2");
  url.searchParams.append("language", "en");

  try {
    console.log("📤 Fetching from URL:", url.toString());

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY}`,
        "Content-Type": contentType,
      },
      body: audioBlob,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "❌ Deepgram API error:",
        response.status,
        "Response:",
        errorText,
      );
      throw new Error(
        `Deepgram error: ${response.status} - ${errorText || "Unknown error"}`,
      );
    }

    const result = await response.json();
    console.log("✅ Deepgram response:", result);

    // Extract transcript from Deepgram response
    const transcript =
      result.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
    const confidence =
      result.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0;

    if (!transcript || !transcript.trim()) {
      console.warn("⚠️ Empty transcript received from Deepgram");
      throw new Error(
        "No speech detected. Please speak clearly and try again.",
      );
    }

    console.log(`📝 Transcribed: "${transcript}" (confidence: ${confidence})`);
    return {
      text: transcript,
      confidence,
      raw: result,
    };
  } catch (err) {
    console.error("❌ Deepgram transcription error:", err.message);
    throw err;
  }
};

// Deepgram Text-to-Speech API
export const deepgramTextToSpeech = async (text) => {
  if (!DEEPGRAM_API_KEY) {
    throw new Error("VITE_DEEPGRAM_API_KEY environment variable is not set");
  }

  if (!text || !text.trim()) {
    throw new Error("No text provided for speech synthesis");
  }

  console.log(
    "🔊 Converting text to speech with Deepgram...",
    text.substring(0, 50) + "...",
  );

  const TTS_URL = "https://api.deepgram.com/v1/speak";

  try {
    const response = await fetch(TTS_URL, {
      method: "POST",
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "❌ Deepgram TTS error:",
        response.status,
        "Response:",
        errorText,
      );
      throw new Error(
        `Deepgram TTS error: ${response.status} - ${errorText || "Unknown error"}`,
      );
    }

    // Response is audio/mpeg blob
    const audioBlob = await response.blob();
    console.log("✅ Audio generated:", {
      size: audioBlob.size,
      type: audioBlob.type,
    });

    // Create a URL for the audio blob
    const audioUrl = URL.createObjectURL(audioBlob);
    return {
      audioUrl,
      audioBlob,
    };
  } catch (err) {
    console.error("❌ Text-to-speech error:", err.message);
    throw err;
  }
};
