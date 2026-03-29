import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated, Modal,
} from 'react-native';
import { Audio } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import {
  analyzeEntry, continueConversation,
  deepgramSpeechToText, deepgramTextToSpeech,
} from '../utils/api';
import { checkCrisis, getMoodLabel } from '../utils/constants';
import OrbAnimated, { OrbState } from '../components/orb/OrbAnimated';
import MoodSlider from '../components/home/MoodSlider';
import CrisisOverlay from '../components/crisis/CrisisOverlay';
import { colors, radius, shadow } from '../utils/theme';

function themeToHue(theme = ''): number {
  const t = theme.toLowerCase();
  if (t.includes('anxi') || t.includes('stress')) return 18;
  if (t.includes('sad') || t.includes('grief')) return 230;
  if (t.includes('anger') || t.includes('frust')) return 5;
  if (t.includes('calm') || t.includes('peace')) return 185;
  if (t.includes('joy') || t.includes('happi')) return 148;
  return 210;
}

interface AiResult {
  acknowledgment: string;
  insight: string;
  microAction: string;
  affirmation: string;
  stressLevel: number;
  theme: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  result?: AiResult; // only for non-convo single turns
}

export default function HomeScreen() {
  const { logMood, addJournalEntry, addVoiceTranscript, userProfile, conversationHistory, setConversationHistory } = useApp();

  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [speakingHue, setSpeakingHue] = useState<number | null>(null);
  const [sliderValue, setSliderValue] = useState(50);
  const moodLabel = getMoodLabel(sliderValue);

  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showCrisis, setShowCrisis] = useState(false);

  // Chat bubbles
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  // Conversation mode
  const [convoActive, setConvoActive] = useState(false);
  const convoRef = useRef(false);
  const [convoPhase, setConvoPhase] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  // Convo history for multi-turn API calls (role: user/assistant, text)
  const convoHistoryRef = useRef<{ role: 'user' | 'assistant'; text: string }[]>([]);

  // Save-to-journal modal (shown after convo ends)
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const pendingTranscriptRef = useRef<{ role: string; text: string }[]>([]);

  // Pulse animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  const [greeting, setGreeting] = useState('');
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');
  }, []);

  useEffect(() => {
    Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true }).catch(() => {});
  }, []);

  useEffect(() => {
    if (orbState === 'listening') {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.06, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    }
  }, [orbState, pulseAnim]);

  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typewrite = useCallback((text: string): Promise<void> => new Promise((resolve) => {
    if (typewriterRef.current) clearInterval(typewriterRef.current);
    setStreamingText('');
    let i = 0;
    typewriterRef.current = setInterval(() => {
      if (i < text.length) { setStreamingText(text.slice(0, ++i)); }
      else { clearInterval(typewriterRef.current!); resolve(); }
    }, 14);
  }), []);
  useEffect(() => () => { if (typewriterRef.current) clearInterval(typewriterRef.current); }, []);

  const { isRecording, formattedTime, startRecording, stopRecording } = useAudioRecorder();

  const scrollDown = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

  // ── Speak text out loud while typewriting ────────────────────────────────────
  const speakAndType = useCallback(async (text: string, hue = 210) => {
    setSpeakingHue(hue);
    setOrbState('speaking');
    await Promise.allSettled([typewrite(text), deepgramTextToSpeech(text)]);
    setStreamingText('');
    if (!convoRef.current) setOrbState('idle');
  }, [typewrite]);

  // ── ONE-SHOT: text/voice → brain dump analysis → AI speaks ──────────────────
  const processSingleTurn = useCallback(async (text: string) => {
    if (!text.trim() || isSubmitting) return;
    if (checkCrisis(text)) { setShowCrisis(true); return; }

    setIsSubmitting(true);
    setOrbState('processing');
    setStreamingText('');
    setChatMessages(prev => [...prev, { role: 'user', text }]);
    setInputText('');
    scrollDown();

    const recentThemes = conversationHistory.filter((m: any) => m.theme).slice(-3).map((m: any) => m.theme);

    try {
      const result = await analyzeEntry(text, userProfile?.name || '', moodLabel, recentThemes);
      setConversationHistory((prev: any) => [...prev, { role: 'user', text, theme: result.theme }]);

      const hue = themeToHue(result.theme);
      await speakAndType(result.acknowledgment, hue);

      setChatMessages(prev => [...prev, { role: 'assistant', text: result.acknowledgment, result }]);
      scrollDown();

      logMood(moodLabel.toLowerCase(), sliderValue / 10);
      addJournalEntry(text, {
        emotions: [{ name: result.theme || 'neutral', score: sliderValue / 100 }],
        dominantEmotion: result.theme || 'neutral',
        intensity: Math.round(result.stressLevel / 10),
        summary: result.insight,
      }, null).catch(() => {});
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong.');
      setOrbState('idle');
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, conversationHistory, userProfile, moodLabel, sliderValue,
      logMood, addJournalEntry, speakAndType, setConversationHistory]);

  // ── CONVERSATION: one turn in the back-and-forth ─────────────────────────────
  const processConvoTurn = useCallback(async (userText: string) => {
    if (!userText.trim()) return;
    if (checkCrisis(userText)) { setShowCrisis(true); finishConvo(); return; }

    setConvoPhase('thinking');
    setOrbState('processing');
    setChatMessages(prev => [...prev, { role: 'user', text: userText }]);
    convoHistoryRef.current.push({ role: 'user', text: userText });
    scrollDown();

    try {
      const reply = await continueConversation(convoHistoryRef.current, userProfile?.name || '', moodLabel);
      convoHistoryRef.current.push({ role: 'assistant', text: reply });

      setConvoPhase('speaking');
      await speakAndType(reply, 210);

      setChatMessages(prev => [...prev, { role: 'assistant', text: reply }]);
      scrollDown();

      // Auto-listen again
      if (convoRef.current) listenForUser();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error, please try again.');
      if (convoRef.current) listenForUser();
    }
  }, [userProfile, moodLabel, speakAndType]);

  // ── Listen for user's voice turn ─────────────────────────────────────────────
  const listenForUser = useCallback(async () => {
    if (!convoRef.current) return;
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      await startRecording();
      setConvoPhase('listening');
      setOrbState('listening');
    } catch {
      finishConvo();
    }
  }, [startRecording]);

  // ── User taps "Done speaking" ─────────────────────────────────────────────────
  const handleDoneSpeaking = useCallback(async () => {
    if (!isRecording) return;
    setConvoPhase('thinking');
    setOrbState('processing');
    try {
      const uri = await stopRecording();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      const stt = await deepgramSpeechToText(uri);
      if (!convoRef.current) return;
      await processConvoTurn(stt.text);
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not hear you, try again.');
      if (convoRef.current) listenForUser();
    }
  }, [isRecording, stopRecording, processConvoTurn, listenForUser]);

  // ── Finish conversation: save transcript, show modal ─────────────────────────
  const finishConvo = useCallback(() => {
    convoRef.current = false;
    setConvoActive(false);
    setConvoPhase('idle');
    setOrbState('idle');
    if (isRecording) stopRecording().catch(() => {});

    // Build transcript from convoHistoryRef (has only turns after the AI greeting)
    const msgs = chatMessages.concat(); // snapshot
    const transcript = msgs.map(m => ({ role: m.role, text: m.text }));

    if (transcript.length > 0) {
      // Always save to conversations tab
      addVoiceTranscript(transcript);
      // Show "save to journal?" modal
      pendingTranscriptRef.current = transcript;
      setSaveModalVisible(true);
    }
  }, [isRecording, stopRecording, chatMessages, addVoiceTranscript]);

  // ── Start conversation: AI greets → listens ──────────────────────────────────
  const startConvo = useCallback(async () => {
    if (isSubmitting) return;
    convoRef.current = true;
    convoHistoryRef.current = [];
    setConvoActive(true);
    setChatMessages([]);
    setErrorMsg('');

    const name = userProfile?.name || '';
    const greetingText = name
      ? `Hey ${name}! I'm MindFlyer. I'm here to listen. How are you feeling right now?`
      : `Hey! I'm MindFlyer. I'm here to listen. How are you feeling right now?`;

    convoHistoryRef.current.push({ role: 'assistant', text: greetingText });
    setConvoPhase('speaking');

    await speakAndType(greetingText, 210);
    setChatMessages([{ role: 'assistant', text: greetingText }]);
    scrollDown();

    if (convoRef.current) listenForUser();
  }, [isSubmitting, userProfile, speakAndType, listenForUser]);

  // ── One-shot record toggle ────────────────────────────────────────────────────
  const handleRecordToggle = async () => {
    if (convoActive) return;
    if (isRecording) {
      try {
        setOrbState('processing');
        const uri = await stopRecording();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
        const stt = await deepgramSpeechToText(uri);
        await processSingleTurn(stt.text);
      } catch (err: any) {
        setOrbState('idle');
        setErrorMsg(err.message || 'Could not transcribe audio.');
      }
    } else {
      try {
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        await startRecording();
        setOrbState('listening');
      } catch (err: any) {
        setErrorMsg(err.message || 'Microphone permission denied');
      }
    }
  };

  const isBusy = isSubmitting || (isRecording && !convoActive);
  const name = userProfile?.name ? `, ${userProfile.name}` : '';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}{name}</Text>
            <Text style={styles.tagline}>How are you feeling?</Text>
          </View>
          {isRecording && (
            <View style={styles.recBadge}>
              <View style={styles.recDot} />
              <Text style={styles.recTime}>{formattedTime}</Text>
            </View>
          )}
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Orb */}
          <View style={styles.orbContainer}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <OrbAnimated state={orbState} sliderValue={sliderValue} speakingHue={speakingHue} size={200} />
            </Animated.View>
            <Text style={styles.orbLabel}>
              {convoActive
                ? convoPhase === 'listening' ? '🎙 Listening — tap Done when finished'
                : convoPhase === 'thinking'  ? '⏳ Thinking…'
                : convoPhase === 'speaking'  ? '🔊 Speaking…'
                : 'Starting…'
                : orbState === 'idle'        ? 'Share what\'s on your mind'
                : orbState === 'listening'   ? `🎙 Recording… ${formattedTime}`
                : orbState === 'processing'  ? '⏳ Thinking…'
                : '🔊 Speaking…'}
            </Text>
          </View>

          {/* Mood slider (hidden during active convo) */}
          {!convoActive && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Your mood right now</Text>
              <MoodSlider value={sliderValue} onChange={setSliderValue} />
            </View>
          )}

          {/* Chat bubbles */}
          {chatMessages.length > 0 && (
            <View style={styles.chatSection}>
              {chatMessages.map((msg, idx) => (
                <View key={idx} style={[styles.bubble, msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssist]}>
                  <Text style={[styles.bubbleText, msg.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAssist]}>
                    {msg.text}
                  </Text>
                  {/* Show insight/action only on single-turn responses */}
                  {msg.role === 'assistant' && msg.result && (
                    <>
                      <View style={styles.bubbleDivider} />
                      <Text style={styles.detailLabel}>INSIGHT</Text>
                      <Text style={styles.detailText}>{msg.result.insight}</Text>
                      <View style={styles.microActionBox}>
                        <Text style={styles.detailLabel}>TRY THIS NOW</Text>
                        <Text style={styles.detailText}>{msg.result.microAction}</Text>
                      </View>
                    </>
                  )}
                </View>
              ))}
              {/* Streaming bubble */}
              {streamingText ? (
                <View style={[styles.bubble, styles.bubbleAssist]}>
                  <Text style={[styles.bubbleText, styles.bubbleTextAssist]}>{streamingText}</Text>
                  <View style={styles.typingDots}>
                    <View style={styles.typingDot} />
                    <View style={[styles.typingDot, { opacity: 0.6 }]} />
                    <View style={[styles.typingDot, { opacity: 0.3 }]} />
                  </View>
                </View>
              ) : null}
            </View>
          )}

          {chatMessages.length === 0 && !streamingText && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Record a voice thought, start a conversation, or type below.</Text>
            </View>
          )}

          {errorMsg ? <Text style={styles.error}>⚠  {errorMsg}</Text> : null}
        </ScrollView>

        {/* Bottom bar */}
        <View style={styles.bottomBar}>
          {convoActive ? (
            <View style={styles.convoControls}>
              {convoPhase === 'listening' ? (
                <TouchableOpacity style={styles.doneSpeakingBtn} onPress={handleDoneSpeaking} activeOpacity={0.85}>
                  <Text style={styles.doneSpeakingText}>✓  Done speaking</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.doneSpeakingBtn, { opacity: 0.55 }]}>
                  <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
                  <Text style={styles.doneSpeakingText}>
                    {convoPhase === 'thinking' ? 'Thinking…' : 'Speaking…'}
                  </Text>
                </View>
              )}
              <TouchableOpacity style={styles.endBtn} onPress={finishConvo} activeOpacity={0.8}>
                <Text style={styles.endBtnText}>End</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[styles.halfBtn, styles.recordBtn, isRecording && styles.recordBtnActive]}
                  onPress={handleRecordToggle}
                  disabled={isBusy && !isRecording}
                  activeOpacity={0.85}
                >
                  {isRecording
                    ? <Text style={styles.halfBtnText}>⏹  {formattedTime}</Text>
                    : isSubmitting
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.halfBtnText}>🎙  Record</Text>}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.halfBtn, styles.convoBtn]}
                  onPress={startConvo}
                  disabled={isBusy}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.halfBtnText, { color: colors.accent }]}>💬  Conversation</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputRow}>
                <TextInput
                  style={styles.textarea}
                  placeholder="Type a thought…"
                  placeholderTextColor={colors.text3}
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  editable={!isBusy}
                />
                <TouchableOpacity
                  style={[styles.sendBtn, (!inputText.trim() || isBusy) && styles.sendBtnDisabled]}
                  onPress={() => processSingleTurn(inputText)}
                  disabled={!inputText.trim() || isBusy}
                >
                  {isSubmitting
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.sendBtnText}>→</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      {showCrisis && <CrisisOverlay onClose={() => setShowCrisis(false)} />}

      {/* Save-to-journal modal after conversation ends */}
      <Modal transparent animationType="slide" visible={saveModalVisible} onRequestClose={() => setSaveModalVisible(false)}>
        <View style={styles.saveOverlay}>
          <View style={styles.saveCard}>
            <Text style={styles.saveTitle}>Save to Journal?</Text>
            <Text style={styles.saveBody}>
              Your conversation is already saved in the Conversations tab. Would you also like to add it to your personal journal?
            </Text>
            <View style={styles.savePeek}>
              {pendingTranscriptRef.current.slice(0, 3).map((m, i) => (
                <Text key={i} style={styles.savePeekLine} numberOfLines={1}>
                  <Text style={{ fontWeight: '600' }}>{m.role === 'user' ? 'You' : 'MindFlyer'}: </Text>
                  {m.text}
                </Text>
              ))}
              {pendingTranscriptRef.current.length > 3 && (
                <Text style={styles.savePeekLine}>…and {pendingTranscriptRef.current.length - 3} more messages</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.savePrimaryBtn}
              onPress={() => {
                const fullText = pendingTranscriptRef.current
                  .map(m => `${m.role === 'user' ? 'You' : 'MindFlyer'}: ${m.text}`)
                  .join('\n');
                addJournalEntry(fullText, { dominantEmotion: 'conversation', summary: 'Voice conversation with MindFlyer' }, null).catch(() => {});
                setSaveModalVisible(false);
                pendingTranscriptRef.current = [];
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.savePrimaryText}>Yes, save to journal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveGhostBtn}
              onPress={() => { setSaveModalVisible(false); pendingTranscriptRef.current = []; }}
              activeOpacity={0.7}
            >
              <Text style={styles.saveGhostText}>No thanks</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg1 },
  flex: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 16 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6,
  },
  greeting: { fontSize: 17, fontWeight: '700', color: colors.text },
  tagline: { fontSize: 12, color: colors.text2, marginTop: 1 },
  recBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fef2f2', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  recDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.red },
  recTime: { fontSize: 13, fontWeight: '600', color: colors.red },

  orbContainer: { alignItems: 'center', marginVertical: 4 },
  orbLabel: { fontSize: 12, color: colors.text3, marginTop: 8, textAlign: 'center', paddingHorizontal: 20 },

  section: { marginTop: 8, marginBottom: 4 },
  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: colors.text2,
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6,
  },

  chatSection: { marginTop: 12, gap: 10 },
  bubble: { maxWidth: '86%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: colors.accent, borderBottomRightRadius: 4 },
  bubbleAssist: {
    alignSelf: 'flex-start', backgroundColor: colors.bg2,
    borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4,
    ...shadow.sm,
  },
  bubbleText: { fontSize: 14, lineHeight: 21 },
  bubbleTextUser: { color: '#fff' },
  bubbleTextAssist: { color: colors.text },
  bubbleDivider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  detailLabel: { fontSize: 10, fontWeight: '700', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  detailText: { fontSize: 13, color: colors.text2, lineHeight: 19 },
  microActionBox: { marginTop: 8, backgroundColor: colors.accentLt, borderRadius: radius.sm, padding: 10 },

  typingDots: { flexDirection: 'row', gap: 4, marginTop: 6 },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },

  emptyState: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 32 },
  emptyText: { fontSize: 13, color: colors.text3, textAlign: 'center', lineHeight: 20 },
  error: { color: colors.red, fontSize: 13, marginTop: 12, textAlign: 'center' },

  bottomBar: {
    borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.bg1, padding: 12, gap: 8,
  },

  // Convo controls
  convoControls: { flexDirection: 'row', gap: 8 },
  doneSpeakingBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.green, borderRadius: radius.md, paddingVertical: 14,
  },
  doneSpeakingText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  endBtn: {
    width: 64, backgroundColor: colors.bg3, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  endBtnText: { fontSize: 13, fontWeight: '600', color: colors.text2 },

  // Normal controls
  btnRow: { flexDirection: 'row', gap: 8 },
  halfBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.md, paddingVertical: 13,
  },
  halfBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  recordBtn: { backgroundColor: colors.text, ...shadow.sm },
  recordBtnActive: { backgroundColor: colors.red },
  convoBtn: {
    backgroundColor: colors.accentLt,
    borderWidth: 1, borderColor: `${colors.accent}40`,
  },

  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  textarea: {
    flex: 1, backgroundColor: colors.bg2, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: colors.text, maxHeight: 80,
  },
  sendBtn: {
    width: 42, height: 42, backgroundColor: colors.accent,
    borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.bg3 },
  sendBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  // Save modal
  saveOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  saveCard: {
    backgroundColor: colors.bg1,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 12,
  },
  saveTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  saveBody: { fontSize: 14, color: colors.text2, lineHeight: 20 },
  savePeek: {
    backgroundColor: colors.bg2, borderRadius: radius.md,
    padding: 12, gap: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  savePeekLine: { fontSize: 12, color: colors.text2 },
  savePrimaryBtn: {
    backgroundColor: colors.accent, borderRadius: radius.md,
    paddingVertical: 14, alignItems: 'center',
  },
  savePrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  saveGhostBtn: { paddingVertical: 12, alignItems: 'center' },
  saveGhostText: { color: colors.text3, fontSize: 14 },
});
