import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import MoodPills from './MoodPills';
import Streak from './Streak';

export default function Dashboard() {
  const { logMood, streakDays } = useApp();
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const h = new Date().getHours();
    const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    setGreeting(greet);
  }, []);

  return (
    <div className="screen dashboard-screen">
      <div className="dashboard-header">
        <h1>
          <span id="time-greeting">{greeting}</span>, you 💚
        </h1>
        <Streak days={streakDays} />
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
