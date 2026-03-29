import { useMemo } from 'react';
import { useApp } from '../../context/AppContext';

const EMOTION_COLORS = {
  anxiety: '#f97316',
  sadness: '#818cf8',
  anger: '#ef4444',
  overwhelm: '#fb923c',
  neutral: '#64748b',
  positive: '#4ade80',
  grief: '#6366f1',
  loneliness: '#8b5cf6',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getMoodColor(score) {
  if (score <= 2) return '#ef4444';
  if (score <= 4) return '#fb923c';
  if (score <= 6) return '#64748b';
  if (score <= 8) return '#a78bfa';
  return '#4ade80';
}

export default function Tracker() {
  const { moodLog, journalEntries, streakDays } = useApp();

  // Get the current mood from the latest mood log entry
  const currentMood = moodLog.length > 0 ? moodLog[moodLog.length - 1] : null;

  const getMoodLabel = (score) => {
    if (score <= 2) return 'Very Negative';
    if (score <= 4) return 'Negative';
    if (score <= 6) return 'Neutral';
    if (score <= 8) return 'Positive';
    return 'Very Positive';
  };

  // Last 7 days of mood data
  const last7 = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const label = DAYS[d.getDay()];
      const dateStr = d.toDateString();
      const entry = moodLog.find(e => e.date === dateStr);
      days.push({ label, score: entry ? entry.score : null });
    }
    return days;
  }, [moodLog]);

  // Emotion frequency from journal
  const emotionFreq = useMemo(() => {
    const freq = {};
    journalEntries.forEach(e => {
      const em = e.dominantEmotion || 'neutral';
      freq[em] = (freq[em] || 0) + 1;
    });
    const total = Object.values(freq).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(freq)
      .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [journalEntries]);

  const avgScore = useMemo(() => {
    const valid = last7.filter(d => d.score !== null);
    if (!valid.length) return null;
    return (valid.reduce((s, d) => s + d.score, 0) / valid.length).toFixed(1);
  }, [last7]);

  const maxScore = Math.max(...last7.map(d => d.score || 0), 1);

  return (
    <div className="insights-screen">
      <div className="insights-header">
        <h1 className="insights-title">Insights</h1>
        <p className="insights-sub">Your mental wellness at a glance</p>
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
          marginBottom: '20px',
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
          <span style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: getMoodColor(currentMood.score),
          }}>
            {currentMood.score}
          </span>
        </div>
      )}

      {/* Stat row */}
      <div className="insights-stats">
        <div className="insight-stat">
          <span className="insight-stat__value">{streakDays}</span>
          <span className="insight-stat__label">Day streak</span>
        </div>
        <div className="insight-stat">
          <span className="insight-stat__value">{avgScore ?? '—'}</span>
          <span className="insight-stat__label">Avg mood (7d)</span>
        </div>
        <div className="insight-stat">
          <span className="insight-stat__value">{journalEntries.length}</span>
          <span className="insight-stat__label">Journal entries</span>
        </div>
      </div>

      {/* 7-day mood chart */}
      <div className="insight-card">
        <h2 className="insight-card__title">Mood this week</h2>
        {moodLog.length === 0 ? (
          <p className="insight-empty">No mood data yet — start tracking from the Home screen.</p>
        ) : (
          <div className="mood-chart">
            {last7.map((day, i) => (
              <div key={i} className="mood-chart__col">
                <div className="mood-chart__bar-wrap">
                  {day.score !== null ? (
                    <div
                      className="mood-chart__bar"
                      style={{
                        height: `${(day.score / maxScore) * 100}%`,
                        background: getMoodColor(day.score),
                      }}
                    />
                  ) : (
                    <div className="mood-chart__bar mood-chart__bar--empty" />
                  )}
                </div>
                <span className="mood-chart__day">{day.label}</span>
                {day.score !== null && (
                  <span className="mood-chart__score">{day.score}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Emotion breakdown */}
      <div className="insight-card">
        <h2 className="insight-card__title">Emotion patterns</h2>
        {emotionFreq.length === 0 ? (
          <p className="insight-empty">No entries yet — share your thoughts from the Home screen.</p>
        ) : (
          <div className="emotion-bars">
            {emotionFreq.map(({ name, pct }) => (
              <div key={name} className="emotion-bar-row">
                <span className="emotion-bar__name">{name}</span>
                <div className="emotion-bar__track">
                  <div
                    className="emotion-bar__fill"
                    style={{
                      width: `${pct}%`,
                      background: EMOTION_COLORS[name] || '#a78bfa',
                    }}
                  />
                </div>
                <span className="emotion-bar__pct">{pct}%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent journal snippets */}
      {journalEntries.length > 0 && (
        <div className="insight-card">
          <h2 className="insight-card__title">Recent reflections</h2>
          <div className="insight-journal-list">
            {journalEntries.slice(0, 3).map(entry => (
              <div key={entry.id} className="insight-journal-item">
                <div className="insight-journal-item__meta">
                  <span
                    className="insight-journal-item__dot"
                    style={{ background: EMOTION_COLORS[entry.dominantEmotion] || '#a78bfa' }}
                  />
                  <span className="insight-journal-item__date">{entry.date}</span>
                  <span className="insight-journal-item__emotion">{entry.dominantEmotion}</span>
                </div>
                <p className="insight-journal-item__text">
                  {entry.text.length > 100 ? entry.text.slice(0, 100) + '…' : entry.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
