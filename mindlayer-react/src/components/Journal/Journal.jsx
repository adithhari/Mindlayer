import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import JournalModal from './JournalModal';

const EMOTION_COLORS = {
  anxiety:    '#f97316',
  sadness:    '#818cf8',
  anger:      '#ef4444',
  overwhelm:  '#fb923c',
  neutral:    '#64748b',
  positive:   '#4ade80',
  grief:      '#6366f1',
  loneliness: '#8b5cf6',
};

function getEmotionColor(emotion) {
  return EMOTION_COLORS[emotion?.toLowerCase()] || '#a78bfa';
}

// ── Journal entry card (existing behaviour) ────────────────────────────────────
function JournalCard({ entry, onClick }) {
  const color = getEmotionColor(entry.dominantEmotion);
  const emotion = entry.dominantEmotion || 'neutral';

  return (
    <div className="journal-card" onClick={onClick} style={{ '--emotion-color': color }}>
      <div className="journal-card__top">
        <span className="journal-card__emotion" style={{ color }}>{emotion}</span>
        <span className="journal-card__date">{entry.date} · {entry.time}</span>
      </div>
      {entry.title && <p className="journal-card__title">{entry.title}</p>}
      <p className="journal-card__text">{entry.text}</p>
      {entry.summary && <p className="journal-card__summary">{entry.summary}</p>}
    </div>
  );
}

// ── Voice transcript card ──────────────────────────────────────────────────────
function TranscriptCard({ entry, onClick }) {
  const msgCount = entry.messages?.length ?? 0;
  const firstUser = entry.messages?.find(m => m.role === 'user')?.text || '';

  return (
    <div className="journal-card transcript-card" onClick={onClick}>
      <div className="journal-card__top">
        <span className="transcript-badge">voice</span>
        <span className="journal-card__date">{entry.date} · {entry.time}</span>
      </div>
      {firstUser && (
        <p className="journal-card__text" style={{ fontStyle: 'italic' }}>
          "{firstUser.length > 120 ? firstUser.slice(0, 120) + '…' : firstUser}"
        </p>
      )}
      <p className="journal-card__summary">{msgCount} message{msgCount !== 1 ? 's' : ''}</p>
    </div>
  );
}

// ── Transcript detail modal ────────────────────────────────────────────────────
function TranscriptModal({ entry, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card transcript-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Conversations With MindFlyer</h2>
          <span className="modal-date">{entry.date} · {entry.time}</span>
        </div>
        <div className="conversation-container">
          {entry.messages.map((msg, i) => (
            <div 
              key={i} 
              className={`chat-message ${msg.role === 'user' ? 'chat-message--user' : 'chat-message--ai'}`}
            >
              <div className="chat-bubble">
                {msg.text}
              </div>
            </div>
          ))}
        </div>
        <button className="modal-btn modal-btn--ghost" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

// ── Main Journal screen ────────────────────────────────────────────────────────
export default function Journal() {
  const { journalEntries, voiceTranscripts, moodLog } = useApp();
  const [tab, setTab] = useState('journal'); // 'journal' | 'transcripts'
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [selectedTranscript, setSelectedTranscript] = useState(null);

  // Get the current mood from the latest mood log entry
  const currentMood = moodLog.length > 0 ? moodLog[moodLog.length - 1] : null;

  const getMoodColor = (score) => {
    if (score <= -1.5) return '#ef4444'; // red
    if (score < -0.5) return '#f97316'; // orange
    if (score < 0.5) return '#64748b'; // gray
    if (score < 1.5) return '#a78bfa'; // purple
    return '#4ade80'; // green
  };

  const getMoodLabel = (score) => {
    if (score <= -1.5) return 'Very Negative';
    if (score < -0.5) return 'Negative';
    if (score < 0.5) return 'Neutral';
    if (score < 1.5) return 'Positive';
    return 'Very Positive';
  };

  return (
    <div className="journal-screen">
      <div className="journal-header">
        <h1 className="journal-title">Journal</h1>
        {currentMood && (
          <div className="current-mood-indicator" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '8px',
            backgroundColor: 'rgba(0, 0, 0, 0.03)',
            marginTop: '12px',
          }}>
            <span style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: getMoodColor(currentMood.score),
            }} />
            <span style={{
              fontSize: '13px',
              fontWeight: '500',
              color: getMoodColor(currentMood.score),
            }}>
              Current mood: {getMoodLabel(currentMood.score)}
            </span>
            <span style={{
              fontSize: '12px',
              color: '#666',
              marginLeft: 'auto',
            }}>
              {new Date(currentMood.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="journal-tabs">
        <button
          className={`journal-tab ${tab === 'journal' ? 'journal-tab--active' : ''}`}
          onClick={() => setTab('journal')}
        >
          Entries
          <span className="journal-tab__count">{journalEntries.length}</span>
        </button>
        <button
          className={`journal-tab ${tab === 'transcripts' ? 'journal-tab--active' : ''}`}
          onClick={() => setTab('transcripts')}
        >
          Conversations
          <span className="journal-tab__count">{voiceTranscripts.length}</span>
        </button>
      </div>

      {/* ── Journal Entries tab ── */}
      {tab === 'journal' && (
        journalEntries.length === 0 ? (
          <div className="journal-empty">
            <span className="journal-empty__icon">📔</span>
            <p className="journal-empty__head">Nothing here yet</p>
            <p className="journal-empty__body">
              Share your thoughts on the Home screen, or allow saving after a voice conversation.
            </p>
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
        )
      )}

      {/* ── Conversations tab ── */}
      {tab === 'transcripts' && (
        voiceTranscripts.length === 0 ? (
          <div className="journal-empty">
            <span className="journal-empty__icon">🎙</span>
            <p className="journal-empty__head">No conversations yet</p>
            <p className="journal-empty__body">
              Tap the orb on the Home screen to start a voice conversation — it's saved here automatically.
            </p>
          </div>
        ) : (
          <div className="journal-list">
            {voiceTranscripts.map(entry => (
              <TranscriptCard
                key={entry.id}
                entry={entry}
                onClick={() => setSelectedTranscript(entry)}
              />
            ))}
          </div>
        )
      )}

      {selectedEntry && (
        <JournalModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      )}
      {selectedTranscript && (
        <TranscriptModal entry={selectedTranscript} onClose={() => setSelectedTranscript(null)} />
      )}
    </div>
  );
}
