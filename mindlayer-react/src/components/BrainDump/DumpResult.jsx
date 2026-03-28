import React, { useState } from 'react';
import { emotionColor, deepgramTextToSpeech } from '../../utils/api';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';

export default function DumpResult({ result, loading, mode, onSaveJournal }) {
  if (loading) {
    return (
      <div className="dump-result">
        <div className="loading-spinner">
          <div style={{ textAlign: 'center', color: 'var(--text2)' }}>
            <p style={{ marginBottom: '8px' }}>🔍 Analyzing...</p>
            <p style={{ fontSize: '12px' }}>Understanding your feelings with AI...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!result) return null;

  if (result.error) {
    return (
      <div className="dump-result">
        <p style={{ color: 'var(--red)', fontSize: '13px' }}>
          Error: {result.error}
        </p>
      </div>
    );
  }

  // Display emotion-aware results with agentic response
  if (result.topEmotions && result.coachResponse) {
    return (
      <div className="dump-result">
        <EmotionAwareAnalysis 
          summary={result.claudeSummary}
          response={result.coachResponse}
          topEmotions={result.topEmotions}
          result={result}
          onSaveJournal={onSaveJournal}
        />
      </div>
    );
  }

  return null;
}

function EmotionAwareAnalysis({ summary, response, topEmotions, result, onSaveJournal }) {
  const [isSaved, setIsSaved] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsError, setTtsError] = useState(null);
  const { isPlaying, play, pause, togglePlayPause } = useAudioPlayer();
  const [ttsAudioUrl, setTtsAudioUrl] = useState(null);
  
  const dominantEmotion = topEmotions[0];
  const dominantColor = emotionColor(dominantEmotion.name);

  const handleSaveToJournal = async () => {
    if (onSaveJournal) {
      await onSaveJournal();
      setIsSaved(true);
      // Reset after 2 seconds
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const handlePlayText = async () => {
    try {
      // If already have audio URL, just toggle playback
      if (ttsAudioUrl) {
        togglePlayPause(ttsAudioUrl);
        return;
      }

      // Generate TTS for the coaching response
      setTtsLoading(true);
      setTtsError(null);

      // Combine the main response text with affirmation
      const textToSpeak = `${response.response}. ${response.affirmation}`;
      console.log("📝 Generating speech for:", textToSpeak.substring(0, 100));

      const { audioUrl } = await deepgramTextToSpeech(textToSpeak);
      setTtsAudioUrl(audioUrl);
      setTtsLoading(false);

      // Play immediately after generating
      await play(audioUrl);
    } catch (err) {
      console.error("❌ TTS error:", err);
      setTtsError(err.message || "Failed to generate speech");
      setTtsLoading(false);
    }
  };

  // Get formatted timestamp
  const now = new Date();
  const timestamp = now.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="emotion-analysis-container">
      {/* Emotion Badge with Top Emotions */}
      <div 
        className="emotion-category-badge"
        style={{ 
          background: `${dominantColor}15`, 
          color: dominantColor,
          padding: '16px 20px',
          borderRadius: 'var(--radius)',
          marginBottom: '16px',
          borderLeft: `4px solid ${dominantColor}`
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '8px' }}>
            Primary Emotions Detected
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {topEmotions.slice(0, 3).map((emotion, i) => (
              <div 
                key={i}
                style={{
                  padding: '4px 10px',
                  background: dominantColor,
                  color: 'white',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                {emotion.name.charAt(0).toUpperCase() + emotion.name.slice(1)} ({Math.round(emotion.score * 100)}%)
              </div>
            ))}
          </div>
          <div style={{ fontSize: '13px', opacity: 0.8, marginTop: '8px' }}>
            {timestamp}
          </div>
        </div>
      </div>

      {/* What We Heard */}
      <div className="analysis-section" style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text2)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          What We Heard
        </div>
        <div style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text)' }}>
          <p style={{ marginBottom: '8px' }}>{summary.acknowledgment}</p>
          <p style={{ fontStyle: 'italic', color: 'var(--text2)' }}>
            Core issue: {summary.summary}
          </p>
        </div>
      </div>

      {/* Top Emotions Detected */}
      {/* This section is now part of the emotion badge above */}

      {/* Coaching Response */}
      <div className="coaching-response-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Our Response
          </div>
          <button
            onClick={handlePlayText}
            disabled={ttsLoading}
            style={{
              padding: '6px 12px',
              background: isPlaying ? 'var(--red)' : 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: ttsLoading ? 'default' : 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              transition: 'all 0.3s ease',
              opacity: ttsLoading ? 0.6 : 1,
              minWidth: '80px'
            }}
            title={isPlaying ? 'Pause' : 'Listen'}
          >
            {ttsLoading ? '🔊 Loading...' : isPlaying ? '⏸️ Pause' : '🔊 Listen'}
          </button>
        </div>
        {ttsError && (
          <div style={{ 
            padding: '8px 12px', 
            background: 'var(--red)15', 
            color: 'var(--red)', 
            borderRadius: '4px',
            fontSize: '12px',
            marginBottom: '12px'
          }}>
            ⚠️ {ttsError}
          </div>
        )}
        <div className="coaching-card" style={{
          padding: '16px',
          background: `${dominantColor}15`,
          borderLeft: `3px solid ${dominantColor}`,
          borderRadius: 'var(--radius-sm)',
          marginBottom: '12px'
        }}>
          <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text)', marginBottom: '12px' }}>
            {response.response}
          </p>
          <div style={{ 
            padding: '12px', 
            background: 'rgba(255, 255, 255, 0.1)', 
            borderRadius: 'var(--radius-sm)',
            marginBottom: '12px'
          }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text2)', marginBottom: '4px', textTransform: 'uppercase' }}>
              Try This Right Now
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text)', margin: 0 }}>
              {response.microAction}
            </p>
          </div>
          <div style={{ fontSize: '13px', fontStyle: 'italic', color: dominantColor, fontWeight: 500 }}>
            "{response.affirmation}"
          </div>
        </div>
      </div>

      {/* Save to Journal Button */}
      <button
        onClick={handleSaveToJournal}
        disabled={isSaved}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: isSaved ? 'var(--green)' : dominantColor,
          color: 'white',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          fontSize: '14px',
          fontWeight: 600,
          cursor: isSaved ? 'default' : 'pointer',
          marginBottom: '12px',
          transition: 'all 0.3s ease',
          opacity: isSaved ? 0.8 : 1
        }}
      >
        {isSaved ? '✓ Saved to Journal' : '📔 Save to Journal'}
      </button>

      {/* Timestamp and Confirmation */}
      <div style={{ 
        fontSize: '12px', 
        color: 'var(--text3)', 
        padding: '12px',
        background: 'var(--bg3)',
        borderRadius: 'var(--radius-sm)',
        textAlign: 'center'
      }}>
        {isSaved ? (
          <div>✓ Entry saved at {timestamp}</div>
        ) : (
          <div>💭 Click to save this reflection as a journal entry</div>
        )}
      </div>
    </div>
  );
}
