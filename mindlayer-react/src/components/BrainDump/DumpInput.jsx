import React, { useState } from 'react';
import { deepgramSpeechToText } from '../../utils/api';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';

export default function DumpInput({ value, onChange, mode, onAnalyze, loading }) {
  const { isRecording, formattedTime, startRecording, stopRecording } = useAudioRecorder();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const placeholder = mode === 'journal'
    ? 'Share your thoughts about the day... what happened? how did it make you feel?'
    : 'Rant away. What\'s on your mind? What happened today? No filter needed.';

  const btnText = mode === 'journal'
    ? 'Analyze & understand me →'
    : 'Understand my feelings →';

  const hint = mode === 'journal'
    ? 'Get personalized coaching based on your emotions'
    : 'We\'ll detect your emotions and respond with what you need';

  const handleStartRecording = async () => {
    try {
      await startRecording();
    } catch (err) {
      console.error('Failed to start recording:', err);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const handleStopRecording = async () => {
    try {
      console.log("🛑 Stopping recording...");
      setIsTranscribing(true);
      const audioBlob = await stopRecording();
      
      console.log("📦 Audio blob received:", {
        size: audioBlob.size,
        type: audioBlob.type,
      });
      
      if (audioBlob.size === 0) {
        throw new Error("No audio data recorded. Please try again.");
      }
      
      console.log("📡 Sending to Deepgram API...");
      const { text: transcribedText } = await deepgramSpeechToText(audioBlob);
      
      console.log("✅ Transcription successful:", transcribedText);
      
      if (transcribedText.trim()) {
        // Append transcribed text to existing textarea value
        const updatedText = value ? `${value} ${transcribedText}` : transcribedText;
        onChange(updatedText);
      }
      
      setIsTranscribing(false);
    } catch (err) {
      setIsTranscribing(false);
      console.error("❌ Error in speech-to-text flow:", err);
      
      // Provide user-friendly error messages
      let userMessage = "Transcription failed: ";
      if (err.message.includes("microphone")) {
        userMessage += "Could not access microphone. Please check permissions.";
      } else if (err.message.includes("No speech detected")) {
        userMessage += "No speech detected. Please speak clearly and try again.";
      } else if (err.message.includes("400")) {
        userMessage += "Audio format not supported. Please try again.";
      } else {
        userMessage += err.message;
      }
      
      alert(userMessage);
    }
  };

  return (
    <div className="dump-input-section">
      <div style={{ position: 'relative', width: '100%' }}>
        <textarea
          className="dump-input"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={loading || isRecording}
          style={{
            width: '100%',
            minHeight: '240px',
            padding: '16px 16px 60px 16px',
            paddingRight: '100px',
            border: '2px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            fontSize: '15px',
            lineHeight: '1.6',
            fontFamily: 'inherit',
            resize: 'vertical',
            boxSizing: 'border-box',
            backgroundColor: 'var(--bg1)',
            color: 'var(--text)',
            transition: 'border-color 0.2s',
            marginBottom: '0'
          }}
        />
        
        {/* Floating Analyze Button */}
        <button
          className="primary-btn dump-btn"
          onClick={onAnalyze}
          disabled={loading || !value.trim() || isRecording || isTranscribing}
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            padding: '10px 14px',
            background: loading || !value.trim() ? 'var(--text3)' : 'var(--accent)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: loading || !value.trim() ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            transition: 'all 0.3s ease',
            opacity: loading || !value.trim() ? 0.6 : 1,
            zIndex: 10
          }}
        >
          {loading ? 'Analyzing...' : '→'}
        </button>
      </div>

      <div className="dump-footer">
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1, marginTop: '12px' }}>
          {/* Speech to Text Button */}
          <button
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            disabled={isTranscribing || loading}
            style={{
              padding: '12px 16px',
              background: isRecording ? 'var(--red)' : 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: isTranscribing ? 'default' : 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s ease',
              minWidth: 'fit-content'
            }}
            title={isRecording ? 'Click to stop recording' : 'Click to start voice recording'}
          >
            {isTranscribing ? (
              <>🔄 Processing...</>
            ) : isRecording ? (
              <>
                <div className="neon-cloud-container">
                  <svg viewBox="0 0 60 60" width="24" height="24">
                    <defs>
                      <filter id="neonGlow">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    
                    {/* Outer neon wave rings */}
                    <circle className="neon-wave neon-wave-1" cx="30" cy="30" r="24" fill="none" strokeWidth="1.5" filter="url(#neonGlow)"/>
                    <circle className="neon-wave neon-wave-2" cx="30" cy="30" r="32" fill="none" strokeWidth="1.5" filter="url(#neonGlow)"/>
                    
                    {/* Center cloud */}
                    <path className="neon-cloud-center" d="M 15 28 Q 12 18, 24 16 Q 28 12, 35 14 Q 42 10, 45 18 Q 52 16, 53 26 Q 56 32, 48 38 L 18 38 Q 12 35, 15 28" fill="white" filter="url(#neonGlow)"/>
                  </svg>
                </div>
                {formattedTime}
              </>
            ) : (
              <>🎙️ Speak</>
            )}
          </button>
          <span style={{ flex: 1 }} />
        </div>
        <p className="dump-hint">{hint}</p>
      </div>

      {/* Neon audio spectrum animation */}
      <style>{`
        @keyframes neonPulse1 {
          0%, 100% {
            stroke: rgba(0, 255, 255, 0.6);
            r: 24px;
            opacity: 0.4;
          }
          50% {
            stroke: rgba(0, 255, 255, 1);
            r: 28px;
            opacity: 0.8;
          }
        }

        @keyframes neonPulse2 {
          0%, 100% {
            stroke: rgba(255, 0, 255, 0.4);
            r: 32px;
            opacity: 0.2;
          }
          50% {
            stroke: rgba(255, 0, 255, 0.8);
            r: 38px;
            opacity: 0.6;
          }
        }

        @keyframes cloudGlow {
          0%, 100% {
            fill: rgba(255, 255, 255, 0.9);
            filter: drop-shadow(0 0 4px rgba(0, 255, 255, 0.5));
          }
          50% {
            fill: rgba(255, 255, 255, 1);
            filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.8)) drop-shadow(0 0 20px rgba(255, 0, 255, 0.4));
          }
        }

        .neon-cloud-container {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .neon-wave-1 {
          animation: neonPulse1 1.5s ease-in-out infinite;
        }

        .neon-wave-2 {
          animation: neonPulse2 2s ease-in-out infinite;
        }

        .neon-cloud-center {
          animation: cloudGlow 1.5s ease-in-out infinite;
          stroke: white;
          stroke-width: 0.5;
        }
      `}</style>
    </div>
  );
}
