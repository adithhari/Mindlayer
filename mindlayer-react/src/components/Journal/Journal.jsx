import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import JournalModal from './JournalModal';

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

function getEmotionColor(emotion) {
  return EMOTION_COLORS[emotion?.toLowerCase()] || '#a78bfa';
}

export default function Journal() {
  const { journalEntries } = useApp();
  const [selectedEntry, setSelectedEntry] = useState(null);

  return (
    <div className="journal-screen">
      <div className="journal-header">
        <h1 className="journal-title">Journal</h1>
        <p className="journal-sub">{journalEntries.length} {journalEntries.length === 1 ? 'entry' : 'entries'}</p>
      </div>

      {journalEntries.length === 0 ? (
        <div className="journal-empty">
          <span className="journal-empty__icon">📔</span>
          <p className="journal-empty__head">Nothing here yet</p>
          <p className="journal-empty__body">Share your thoughts on the Home screen — they'll appear here.</p>
        </div>
      ) : (
        <div className="journal-list">
          {journalEntries.map(entry => (
            <JournalCard
              key={entry.id}
              entry={entry}
              onClick={() => setSelectedEntry(entry)}
            />
          ))}
        </div>
      )}

      {selectedEntry && (
        <JournalModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      )}
    </div>
  );
}

function JournalCard({ entry, onClick }) {
  const color = getEmotionColor(entry.dominantEmotion);
  const emotion = entry.dominantEmotion || 'neutral';

  return (
    <div className="journal-card" onClick={onClick} style={{ '--emotion-color': color }}>
      <div className="journal-card__top">
        <span className="journal-card__emotion" style={{ color }}>
          {emotion}
        </span>
        <span className="journal-card__date">{entry.date} · {entry.time}</span>
      </div>
      {entry.title && (
        <p className="journal-card__title">{entry.title}</p>
      )}
      <p className="journal-card__text">{entry.text}</p>
      {entry.summary && (
        <p className="journal-card__summary">{entry.summary}</p>
      )}
    </div>
  );
}
