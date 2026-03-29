import { useState, useEffect, useRef, useCallback } from 'react';
import { BiLogOut } from 'react-icons/bi';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../hooks/useAuth';
import { analyzeEntry, deepgramSpeechToText, deepgramTextToSpeech } from '../../utils/api';
import { checkCrisis } from '../../utils/constants';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { useVapi } from '../../hooks/useVapi';
import OrbAssistant from '../Orb/OrbAssistant';
import MoodSlider from './MoodSlider';
import CrisisOverlay from '../Crisis/CrisisOverlay';

function getMoodScore(value) {
  if (value <= 15) return -2;
  if (value <= 35) return -1;
  if (value <= 60) return 0;
  if (value <= 80) return 1;
  return 2;
}

const MOOD_SCALE = [
  { score: -2, label: 'Very Negative' },
  { score: -1, label: 'Negative' },
  { score:  0, label: 'Neutral' },
  { score:  1, label: 'Positive' },
  { score:  2, label: 'Very Positive' },
];

function getMoodLabel(value) {
  return MOOD_SCALE.find(m => m.score === getMoodScore(value))?.label ?? 'Neutral';
}

function themeToHue(theme = '') {
  const t = theme.toLowerCase();
  if (t.includes('anxi') || t.includes('stress')) return 18;
  if (t.includes('sad') || t.includes('grief')) return 230;
  if (t.includes('anger') || t.includes('frust')) return 5;
  if (t.includes('calm') || t.includes('peace')) return 185;
  if (t.includes('joy') || t.includes('happi')) return 148;
  return 210;
}

