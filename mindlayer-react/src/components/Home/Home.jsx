import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../hooks/useAuth';
import { analyzeEntry, deepgramSpeechToText, deepgramTextToSpeech } from '../../utils/api';
import { checkCrisis } from '../../utils/constants';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import OrbAssistant from '../Orb/OrbAssistant';
import CrisisOverlay from '../Crisis/CrisisOverlay';

function getMoodLabel(value) {
  if (value <= 15) return 'Very Unpleasant';
  if (value <= 35) return 'Unpleasant';
  if (value <= 60) return 'Neutral';
  if (value <= 80) return 'Pleasant';
  return 'Very Pleasant';
}

function themeToHue(theme = '') {
  const t = theme.toLowerCase();
  if (t.includes('anxi') || t.includes('stress') || t.includes('panic') || t.includes('overwhelm')) return 18;
  if (t.includes('sad') || t.includes('grief') || t.includes('loss') || t.includes('depress')) return 230;
  if (t.includes('anger') || t.includes('frust') || t.includes('rage')) return 5;
  if (t.includes('calm') || t.includes('peace') || t.includes('relax') || t.includes('content')) return 185;
  if (t.includes('joy') || t.includes('happi') || t.includes('excit') || t.includes('positiv')) return 148;
  if (t.includes('lonel') || t.includes('isol')) return 260;
  if (t.includes('grief')) return 240;
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

  const [aiData, setAiData] = useState(null);       // full analyzeEntry result
  const [displayedText, setDisplayedText] = useState('');
  const [showDetail, setShowDetail] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const typewriterRef = useRef(null);

  const [showCrisis, setShowCrisis] = useState(false);

  const [greeting, setGreeting] = useState('');
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');
  }, []);

  const { isRecording, formattedTime, startRecording, stopRecording } = useAudioRecorder();

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
    try {
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
        audioRef.current = null;
      }
      const { audioUrl } = await deepgramTextToSpeech(text);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };
      audio.play().catch(() => {});
    } catch {
      // TTS failure is non-critical — silently ignore
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
    setShowDetail(false);
    setErrorMsg('');

    // Build recent themes from conversation history
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

      // Append to conversation history
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', text, theme: result.theme }
      ]);

      const hue = themeToHue(result.theme);
      setSpeakingHue(hue);
      setOrbState('speaking');
      setAiData(result);
      typewrite(result.acknowledgment);

      // Play TTS for acknowledgment
      playTTS(result.acknowledgment);

      // Log mood
      logMood(moodLabel.toLowerCase(), sliderValue / 10);

      // Save journal (async, non-blocking)
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
        setOrbState('processing');
        const audioBlob = await stopRecording();
        const result = await deepgramSpeechToText(audioBlob);
        setInputText(result.text);
        setOrbState('idle');
      } catch (err) {
        console.error('Voice error:', err);
        setOrbState('idle');
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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(inputText);
  };

  const handleOrbClick = () => {
    if (orbState === 'idle' || orbState === 'speaking') handleVoiceToggle();
  };

  const handleReset = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (typewriterRef.current) clearInterval(typewriterRef.current);
    setOrbState('idle');
    setAiData(null);
    setDisplayedText('');
    setShowDetail(false);
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

      {/* Orb */}
      <div className="orb-section">
        <div
          className="orb-wrapper"
          onClick={handleOrbClick}
          title={orbState === 'idle' ? 'Tap to speak' : undefined}
        >
          <OrbAssistant state={orbState} sliderValue={sliderValue} speakingHue={speakingHue} />
        </div>

        <div className="orb-state-label">
          {orbState === 'idle' && <span>Tap orb to speak</span>}
          {orbState === 'listening' && (
            <span className="orb-label--listening">
              <span className="listening-dot" /> Listening… {formattedTime}
            </span>
          )}
          {orbState === 'processing' && <span className="orb-label--processing">Thinking…</span>}
          {orbState === 'speaking' && aiData && (
            <button className="orb-reset-btn" onClick={handleReset}>Clear ✕</button>
          )}
        </div>

        {/* AI Response Card */}
        {displayedText && (
          <div className="orb-response">
            <p className="orb-response__ack">{displayedText}</p>

            {isTypingDone && (
              <>
                {!showDetail && (
                  <button className="orb-detail-toggle" onClick={() => setShowDetail(true)}>
                    Show insight &amp; action ↓
                  </button>
                )}
                {showDetail && (
                  <div className="orb-detail">
                    <div className="orb-detail__block">
                      <span className="orb-detail__label">Insight</span>
                      <p>{aiData.insight}</p>
                    </div>
                    <div className="orb-detail__block orb-detail__block--action">
                      <span className="orb-detail__label">Try this now</span>
                      <p>{aiData.microAction}</p>
                    </div>
                    <p className="orb-detail__affirmation">"{aiData.affirmation}"</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Mood Slider */}
      <div className="mood-slider-section">
        <div className="mood-value-label">{moodLabel}</div>
        <div className="slider-track-wrap">
          <input
            type="range"
            min="0"
            max="100"
            value={sliderValue}
            onChange={(e) => setSliderValue(Number(e.target.value))}
            className="mood-slider"
            style={{ '--slider-pct': `${sliderValue}%` }}
          />
        </div>
        <div className="slider-extremes">
          <span>Very Unpleasant</span>
          <span>Very Pleasant</span>
        </div>
      </div>

      {/* Text Input */}
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
