import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { generateJournalHeading } from '../utils/api';
import {
  loadUserProfile,
  buildUserCard,
  saveEntry,
  formatEntryForMemory,
  saveConversationMemory,
} from '../utils/supermemory';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // Mood & Journal
  const [moodLog, setMoodLog] = useState(() =>
    JSON.parse(localStorage.getItem('ml_moodlog') || '[]')
  );
  const [journalEntries, setJournalEntries] = useState(() =>
    JSON.parse(localStorage.getItem('ml_journal') || '[]')
  );
  // Voice transcripts — always stored regardless of user permission
  const [voiceTranscripts, setVoiceTranscripts] = useState(() =>
    JSON.parse(localStorage.getItem('ml_transcripts') || '[]')
  );
  
  // Streak
  const [streakDays, setStreakDays] = useState(() =>
    parseInt(localStorage.getItem('ml_streak') || '0')
  );
  const [lastVisit, setLastVisit] = useState(
    localStorage.getItem('ml_lastvisit') || ''
  );

  // User profile (set during onboarding)
  const [userProfile, setUserProfile] = useState(() => {
    const saved = localStorage.getItem('ml_userprofile');
    return saved ? JSON.parse(saved) : null;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SUPERMEMORY: Persistent user memory card
  // This compact string (~50-100 tokens) gets injected into every Claude call.
  // Loaded once on auth, refreshed after each session.
  // ─────────────────────────────────────────────────────────────────────────
  const [userMemoryCard, setUserMemoryCard] = useState('');
  const [memoryLoading, setMemoryLoading] = useState(false);
  const memoryLoadedRef = useRef(false);

  // Conversation history for multi-turn context
  const [conversationHistory, setConversationHistory] = useState([]);
  
  // Chat & Habits
  const [chatHistory, setChatHistory] = useState([]);
  const [userHappinessScores, setUserHappinessScores] = useState([]);
  const [currentMoodContext, setCurrentMoodContext] = useState(null);
  
  // UI State
  const [activeScreen, setActiveScreen] = useState('home');
  const [reframeThought, setReframeThought] = useState('');

  // Initialize streak on mount
  useEffect(() => {
    const today = new Date().toDateString();
    if (lastVisit !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      const newStreak = lastVisit === yesterday ? streakDays + 1 : 1;
      setStreakDays(newStreak);
      localStorage.setItem('ml_streak', newStreak);
      localStorage.setItem('ml_lastvisit', today);
      setLastVisit(today);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // SUPERMEMORY: Load user profile on app mount (when userProfile is set)
  // This runs once after onboarding or login.
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userProfile || memoryLoadedRef.current) return;

    const loadMemory = async () => {
      setMemoryLoading(true);
      try {
        // Use Firebase UID if available, fall back to name-based ID
        const userId = userProfile.uid || userProfile.name || 'demo_user';
        console.log('[Memory] Loading profile for:', userId);

        const profile = await loadUserProfile(userId);
        const card = buildUserCard(profile, userProfile.name || '');

        if (card) {
          setUserMemoryCard(card);
          console.log('[Memory] User card loaded:', card.slice(0, 100) + '...');
        } else {
          console.log('[Memory] No past memories — starting fresh');
        }
        memoryLoadedRef.current = true;
      } catch (err) {
        console.error('[Memory] Failed to load profile:', err);
        // Non-blocking — app works fine without memory
      } finally {
        setMemoryLoading(false);
      }
    };

    loadMemory();
  }, [userProfile]);

  // Persist mood log
  useEffect(() => {
    localStorage.setItem('ml_moodlog', JSON.stringify(moodLog));
  }, [moodLog]);

  // Persist journal entries
  useEffect(() => {
    localStorage.setItem('ml_journal', JSON.stringify(journalEntries));
  }, [journalEntries]);

  // Persist voice transcripts
  useEffect(() => {
    localStorage.setItem('ml_transcripts', JSON.stringify(voiceTranscripts));
  }, [voiceTranscripts]);

  // Persist user profile
  useEffect(() => {
    if (userProfile) {
      localStorage.setItem('ml_userprofile', JSON.stringify(userProfile));
    }
  }, [userProfile]);

  const logMood = useCallback((mood, score) => {
    const entry = {
      date: new Date().toDateString(),
      time: Date.now(),
      mood,
      score
    };
    const today = new Date().toDateString();
    setMoodLog(prev => {
      const filtered = prev.filter(e => e.date !== today);
      const updated = [...filtered, entry];
      return updated.length > 30 ? updated.slice(-30) : updated;
    });
  }, []);

  const addJournalEntry = useCallback(async (text, claudeData, humePredictions) => {
    const emotions = claudeData?.emotions || [];
    const dominantEmotion = claudeData?.dominantEmotion || (emotions.length > 0 ? emotions[0].name : 'neutral');
    const summary = claudeData?.summary || null;

    // Generate heading from summary
    let title = null;
    if (summary && dominantEmotion) {
      try {
        title = await generateJournalHeading(summary, dominantEmotion);
      } catch (err) {
        console.error("❌ Failed to generate heading:", err);
      }
    }

    const entry = {
      id: Date.now(),
      date: new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      title: title,
      text,
      emotions,
      dominantEmotion: dominantEmotion,
      intensity: claudeData?.intensity || null,
      summary: summary || null
    };
    setJournalEntries(prev => {
      const updated = [entry, ...prev];
      return updated.length > 50 ? updated.slice(0, 50) : updated;
    });
  }, []);

  // Always saves the Vapi conversation transcript (no permission needed)
  const addVoiceTranscript = useCallback((messages) => {
    if (!messages || messages.length === 0) return;
    const entry = {
      id: Date.now(),
      date: new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      messages,
    };
    setVoiceTranscripts(prev => {
      const updated = [entry, ...prev];
      return updated.length > 100 ? updated.slice(0, 100) : updated;
    });
    return entry.id;
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // SUPERMEMORY: Save an entry to persistent memory after analysis.
  // Called from Home.jsx after analyzeEntry() returns.
  // Fire-and-forget — never blocks the UI.
  // ─────────────────────────────────────────────────────────────────────────
  const saveToSupermemory = useCallback(async ({
    moodLabel = 'Neutral',
    theme = 'neutral',
    stressLevel = 50,
    insight = '',
    textSnippet = '',
    intervention = '',
  }) => {
    const userId = userProfile?.uid || userProfile?.name || 'demo_user';

    const content = formatEntryForMemory({
      moodLabel,
      theme,
      stressLevel,
      insight,
      textSnippet,
      intervention,
    });

    // Fire-and-forget — don't await in the calling code
    saveEntry(userId, content, {
      mood: moodLabel,
      theme,
      stressLevel,
    }).then((result) => {
      if (result) {
        console.log('[Memory] Entry saved to Supermemory');
      }
    }).catch((err) => {
      console.error('[Memory] Save failed (non-blocking):', err);
    });
  }, [userProfile]);

  // ─────────────────────────────────────────────────────────────────────────
  // SUPERMEMORY: Save a Vapi conversation summary to persistent memory.
  // ─────────────────────────────────────────────────────────────────────────
  const saveConversationToSupermemory = useCallback(async (messages, moodLabel = 'Neutral') => {
    const userId = userProfile?.uid || userProfile?.name || 'demo_user';
    saveConversationMemory(userId, messages, moodLabel).catch((err) => {
      console.error('[Memory] Conversation save failed (non-blocking):', err);
    });
  }, [userProfile]);

  // ─────────────────────────────────────────────────────────────────────────
  // SUPERMEMORY: Refresh the user card (called after saving new entries).
  // Debounced — only refreshes if 30+ seconds since last load.
  // ─────────────────────────────────────────────────────────────────────────
  const lastRefreshRef = useRef(0);
  const refreshUserMemory = useCallback(async () => {
    const now = Date.now();
    if (now - lastRefreshRef.current < 30000) return; // Debounce: 30s
    lastRefreshRef.current = now;

    const userId = userProfile?.uid || userProfile?.name || 'demo_user';
    try {
      const profile = await loadUserProfile(userId);
      const card = buildUserCard(profile, userProfile?.name || '');
      if (card) {
        setUserMemoryCard(card);
        console.log('[Memory] User card refreshed');
      }
    } catch (err) {
      console.error('[Memory] Refresh failed:', err);
    }
  }, [userProfile]);

  const addHappinessScore = useCallback((score) => {
    setUserHappinessScores(prev => [...prev, score]);
  }, []);

  const updateJournalEntry = useCallback((entryId, updates) => {
    setJournalEntries(prev => 
      prev.map(entry => entry.id === entryId ? { ...entry, ...updates } : entry)
    );
  }, []);

  const deleteJournalEntry = useCallback((entryId) => {
    setJournalEntries(prev => prev.filter(entry => entry.id !== entryId));
  }, []);

  const value = {
    // State
    moodLog,
    journalEntries,
    voiceTranscripts,
    streakDays,
    chatHistory,
    userHappinessScores,
    currentMoodContext,
    activeScreen,
    reframeThought,
    userProfile,
    conversationHistory,
    userMemoryCard,      // ← NEW: compact memory string for Claude
    memoryLoading,       // ← NEW: true while loading from Supermemory

    // Setters
    setMoodLog,
    setJournalEntries,
    setChatHistory,
    setUserHappinessScores,
    setCurrentMoodContext,
    setActiveScreen,
    setReframeThought,
    setUserProfile,
    setConversationHistory,

    // Methods
    logMood,
    addJournalEntry,
    addVoiceTranscript,
    updateJournalEntry,
    deleteJournalEntry,
    addHappinessScore,
    saveToSupermemory,             // ← NEW: save entry to persistent memory
    saveConversationToSupermemory, // ← NEW: save voice conversation to memory
    refreshUserMemory,             // ← NEW: refresh memory card after saves
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = React.useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
