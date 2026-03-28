import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { emotionColor } from '../../utils/api';

export default function JournalModal({ entry, onClose }) {
  const { updateJournalEntry, deleteJournalEntry } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(entry.text);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const dominantEmotion = entry.dominantEmotion || 'neutral';
  const emotionColorStr = emotionColor(dominantEmotion);

  const handleSave = () => {
    updateJournalEntry(entry.id, { text: editText });
    setIsEditing(false);
  };

  const handleDelete = () => {
    deleteJournalEntry(entry.id);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg2)',
          borderRadius: 'var(--radius)',
          maxWidth: '700px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px',
            background: `${emotionColorStr}15`,
            borderBottom: `1px solid ${emotionColorStr}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'start'
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '12px',
              fontWeight: 600,
              color: emotionColorStr,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '8px'
            }}>
              {entry.date} • {entry.time}
            </div>
            {entry.title && (
              <div style={{
                fontSize: '20px',
                fontWeight: 700,
                color: emotionColorStr,
                marginBottom: '8px',
                lineHeight: '1.3'
              }}>
                {entry.title}
              </div>
            )}
            <div style={{
              fontSize: '14px',
              fontWeight: 600,
              color: emotionColorStr,
              textTransform: 'capitalize'
            }}>
              {dominantEmotion}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text2)',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {/* Summary */}
          {entry.summary && (
            <div style={{
              marginBottom: '24px',
              padding: '16px',
              background: 'var(--bg3)',
              borderLeft: `3px solid ${emotionColorStr}`,
              borderRadius: 'var(--radius-sm)'
            }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text2)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '8px'
              }}>
                Summary
              </div>
              <p style={{
                fontSize: '13px',
                color: 'var(--text)',
                margin: 0,
                fontStyle: 'italic'
              }}>
                {entry.summary}
              </p>
            </div>
          )}

          {/* Top Emotions */}
          {entry.emotions && entry.emotions.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text2)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '12px'
              }}>
                Emotions Detected
              </div>
              <div style={{
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap'
              }}>
                {entry.emotions.map((emotion, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '6px 12px',
                      background: `${emotionColorStr}15`,
                      color: emotionColorStr,
                      borderRadius: '16px',
                      fontSize: '12px',
                      fontWeight: 500,
                      border: `1px solid ${emotionColorStr}`
                    }}
                  >
                    {emotion.name} ({Math.round(emotion.score * 100)}%)
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Journal Text */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text2)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '12px'
            }}>
              Your Entry
            </div>
            {isEditing ? (
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '300px',
                  padding: '16px',
                  background: 'var(--bg3)',
                  border: `1px solid ${emotionColorStr}`,
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text)',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            ) : (
              <div style={{
                padding: '16px',
                background: 'var(--bg3)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text)',
                fontSize: '14px',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {editText}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}>
            {showDeleteConfirm ? (
              <>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    padding: '10px 20px',
                    background: 'var(--bg3)',
                    border: '1px solid var(--text3)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  style={{
                    padding: '10px 20px',
                    background: '#f87171',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600
                  }}
                >
                  Delete Entry
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{
                    padding: '10px 20px',
                    background: 'transparent',
                    border: '1px solid #f87171',
                    borderRadius: 'var(--radius-sm)',
                    color: '#f87171',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600
                  }}
                >
                  🗑️ Delete
                </button>

                {isEditing ? (
                  <>
                    <button
                      onClick={() => {
                        setEditText(entry.text);
                        setIsEditing(false);
                      }}
                      style={{
                        padding: '10px 20px',
                        background: 'var(--bg3)',
                        border: '1px solid var(--text3)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text)',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 600
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      style={{
                        padding: '10px 20px',
                        background: emotionColorStr,
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 600
                      }}
                    >
                      Save Changes
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    style={{
                      padding: '10px 20px',
                      background: emotionColorStr,
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 600
                    }}
                  >
                    ✏️ Edit
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
