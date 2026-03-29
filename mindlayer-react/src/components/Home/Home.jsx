import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../hooks/useAuth';
import { analyzeEntry, deepgramSpeechToText, deepgramTextToSpeech } from '../../utils/api';
import { checkCrisis } from '../../utils/constants';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { useAudioAnalyzer } from '../../hooks/useAudioAnalyzer';
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
  if (t.includes('anxi') || t.includes('stress') || t.includes('panic') || t.includes('overwhelm')) return 18;
  if (t.includes('sad') || t.includes('grief') || t.includes('loss') || t.includes('depress')) return 230;
  if (t.includes('anger') || t.includes('frust') || t.includes('rage')) return 5;
  if (t.includes('calm') || t.includes('peace') || t.includes('relax') || t.includes('content')) return 185;
  if (t.includes('joy') || t.includes('happi') || t.includes('excit') || t.includes('positiv')) return 148;
  if (t.includes('lonel') || t.includes('isol')) return 260;
  return 210;
}

export default function Home() {
  const { logMood, addJournalEntry, userProfile, conversationHistory, setConversationHistory } = useApp();
  const { logout } = useAuth();

  const [orbState, setOrbState] = useState('idle');
  const [speakingHue, setSpeakingHue] = useState(null);
  const [sliderValue, setSliderValue] = useState(50);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const moodLabel = getMoodLabel(sliderValue);

  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [aiData, setAiData] = useState(null);
  const [displayedText, setDisplayedText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const typewriterRef = useRef(null);

  const [showCrisis, setShowCrisis] = useState(false);

  const [greeting, setGreeting] = useState('');
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');
  }, []);

  const { isRecording, formattedTime, startRecording, stopRecording, streamRef } = useAudioRecorder();
  const { amplitudeRef, analyserRef, ensureCtx, connectMicStream, startLoop, stopLoop, disconnect } = useAudioAnalyzer();

  const audioRef = useRef(null);

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

  const playTTS = async (text) => {
    if (audioRef.current) {
      try { audioRef.current.stop(); } catch (_) {}
      audioRef.current = null;
    }
    disconnect();

    try {
      const { audioBlob } = await deepgramTextToSpeech(text);
      const arrayBuffer = await audioBlob.arrayBuffer();

      const { ctx } = ensureCtx();
      const decoded = await ctx.decodeAudioData(arrayBuffer);
      const source  = ctx.createBufferSource();
      source.buffer = decoded;
      source.connect(analyserRef.current);
      source.connect(ctx.destination);
      startLoop();
      source.start(0);

      source.onended = () => {
        audioRef.current = null;
        stopLoop();
      };
      audioRef.current = {
        stop: () => {
          try { source.stop(); } catch (_) {}
          stopLoop();
        }
      };
    } catch (err) {
      console.error('TTS error:', err);
    }
  };

  const handleSubmit = async (text) => {
    if (!text.trim() || isSubmitting) return;

    if (checkCrisis(text)) {
      setShowCrisis(true);
      return;
    }

    setIsSubmitting(true);
    setOrbState('processing');
    setAiData(null);
    setDisplayedText('');
    setErrorMsg('');

    const recentThemes = conversationHistory
      .filter(m => m.theme)
      .slice(-3)
      .map(m => m.theme);

    try {
      const result = await analyzeEntry(
        text,
        userProfile?.name || '',
        moodLabel,
        recentThemes
      );

      setConversationHistory(prev => [
        ...prev,
        { role: 'user', text, theme: result.theme }
      ]);

      const hue = themeToHue(result.theme);
      setSpeakingHue(hue);
      setOrbState('speaking');
      setAiData(result);
      typewrite(result.acknowledgment);

      const fullSpeech = [
        result.acknowledgment,
        result.insight,
        `Here's something you can try right now: ${result.microAction}`,
        result.affirmation,
      ].join(' ');
      playTTS(fullSpeech);

      logMood(moodLabel.toLowerCase(), sliderValue / 10);
      addJournalEntry(text, {
        emotions: [{ name: result.theme || 'neutral', score: sliderValue / 100 }],
        dominantEmotion: result.theme || 'neutral',
        intensity: Math.round(result.stressLevel / 10),
        summary: result.insight,
      }, null).catch(() => {});

      setInputText('');
    } catch (err) {
      console.error('Error:', err);
      setOrbState('idle');
      setErrorMsg(err.message || 'Something went wrong. Check your API key.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoiceToggle = async () => {
    if (isRecording) {
      try {
        disconnect();
        setOrbState('processing');
        const audioBlob = await stopRecording();
        const result = await deepgramSpeechToText(audioBlob);
        // Auto-submit immediately — no manual button press needed
        await handleSubmit(result.text);
      } catch (err) {
        console.error('Voice error:', err);
        disconnect();
        setOrbState('idle');
      }
    } else {
      try {
        await startRecording();
        if (streamRef.current) connectMicStream(streamRef.current);
        setOrbState('listening');
      } catch (err) {
        console.error('Mic error:', err);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(inputText);
  };

  const handleOrbClick = () => {
    if (orbState === 'idle' || orbState === 'speaking') handleVoiceToggle();
  };

  const handleReset = () => {
    if (audioRef.current) { try { audioRef.current.stop(); } catch (_) {} audioRef.current = null; }
    if (typewriterRef.current) clearInterval(typewriterRef.current);
    setOrbState('idle');
    setAiData(null);
    setDisplayedText('');
    setSpeakingHue(null);
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

  return (
    <div className="home-screen">
      {/* Header */}
      <div className="home-header-top">
        <div>
          <span className="home-greeting">
            {greeting}
            {userProfile?.name && `, ${userProfile.name}`}
          </span>
          <span className="home-tagline">How are you feeling?</span>
        </div>
        <button 
          className="logout-btn"
          onClick={handleLogout}
          disabled={isLoggingOut}
          title="Sign out"
        >
          {isLoggingOut ? '...' : '↗'}
        </button>
      </div>

      {/* ── Hero split ────────────────────────────────── */}
      <div className="home-hero">

        {/* Left column */}
        <div className="home-left">
          <div className="home-eyebrow">
            {greeting}{name}
          </div>

          <h1 className="home-headline">
            How are you<br />
            <em>feeling</em> today?
          </h1>

          {/* Feature bullets — vapi-style two-column */}
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

          {/* Mood picker */}
          <MoodSlider value={sliderValue} onChange={setSliderValue} />

          {/* CTA buttons */}
          <div className="home-ctas">
            <button
              className={`home-cta-btn ${isRecording ? 'home-cta-btn--recording' : 'home-cta-btn--primary'}`}
              onClick={handleVoiceToggle}
              disabled={orbState === 'processing' || isSubmitting}
            >
              {isRecording
                ? <><span className="cta-rec-dot" /> Stop listening</>
                : (orbState === 'processing' || isSubmitting)
                ? <><span className="cta-pulse-dot" /> Thinking…</>
                : <><span className="cta-pulse-dot" /> Start talking</>
              }
            </button>
          </div>

          {/* AI Response — lives in the left column */}
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

              {orbState === 'speaking' && (
                <button className="orb-reset-btn" onClick={handleReset} style={{ marginTop: 12 }}>
                  Clear ✕
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right column — Orb */}
        <div className="home-right">
          <div
            className="orb-wrapper"
            onClick={handleOrbClick}
            title={orbState === 'idle' ? 'Tap to speak' : undefined}
          >
            <OrbAssistant
              state={orbState}
              sliderValue={sliderValue}
              speakingHue={speakingHue}
              amplitudeRef={amplitudeRef}
            />
          </div>

          <div className="orb-state-label">
            {orbState === 'idle' && <span>Tap orb to speak</span>}
            {orbState === 'listening' && (
              <span className="orb-label--listening">
                <span className="listening-dot" /> Listening… {formattedTime}
              </span>
            )}
            {orbState === 'processing' && (
              <span className="orb-label--processing">Thinking…</span>
            )}
            {orbState === 'speaking' && (
              <span className="orb-label--speaking">Speaking…</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Text input — full width below hero ────────── */}
      <div className="home-input-section">
        <div className="home-input-wrap">
          <textarea
            className="home-textarea"
            placeholder="What's on your mind? Dump it all here…"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            disabled={isSubmitting}
          />
          <div className="home-input-actions">
            <button
              className={`voice-btn ${isRecording ? 'voice-btn--active' : ''}`}
              onClick={handleVoiceToggle}
              title={isRecording ? 'Stop recording' : 'Start voice input'}
            >
              {isRecording ? '⏹' : '🎙'}
            </button>
            <button
              className="send-btn"
              onClick={() => handleSubmit(inputText)}
              disabled={!inputText.trim() || isSubmitting}
              title="Send (⌘↵)"
            >
              {isSubmitting ? '…' : '→'}
            </button>
          </div>
        </div>
        <p className="input-hint">Press ⌘↵ to send</p>
      </div>

      {errorMsg && <div className="home-error">⚠ {errorMsg}</div>}
      {showCrisis && <CrisisOverlay onClose={() => setShowCrisis(false)} />}
    </div>
  );
}
