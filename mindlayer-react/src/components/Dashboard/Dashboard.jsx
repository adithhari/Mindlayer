import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../hooks/useAuth';
import MoodPills from './MoodPills';
import Streak from './Streak';

export default function Dashboard() {
  const { logMood, streakDays, userProfile } = useApp();
  const { logout } = useAuth();
  const [greeting, setGreeting] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
