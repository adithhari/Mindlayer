import React, { useMemo } from 'react';

// Map slider value (0-100) to HSL hue
function sliderToHue(value) {
  if (value <= 50) {
    // Very unpleasant (0) → orange (h=20) to neutral → blue (h=220)
    return Math.round(20 + (value / 50) * 200);
  } else {
    // Neutral → blue (h=220) to very pleasant → green (h=145)
    return Math.round(220 - ((value - 50) / 50) * 75);
  }
}

// State-specific color overrides
const STATE_COLORS = {
  idle:       null,          // uses slider color
  listening:  { h: 195, s: 75, l: 63 }, // cool cyan
  processing: { h: 265, s: 70, l: 65 }, // purple (thinking)
  speaking:   null,          // uses analyzed mood color passed in
};

export default function OrbAssistant({ state = 'idle', sliderValue = 50, speakingHue = null }) {
  const color = useMemo(() => {
    const stateColor = STATE_COLORS[state];
    if (stateColor) return stateColor;
    if (state === 'speaking' && speakingHue !== null) {
      return { h: speakingHue, s: 80, l: 64 };
    }
    // idle: use slider value
    const h = sliderToHue(sliderValue);
    return { h, s: 78, l: 66 };
  }, [state, sliderValue, speakingHue]);

  const cssVars = {
    '--orb-h':       color.h,
    '--orb-s':       `${color.s}%`,
    '--orb-l':       `${color.l}%`,
    '--orb-l-light': `${color.l + 22}%`,
    '--orb-l-dark':  `${color.l - 18}%`,
  };

  return (
    <div className={`orb-container orb--${state}`} style={cssVars}>
      {/* Outer ambient glow */}
      <div className="orb-glow" />

      {/* Concentric rings */}
      <div className="orb-ring orb-ring--3" />
      <div className="orb-ring orb-ring--2" />
      <div className="orb-ring orb-ring--1" />

      {/* Core sphere */}
      <div className="orb-core">
        {/* Directional highlight for 3D look */}
        <div className="orb-highlight" />
        {/* Bottom depth shadow inside sphere */}
        <div className="orb-depth" />
        {/* Center dot */}
        <div className="orb-dot" />
      </div>
    </div>
  );
}
