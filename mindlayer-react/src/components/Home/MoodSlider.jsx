const SEGMENTS = [
  { score: -2, label: 'Very\nNegative', color: '#ef4444' },
  { score: -1, label: 'Negative',       color: '#f97316' },
  { score:  0, label: 'Neutral',         color: '#64748b' },
  { score:  1, label: 'Positive',        color: '#a78bfa' },
  { score:  2, label: 'Very\nPositive',  color: '#4ade80' },
];

function toScore(value) {
  if (value <= 15) return -2;
  if (value <= 35) return -1;
  if (value <= 60) return  0;
  if (value <= 80) return  1;
  return 2;
}

const SCORE_TO_VALUE = { '-2': 8, '-1': 25, '0': 50, '1': 70, '2': 92 };

export default function MoodSlider({ value, onChange }) {
  const activeScore = toScore(value);
  const activeSeg = SEGMENTS.find(s => s.score === activeScore);

  return (
    <div className="mood-pill-wrap">
      <div className="mood-pill-score">
        {/* <span className="mood-pill-score__num" style={{ color: activeSeg.color }}>
          {activeScore > 0 ? `+${activeScore}` : activeScore}
        </span> */}
        <span className="mood-pill-score__label">{activeSeg.label.replace('\n', ' ')}</span>
      </div>

      <div className="mood-pill-track">
        {SEGMENTS.map(({ score, label, color }) => {
          const isActive = score === activeScore;
          return (
            <button
              key={score}
              className={`mood-pill-seg ${isActive ? 'mood-pill-seg--active' : ''}`}
              style={isActive ? { '--pill-color': color } : {}}
              onClick={() => onChange(SCORE_TO_VALUE[score])}
              title={label.replace('\n', ' ')}
            >
              <span className="mood-pill-seg__label">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