// ── Post-call modal: asks user to save as journal ──────────────────────────────
function SaveJournalModal({ transcript, onSave, onSkip }) {
  const preview = transcript
    .slice(0, 4)
    .map(m => `${m.role === 'user' ? 'You' : 'MindFlyer'}: ${m.text}`)
    .join('\n');

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h2 className="modal-title">Save to Journal?</h2>
        <p className="modal-body">
          Your conversation is always saved as a transcript. Would you also like to add it to your personal journal?
        </p>
        {preview && (
          <pre className="modal-preview">{preview}{transcript.length > 4 ? '\n…' : ''}</pre>
        )}
        <div className="modal-actions">
          <button className="modal-btn modal-btn--primary" onClick={onSave}>
            Yes, save to journal
          </button>
          <button className="modal-btn modal-btn--ghost" onClick={onSkip}>
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {

  const {
    logMood,
    addJournalEntry,
    addVoiceTranscript,
    userProfile,
    conversationHistory,
    setConversationHistory,
    // ── Supermemory ──
    userMemoryCard,
    memoryLoading,
    saveToSupermemory,
    saveConversationToSupermemory,
    refreshUserMemory,
  } = useApp();
  const { logout } = useAuth();
  const [orbState, setOrbState] = useState('idle');
  const [speakingHue, setSpeakingHue] = useState(null);
  const [sliderValue, setSliderValue] = useState(50);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const moodLabel = getMoodLabel(sliderValue);

  // Text / record path state
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiData, setAiData] = useState(null);
  const [displayedText, setDisplayedText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const typewriterRef = useRef(null);

  // Post-call modal
  const [pendingTranscript, setPendingTranscript] = useState(null);

  const [showCrisis, setShowCrisis] = useState(false);

  const [greeting, setGreeting] = useState('');
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');
  }, []);

  // ── Audio recorder (quick record → transcribe → Claude) ───────────────────────
  const { isRecording, formattedTime, startRecording, stopRecording } = useAudioRecorder();

  // ── Log mood to context whenever slider changes ──────────────────────────────
  useEffect(() => {
    logMood(moodLabel.toLowerCase(), sliderValue / 10);
  }, [sliderValue, moodLabel, logMood]);

  // ── Vapi (live back-and-forth conversation) ────────────────────────────────────
  const handleCallEnd = useCallback((messages) => {
    if (!messages || messages.length === 0) return;
    addVoiceTranscript(messages);
    setPendingTranscript(messages);
    setOrbState('idle');
    // ── Supermemory: save voice conversation summary (fire-and-forget)
    setOrbState('idle');
    saveConversationToSupermemory(messages, moodLabel);
  }, [addVoiceTranscript, saveConversationToSupermemory, moodLabel]);

  const { callActive, connecting, startCall, endCall } = useVapi({
    onOrbState: setOrbState,
    onCallEnd: handleCallEnd,
  });

  // ── Typewriter ────────────────────────────────────────────────────────────────
  const typewrite = useCallback((text) => {
    if (typewriterRef.current) clearInterval(typewriterRef.current);
    setDisplayedText('');
    let i = 0;
    typewriterRef.current = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(typewriterRef.current);
      }
    }, 18);
  }, []);

  useEffect(() => () => { if (typewriterRef.current) clearInterval(typewriterRef.current); }, []);

  // ── Shared submit (text or transcribed voice) ─────────────────────────────────
  const handleSubmit = async (text) => {
    if (!text.trim() || isSubmitting) return;
    if (checkCrisis(text)) { setShowCrisis(true); return; }

    setIsSubmitting(true);
    setOrbState('processing');
    setAiData(null);
    setDisplayedText('');
    setErrorMsg('');

    const recentThemes = conversationHistory.filter(m => m.theme).slice(-3).map(m => m.theme);

    try {
      // ── Pass userMemoryCard to Claude for personalized responses ──
      const result = await analyzeEntry(
        text,
        userProfile?.name || '',
        moodLabel,
        recentThemes,
        userMemoryCard,  // ← Supermemory context injected here
      );
      setConversationHistory(prev => [...prev, { role: 'user', text, theme: result.theme }]);

      const hue = themeToHue(result.theme);
      setSpeakingHue(hue);
      setOrbState('speaking');
      setAiData(result);
      typewrite(result.acknowledgment);

      logMood(moodLabel.toLowerCase(), sliderValue / 10);
      addJournalEntry(text, {
        emotions: [{ name: moodLabel.toLowerCase() || 'neutral', score: sliderValue / 100 }],
        dominantEmotion: moodLabel.toLowerCase() || 'neutral',
        intensity: Math.round(result.stressLevel / 10),
        summary: result.insight,
      }, null).catch(() => {});

      // ── Supermemory: save this entry to persistent memory (fire-and-forget) ──
      saveToSupermemory({
        moodLabel,
        theme: result.theme || 'neutral',
        stressLevel: result.stressLevel || 50,
        insight: result.insight || '',
        textSnippet: text.slice(0, 200),
      });

      // Refresh memory card in background (debounced, won't run every time)
      refreshUserMemory();

      setInputText('');
    } catch (err) {
      console.error('Error:', err);
      setOrbState('idle');
      setErrorMsg(err.message || 'Something went wrong. Check your API key.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Record button: record → Deepgram STT → Claude ────────────────────────────
  const handleRecordToggle = async () => {
    if (callActive || connecting) return; // don't allow during Vapi convo

    if (isRecording) {
      try {
        setOrbState('processing');
        const audioBlob = await stopRecording();
        const result = await deepgramSpeechToText(audioBlob);
        await handleSubmit(result.text);
      } catch (err) {
        console.error('Record error:', err);
        setOrbState('idle');
        setErrorMsg(err.message || 'Could not transcribe audio.');
      }
    } else {
      try {
        await startRecording();
        setOrbState('listening');
      } catch (err) {
        console.error('Mic error:', err);
      }
    }
  };

  // ── Conversation button: Vapi live call ───────────────────────────────────────
  const handleConvoToggle = () => {
    if (isRecording) return; // don't allow during recording
    if (callActive || connecting) {
      setOrbState('idle');
      endCall();
    } else {
      startCall(userProfile?.name || '', moodLabel);
    }
  };

  const handleReset = () => {
    if (typewriterRef.current) clearInterval(typewriterRef.current);
    setOrbState('idle');
    setAiData(null);
    setDisplayedText('');
    setSpeakingHue(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(inputText);
  };

  // ── Journal save from Vapi transcript ─────────────────────────────────────────
  const handleSaveTranscriptAsJournal = () => {
    if (!pendingTranscript) return;
    const fullText = pendingTranscript
      .map(m => `${m.role === 'user' ? 'You' : 'MindFlyer'}: ${m.text}`)
      .join('\n');
    addJournalEntry(fullText, { dominantEmotion: 'neutral', summary: 'Voice conversation with MindFlyer' }, null).catch(() => {});
    setPendingTranscript(null);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      console.error('Logout failed:', err);
      setIsLoggingOut(false);
    }
  };

  const isTypingDone = aiData && displayedText === aiData.acknowledgment;
  const name = userProfile?.name ? `, ${userProfile.name}` : '';
  const isBusy = isSubmitting || isRecording || callActive || connecting;

  return (
    <div className={`home-screen ${callActive ? 'home-screen--conversation' : ''}`}>
      {/* Logout button - top right */}
      <button 
        className="logout-btn"
        onClick={handleLogout}
        disabled={isLoggingOut}
        title="Sign out"
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 10,
          background: '#f0f0f5',
          border: 'none',
          borderRadius: '12px',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          opacity: isLoggingOut ? 0.6 : 1,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#e8e8f0';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#f0f0f5';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
        }}
      >
        <BiLogOut size={20} color="#4a5568" />
      </button>

      {/* Memory loading indicator (subtle, only on first load) */}
      {memoryLoading && (
        <div className="memory-loading-hint" style={{
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--accent, #6BB5C9)',
          opacity: 0.7,
          padding: '4px 0',
        }}>
          Loading your memory...
        </div>
      )}

      {/* ── Hero split ──────────────────────────────────────────────────────── */}
      <div className="home-hero">

        {/* Left column */}
        <div className="home-left">
          <div className="home-eyebrow">{greeting}{name}</div>

          <h1 className="home-headline">
            How are you<br /><em>feeling</em> today?
          </h1>

          <div className="home-features">
            <div className="home-feature">
              <strong>Evidence-based</strong>
              <p>CBT and mindfulness grounded in clinical research.</p>
            </div>
            <div className="home-feature">
              <strong>Emotion-aware</strong>
              <p>Understands your voice, tone, and mood over time.</p>
            </div>
          </div>

          <MoodSlider value={sliderValue} onChange={setSliderValue} />

          {/* ── Two action buttons ── */}
          <div className="home-ctas">
            {/* Button 1 — Record a thought (STT → Claude) */}
            <button
              className={`home-cta-btn ${isRecording ? 'home-cta-btn--recording' : 'home-cta-btn--secondary'}`}
              onClick={handleRecordToggle}
              disabled={callActive || connecting || isSubmitting}
              title="Record a voice thought — transcribed and analysed by Claude"
            >
              {isRecording
                ? <><span className="cta-rec-dot" /> {formattedTime} Stop</>
                : isSubmitting
                ? <><span className="cta-pulse-dot" /> Thinking…</>
                : <><span className="btn-icon">🎙</span> Record thought</>
              }
            </button>

            {/* Button 2 — Live conversation (Vapi) */}
            <button
              className={`home-cta-btn ${(callActive || connecting) ? 'home-cta-btn--recording' : 'home-cta-btn--primary'}`}
              onClick={handleConvoToggle}
              disabled={isRecording || isSubmitting}
              title="Start a live back-and-forth voice conversation"
            >
              {connecting
                ? <><span className="cta-pulse-dot" /> Connecting…</>
                : callActive
                ? <><span className="cta-rec-dot" /> End conversation</>
                : <><span className="btn-icon">💬</span> Start conversation</>
              }
            </button>
          </div>

          {/* AI response card (record path) */}
          {displayedText && (
            <div className="orb-response">
              <p className="orb-response__ack">{displayedText}</p>
              {isTypingDone && (
                <div className="orb-detail">
                  <div className="orb-detail__block">
                    <span className="orb-detail__label">Insight</span>
                    <p>{aiData.insight}</p>
                  </div>
                  <div className="orb-detail__block orb-detail__block--action">
                    <span className="orb-detail__label">Try this now</span>
                    <p>{aiData.microAction}</p>
                  </div>
                </div>
              )}
              <button className="orb-reset-btn" onClick={handleReset} style={{ marginTop: 12 }}>
                Clear ✕
              </button>
            </div>
          )}
        </div>

        {/* Right column — Orb */}
        <div className="home-right">
          <div className="orb-wrapper" title={isBusy ? undefined : 'Tap to record'}>
            <OrbAssistant
              state={orbState}
              sliderValue={sliderValue}
              speakingHue={speakingHue}
              amplitudeRef={{ current: 0 }}
            />
          </div>

          <div className="orb-state-label">
            {orbState === 'idle'       && <span>Choose an option below</span>}
            {orbState === 'listening'  && (
              <span className="orb-label--listening">
                <span className="listening-dot" />
                {callActive ? 'Listening…' : `Recording… ${formattedTime}`}
              </span>
            )}
            {orbState === 'processing' && (
              <span className="orb-label--processing">
                {connecting ? 'Connecting…' : 'Thinking…'}
              </span>
            )}
            {orbState === 'speaking'   && <span className="orb-label--speaking">Speaking…</span>}
          </div>

          {callActive && (
            <button
              className="stop-conversation-btn"
              onClick={handleConvoToggle}
              title="End the conversation"
            >
              <span className="cta-rec-dot" /> STOP CONVERSATION
            </button>
          )}
        </div>
      </div>

      {/* ── Text input ──────────────────────────────────────────────────────── */}
      <div className="home-input-section">
        <div className="home-input-wrap">
          <textarea
            className="home-textarea"
            placeholder="Prefer to type? Dump it all here…"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            disabled={isBusy}
          />
          <div className="home-input-actions">
            <button
              className="send-btn"
              onClick={() => handleSubmit(inputText)}
              disabled={!inputText.trim() || isBusy}
              title="Send (⌘↵)"
            >
              {isSubmitting ? '…' : '→'}
            </button>
          </div>
        </div>
        <p className="input-hint">Press ⌘↵ to send · or use the buttons above to talk</p>
      </div>

      {errorMsg && <div className="home-error">⚠ {errorMsg}</div>}
      {showCrisis && <CrisisOverlay onClose={() => setShowCrisis(false)} />}

      {pendingTranscript && (
        <SaveJournalModal
          transcript={pendingTranscript}
          onSave={handleSaveTranscriptAsJournal}
          onSkip={() => setPendingTranscript(null)}
        />
      )}
    </div>
  );
}
