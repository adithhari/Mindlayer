import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../hooks/useAuth';
import MoodPills from './MoodPills';
import Streak from './Streak';

export default function Dashboard() {
  const { logMood, streakDays, userProfile, moodLog } = useApp();
  const { logout } = useAuth();
  const [greeting, setGreeting] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Get the current mood from the latest mood log entry
  const currentMood = moodLog.length > 0 ? moodLog[moodLog.length - 1] : null;

  const getMoodColor = (score) => {
    if (score <= 2) return '#ef4444'; // red
    if (score <= 4) return '#f97316'; // orange
    if (score <= 6) return '#64748b'; // gray
    if (score <= 8) return '#a78bfa'; // purple
    return '#4ade80'; // green
  };

  const getMoodLabel = (score) => {
    if (score <= 2) return 'Very Negative';
    if (score <= 4) return 'Negative';
    if (score <= 6) return 'Neutral';
    if (score <= 8) return 'Positive';
    return 'Very Positive';
  };

  useEffect(() => {
    const h = new Date().getHours();
    const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    setGreeting(greet);
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      console.error('Logout failed:', err);
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="screen dashboard-screen">
      <div className="dashboard-header">
        <h1>
          <span id="time-greeting">{greeting}</span>
          {userProfile?.name ? `, ${userProfile.name}` : ', you'} 💚
        </h1>
        <div className="dashboard-header-actions">
          <Streak days={streakDays} />
          <button 
            className="logout-btn"
            onClick={handleLogout}
            disabled={isLoggingOut}
            title="Sign out"
          >
            {isLoggingOut ? '...' : '↗'}
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="section">
          <h2>How are you feeling right now?</h2>
          <MoodPills onMoodSelect={logMood} />
        </div>

        {/* Current mood indicator */}
        {currentMood && (
          <div className="current-mood-card" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: '12px',
            background: `linear-gradient(135deg, ${getMoodColor(currentMood.score)}15, ${getMoodColor(currentMood.score)}08)`,
            border: `1px solid ${getMoodColor(currentMood.score)}30`,
            marginBottom: '24px',
          }}>
            <span style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: getMoodColor(currentMood.score),
              flexShrink: 0,
            }} />
            <div style={{ flex: 1 }}>
              <span style={{
                fontSize: '14px',
                fontWeight: '600',
                color: getMoodColor(currentMood.score),
                display: 'block',
              }}>
                Current mood: {getMoodLabel(currentMood.score)}
              </span>
              <span style={{
                fontSize: '12px',
                color: '#666',
                display: 'block',
              }}>
                {new Date(currentMood.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        )}

        <div className="feature-grid">
          <FeatureCard
            icon="💭"
            title="Brain Dump"
            desc="Get unstuck — dump your thoughts and let AI organize them"
            onClick={() => {}}
          />
          <FeatureCard
            icon="📓"
            title="Journal"
            desc="Reflect deeply. Understand yourself better each day."
            onClick={() => {}}
          />
          <FeatureCard
            icon="💬"
            title="Chat Coach"
            desc="Talk to a compassionate AI mental wellness coach"
            onClick={() => {}}
          />
          <FeatureCard
            icon="✨"
            title="Micro-Habits"
            desc="Tiny habits that shift your mood right now"
            onClick={() => {}}
          />
          <FeatureCard
            icon="🔄"
            title="Reframe"
            desc="Challenge negative thoughts with CBT techniques"
            onClick={() => {}}
          />
          <FeatureCard
            icon="📊"
            title="Patterns"
            desc="See your mood trends & understand your patterns"
            onClick={() => {}}
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc, onClick }) {
  return (
    <div className="feature-card" onClick={onClick}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>{icon}</div>
      <h3>{title}</h3>
      <p>{desc}</p>
    </div>
  );
}
