import { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';

// 4-7-8 breathing: 4s inhale, 7s hold, 8s exhale
const PHASES = [
  { label: 'Breathe in…', duration: 4, scale: 1.4 },
  { label: 'Hold…',       duration: 7, scale: 1.4 },
  { label: 'Breathe out…', duration: 8, scale: 0.7 },
];

export default function CrisisOverlay({ onClose }) {
  const { setActiveScreen } = useApp();
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [countdown, setCountdown] = useState(PHASES[0].duration);
  const [cycles, setCycles] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    let remaining = PHASES[phaseIdx].duration;
    setCountdown(remaining);

    intervalRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(intervalRef.current);
        setPhaseIdx(prev => {
          const next = (prev + 1) % PHASES.length;
          if (next === 0) setCycles(c => c + 1);
          return next;
        });
      }
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [phaseIdx]);

  const phase = PHASES[phaseIdx];
  const progress = (phase.duration - countdown) / phase.duration;

  const handleFindTherapist = () => {
    onClose();
    setActiveScreen('findhelp');
  };

  return (
    <div className="crisis-overlay">
      <div className="crisis-panel">
        <button className="crisis-close" onClick={onClose}>×</button>

        <div className="crisis-top">
          <h2 className="crisis-title">Let's ground you</h2>
          <p className="crisis-sub">You're safe. Focus on your breath.</p>
        </div>

        {/* Breathing circle */}
        <div className="breath-area">
          <div
            className="breath-circle"
            style={{
              transform: `scale(${phase.scale})`,
              transition: `transform ${phase.duration}s ease-in-out`,
            }}
          >
            <span className="breath-circle__label">{phase.label}</span>
            <span className="breath-circle__count">{countdown}</span>
          </div>
          <p className="breath-technique">4-7-8 Breathing · {cycles} cycle{cycles !== 1 ? 's' : ''}</p>
          {/* Progress arc */}
          <svg className="breath-progress" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" className="breath-progress__bg" />
            <circle
              cx="60" cy="60" r="54"
              className="breath-progress__fill"
              strokeDasharray={`${339.3 * progress} 339.3`}
              style={{ transition: 'stroke-dasharray 1s linear' }}
            />
          </svg>
        </div>

        {/* Crisis resources */}
        <div className="crisis-resources">
          <h4 className="crisis-resources__title">You deserve support from a real person</h4>
          <p className="crisis-resources__desc">
            Reach out right now — these services are free, confidential, and available 24/7:
          </p>
          <div className="crisis-links">
            <a href="tel:988" className="crisis-link">
              <span className="crisis-link__icon">📞</span>
              <div>
                <strong>988 Suicide &amp; Crisis Lifeline</strong>
                <span>Call or text 988</span>
              </div>
            </a>
            <a href="sms:741741?body=HOME" className="crisis-link">
              <span className="crisis-link__icon">💬</span>
              <div>
                <strong>Crisis Text Line</strong>
                <span>Text HOME to 741741</span>
              </div>
            </a>
          </div>

          {/* Find a therapist — links to FindHelp screen */}
          <button className="crisis-find-therapist" onClick={handleFindTherapist}>
            Find a licensed therapist near you →
          </button>
        </div>
      </div>
    </div>
  );
}
