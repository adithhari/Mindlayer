import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateJournalHeading } from '../utils/api';

interface MoodEntry {
  date: string;
  time: number;
  mood: string;
  score: number;
}

interface JournalEntry {
  id: number;
  date: string;
  time: string;
  title: string | null;
  text: string;
  emotions: { name: string; score: number }[];
  dominantEmotion: string;
  intensity: number | null;
  summary: string | null;
}

interface VoiceTranscript {
  id: number;
  date: string;
  time: string;
  messages: { role: string; text: string }[];
}

interface ConversationMessage {
  role: string;
  text: string;
  theme?: string;
}

interface UserProfile {
  name: string;
  [key: string]: any;
}

interface AppContextValue {
  moodLog: MoodEntry[];
  journalEntries: JournalEntry[];
  voiceTranscripts: VoiceTranscript[];
  streakDays: number;
  userProfile: UserProfile | null;
  conversationHistory: ConversationMessage[];
  hydrated: boolean;
  setMoodLog: React.Dispatch<React.SetStateAction<MoodEntry[]>>;
  setJournalEntries: React.Dispatch<React.SetStateAction<JournalEntry[]>>;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  setConversationHistory: React.Dispatch<React.SetStateAction<ConversationMessage[]>>;
  logMood: (mood: string, score: number) => void;
  addJournalEntry: (text: string, claudeData: any, humePredictions: any) => Promise<void>;
  addVoiceTranscript: (messages: { role: string; text: string }[]) => number;
  updateJournalEntry: (id: number, updates: Partial<JournalEntry>) => void;
  deleteJournalEntry: (id: number) => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hydrated, setHydrated] = useState(false);

  const [moodLog, setMoodLog] = useState<MoodEntry[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [voiceTranscripts, setVoiceTranscripts] = useState<VoiceTranscript[]>([]);
  const [streakDays, setStreakDays] = useState(0);
  const [lastVisit, setLastVisit] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);

  // Hydrate from AsyncStorage on mount
  useEffect(() => {
    const hydrate = async () => {
      try {
        const [ml, jl, vt, streak, lv, up] = await Promise.all([
          AsyncStorage.getItem('ml_moodlog'),
          AsyncStorage.getItem('ml_journal'),
          AsyncStorage.getItem('ml_transcripts'),
          AsyncStorage.getItem('ml_streak'),
          AsyncStorage.getItem('ml_lastvisit'),
          AsyncStorage.getItem('ml_userprofile'),
        ]);
        if (ml) setMoodLog(JSON.parse(ml));
        if (jl) setJournalEntries(JSON.parse(jl));
        if (vt) setVoiceTranscripts(JSON.parse(vt));
        if (streak) setStreakDays(parseInt(streak));
        if (lv) setLastVisit(lv);
        if (up) setUserProfile(JSON.parse(up));
      } catch (err) {
        console.error('Hydration error:', err);
      } finally {
        setHydrated(true);
      }
    };
    hydrate();
  }, []);

  // Streak tracking — runs after hydration
  useEffect(() => {
    if (!hydrated) return;
    const today = new Date().toDateString();
    if (lastVisit !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      const newStreak = lastVisit === yesterday ? streakDays + 1 : 1;
      setStreakDays(newStreak);
      setLastVisit(today);
      AsyncStorage.setItem('ml_streak', String(newStreak));
      AsyncStorage.setItem('ml_lastvisit', today);
    }
  }, [hydrated]);

  // Persist on change
  useEffect(() => { AsyncStorage.setItem('ml_moodlog', JSON.stringify(moodLog)); }, [moodLog]);
  useEffect(() => { AsyncStorage.setItem('ml_journal', JSON.stringify(journalEntries)); }, [journalEntries]);
  useEffect(() => { AsyncStorage.setItem('ml_transcripts', JSON.stringify(voiceTranscripts)); }, [voiceTranscripts]);
  useEffect(() => {
    if (userProfile) AsyncStorage.setItem('ml_userprofile', JSON.stringify(userProfile));
  }, [userProfile]);

  const logMood = useCallback((mood: string, score: number) => {
    const today = new Date().toDateString();
    setMoodLog(prev => {
      const filtered = prev.filter(e => e.date !== today);
      const updated = [...filtered, { date: today, time: Date.now(), mood, score }];
      return updated.length > 30 ? updated.slice(-30) : updated;
    });
  }, []);

  const addJournalEntry = useCallback(async (text: string, claudeData: any, _humePredictions: any) => {
    const emotions = claudeData?.emotions || [];
    const dominantEmotion = claudeData?.dominantEmotion || (emotions.length > 0 ? emotions[0].name : 'neutral');
    const summary = claudeData?.summary || null;
    let title: string | null = null;
    if (summary && dominantEmotion) {
      try { title = await generateJournalHeading(summary, dominantEmotion); } catch {}
    }
    const entry: JournalEntry = {
      id: Date.now(),
      date: new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      title,
      text,
      emotions,
      dominantEmotion,
      intensity: claudeData?.intensity || null,
      summary: summary || null,
    };
    setJournalEntries(prev => {
      const updated = [entry, ...prev];
      return updated.length > 50 ? updated.slice(0, 50) : updated;
    });
  }, []);

  const addVoiceTranscript = useCallback((messages: { role: string; text: string }[]): number => {
    if (!messages || messages.length === 0) return 0;
    const entry: VoiceTranscript = {
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

  const updateJournalEntry = useCallback((id: number, updates: Partial<JournalEntry>) => {
    setJournalEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, []);

  const deleteJournalEntry = useCallback((id: number) => {
    setJournalEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  return (
    <AppContext.Provider value={{
      moodLog, journalEntries, voiceTranscripts, streakDays, userProfile,
      conversationHistory, hydrated,
      setMoodLog, setJournalEntries, setUserProfile, setConversationHistory,
      logMood, addJournalEntry, addVoiceTranscript, updateJournalEntry, deleteJournalEntry,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
