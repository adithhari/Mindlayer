import React from 'react';

export default function Streak({ days }) {
  return (
    <div className="streak-badge">
      <span className="streak-icon">🔥</span>
      <div>
        <div className="streak-count">{days}</div>
        <div className="streak-label">day streak</div>
      </div>
    </div>
  );
}
