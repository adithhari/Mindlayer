import { useState } from 'react';
import { useApp } from '../../context/AppContext';

const MOODS = [
  { emoji: '😔', label: 'Struggling' },
  { emoji: '😕', label: 'Low' },
  { emoji: '😐', label: 'Okay' },
  { emoji: '🙂', label: 'Good' },
  { emoji: '😊', label: 'Great' },
];

export default function Onboarding() {
  const { setUserProfile } = useApp();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [selectedMood, setSelectedMood] = useState(null);

  const handleFinish = () => {
    if (!name.trim()) return;
    setUserProfile({ name: name.trim(), onboardedAt: Date.now() });
  };

  return (
    <div className="onboarding-screen">
      {step === 0 && (
        <div className="onboarding-step">
          <div className="onboarding-orb" />
          <h1 className="onboarding-title">MindFlyer</h1>
          <p className="onboarding-sub">Your personal mental clarity companion</p>
          <button className="onboarding-btn" onClick={() => setStep(1)}>
            Get started
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="onboarding-step">
          <h2 className="onboarding-heading">What should I call you?</h2>
          <p className="onboarding-sub">I'll use your name to make our conversations feel personal.</p>
          <input
            className="onboarding-input"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && name.trim() && setStep(2)}
            autoFocus
          />
          <button
            className="onboarding-btn"
            onClick={() => setStep(2)}
            disabled={!name.trim()}
          >
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="onboarding-step">
          <h2 className="onboarding-heading">How are you feeling today, {name}?</h2>
          <p className="onboarding-sub">No judgment — just checking in.</p>
          <div className="onboarding-moods">
            {MOODS.map((m) => (
              <button
                key={m.label}
                className={`onboarding-mood-btn ${selectedMood === m.label ? 'onboarding-mood-btn--active' : ''}`}
                onClick={() => setSelectedMood(m.label)}
              >
                <span className="mood-emoji">{m.emoji}</span>
                <span className="mood-label">{m.label}</span>
              </button>
            ))}
          </div>
          <button
            className="onboarding-btn"
            onClick={handleFinish}
            disabled={!selectedMood}
          >
            Start your journey
          </button>
        </div>
      )}
    </div>
  );
}
