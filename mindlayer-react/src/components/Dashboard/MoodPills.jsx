import React, { useState } from 'react';

export default function MoodPills({ onMoodSelect }) {
  const moods = [
    { mood: 'frustrated', score: 3, emoji: '😤' },
    { mood: 'sad', score: 4, emoji: '😢' },
    { mood: 'okay', score: 5, emoji: '😐' },
    { mood: 'good', score: 7, emoji: '🙂' },
    { mood: 'great', score: 9, emoji: '😄' }
  ];

  const [selected, setSelected] = useState(null);

  const handleSelect = (mood, score) => {
    setSelected(mood);
    onMoodSelect(mood, score);
  };

  return (
    <div className="mood-pills">
      {moods.map(({ mood, score, emoji }) => (
        <button
          key={mood}
          className={`mood-pill ${selected === mood ? 'selected' : ''}`}
          data-mood={mood}
          data-score={score}
          onClick={() => handleSelect(mood, score)}
        >
          <span className="mood-emoji">{emoji}</span>
          <span className="mood-label">{mood}</span>
        </button>
      ))}
    </div>
  );
}
