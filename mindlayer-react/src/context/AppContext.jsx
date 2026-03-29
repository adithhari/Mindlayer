import React, { createContext, useState, useEffect, useCallback } from 'react';
import { generateJournalHeading } from '../utils/api';

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
        // Continue without heading if generation fails
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
