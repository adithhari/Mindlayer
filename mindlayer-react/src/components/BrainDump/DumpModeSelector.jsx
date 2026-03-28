import React from 'react';

export default function DumpModeSelector({ mode, onChange }) {
  return (
    <div className="dump-mode-tabs">
      <button
        className={`mode-tab ${mode === 'dump' ? 'active' : ''}`}
        onClick={() => onChange('dump')}
      >
        Brain Dump
      </button>
      <button
        className={`mode-tab ${mode === 'journal' ? 'active' : ''}`}
        onClick={() => onChange('journal')}
      >
        Journal Entry
      </button>
    </div>
  );
}
