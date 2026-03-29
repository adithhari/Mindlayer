// ─────────────────────────────────────────────────────────────────────────────
// Supermemory Integration — via FastAPI proxy (no keys in browser)
// ─────────────────────────────────────────────────────────────────────────────
// All Supermemory API calls go through /api/memory/* proxy endpoints.
// The backend holds the SUPERMEMORY_API_KEY server-side.
// ─────────────────────────────────────────────────────────────────────────────

const PROXY = '/api/memory';

/** Build a container tag scoped to this user. */
const userTag = (userId) => `mindlayer_user_${userId}`;

// ── Core API Calls (via proxy) ──────────────────────────────────────────────

/**
 * Add a memory to Supermemory via proxy.
 */
export const saveEntry = async (userId, content, metadata = {}) => {
  try {
    const res = await fetch(`${PROXY}/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        containerTags: [userTag(userId)],
        metadata: {
          source: 'mindlayer',
          type: 'entry',
          timestamp: new Date().toISOString(),
          ...metadata,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[Supermemory] add failed:', res.status, errText);
      return null;
    }

    const data = await res.json();
    console.log('[Supermemory] Entry saved:', data);
    return data;
  } catch (err) {
    console.error('[Supermemory] add error:', err.message);
    return null;
  }
};

/**
 * Search past memories for relevant context via proxy.
 */
export const searchMemories = async (userId, query, limit = 5) => {
  try {
    const res = await fetch(`${PROXY}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: query,
        containerTags: [userTag(userId)],
        limit,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[Supermemory] search failed:', res.status, errText);
      return [];
    }

    const data = await res.json();
    console.log('[Supermemory] Search results:', data);
    return data.results || data.documents || data || [];
  } catch (err) {
    console.error('[Supermemory] search error:', err.message);
    return [];
  }
};

/**
 * Load user profile from Supermemory via proxy.
 */
export const loadUserProfile = async (userId) => {
  try {
    const res = await fetch(`${PROXY}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: 'What do I know about this user? Their mood patterns, recurring themes, emotional state, preferences, and background.',
        containerTags: [userTag(userId)],
        limit: 10,
        include_profile: true,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[Supermemory] profile load failed:', res.status, errText);
      return null;
    }

    const data = await res.json();
    console.log('[Supermemory] Profile loaded:', data);

    if (data.profile) return data.profile;

    const results = data.results || data.documents || [];
    if (results.length === 0) {
      console.log('[Supermemory] No memories found — new user');
      return null;
    }

    return { static: [], dynamic: [], rawResults: results };
  } catch (err) {
    console.error('[Supermemory] profile error:', err.message);
    return null;
  }
};

// ── High-Level Functions (unchanged — no keys involved) ─────────────────────

export const buildUserCard = (profile, userName = '') => {
  if (!profile) return '';

  const parts = [];

  if (profile.static && profile.static.length > 0) {
    const staticFacts = Array.isArray(profile.static)
      ? profile.static.slice(0, 5).join('. ')
      : String(profile.static).slice(0, 300);
    parts.push(`Known patterns: ${staticFacts}`);
  }

  if (profile.dynamic && profile.dynamic.length > 0) {
    const dynamicFacts = Array.isArray(profile.dynamic)
      ? profile.dynamic.slice(0, 3).join('. ')
      : String(profile.dynamic).slice(0, 200);
    parts.push(`Recent context: ${dynamicFacts}`);
  }

  if (parts.length === 0 && profile.rawResults && profile.rawResults.length > 0) {
    const summaries = profile.rawResults
      .slice(0, 5)
      .map(r => r.content || r.text || r.chunk || '')
      .filter(Boolean)
      .map(s => s.slice(0, 100))
      .join(' | ');
    if (summaries) parts.push(`Past sessions: ${summaries}`);
  }

  if (parts.length === 0) return '';
  return parts.join('. ').slice(0, 500);
};

export const formatEntryForMemory = ({
  moodLabel = 'Neutral', theme = 'neutral', stressLevel = 50,
  insight = '', textSnippet = '', intervention = '',
}) => {
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
  const parts = [`[${date}]`, `Mood: ${moodLabel}`, `Theme: ${theme}`, `Stress: ${stressLevel}/100`];
  if (insight) parts.push(`Insight: ${insight}`);
  if (textSnippet) parts.push(`Context: ${textSnippet.slice(0, 200)}`);
  if (intervention) parts.push(`Intervention: ${intervention}`);
  return parts.join('. ');
};

export const saveConversationMemory = async (userId, messages, moodLabel = 'Neutral') => {
  if (!messages || messages.length === 0) return null;
  const userMessages = messages.filter(m => m.role === 'user').map(m => m.text).join(' ').slice(0, 400);
  const content = formatEntryForMemory({
    moodLabel, theme: 'voice_conversation', stressLevel: 50,
    insight: `Voice conversation with ${messages.length} exchanges.`,
    textSnippet: userMessages,
  });
  return saveEntry(userId, content, {
    type: 'voice_conversation', mood: moodLabel, messageCount: messages.length,
  });
};
