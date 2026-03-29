# MindLayer 3D UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the CSS orb with a Three.js fluid shader sphere, add a hero splash animation, and redesign the mood slider as a 3D pill toggle.

**Architecture:** Three.js renders the orb via `@react-three/fiber` as a drop-in Canvas replacing the current CSS div orb. A `SplashScreen` component shows a large orb on app load that shrinks away, then the main app appears. The mood slider becomes a custom 5-segment pill component with 3D CSS depth.

**Tech Stack:** React 18, Vite, Three.js, @react-three/fiber, @react-three/drei, vanilla CSS custom properties

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/Orb/OrbScene.jsx` | **CREATE** | Three.js canvas: shader sphere + wave rings + glow halo |
| `src/components/Orb/OrbAssistant.jsx` | **MODIFY** | Remove CSS div structure, render `<OrbScene>` |
| `src/components/Splash/SplashScreen.jsx` | **CREATE** | Full-screen hero intro: large orb → shrinks → fades |
| `src/components/Home/MoodSlider.jsx` | **CREATE** | 3D pill segment slider (5 positions, -2 to +2) |
| `src/components/Home/Home.jsx` | **MODIFY** | Use `<MoodSlider>`, wire `sliderValue`/`onChange` |
| `src/App.jsx` | **MODIFY** | Add SplashScreen before Onboarding/main routing |
| `src/styles/index.css` | **MODIFY** | Remove old CSS orb rules, add MoodSlider + Splash styles |

---

## Task 1: Install Three.js dependencies

**Files:**
- Modify: `mindlayer-react/package.json` (via npm install)

- [ ] **Step 1: Install packages**

```bash
cd /Users/chiragdodia/Desktop/MindLayer/mindlayer-react
npm install three @react-three/fiber @react-three/drei
```

Expected output: `added N packages` with no errors.

- [ ] **Step 2: Verify build still works**

```bash
npm run build
```

Expected: `✓ built in ~Xs` with no errors.

---

## Task 2: Create OrbScene.jsx — Three.js 3D fluid sphere

**Files:**
- Create: `src/components/Orb/OrbScene.jsx`

This replaces the entire CSS-based orb. It contains:
1. GLSL vertex shader with simplex noise for organic blob deformation
2. Fragment shader with Fresnel + directional lighting for depth
3. `OrbMesh` — the main shader sphere
4. `WaveRings` — expanding ring pulses for listening/speaking
5. `GlowHalo` — large backside transparent sphere for the ambient glow
6. `OrbScene` export — Canvas wrapper with camera

- [ ] **Step 1: Create OrbScene.jsx**

Create `/Users/chiragdodia/Desktop/MindLayer/mindlayer-react/src/components/Orb/OrbScene.jsx` with this complete content:

```jsx
import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─── Slider hue mapping (matches old OrbAssistant logic) ──────────────────────
function sliderToHue(value) {
  if (value <= 50) return Math.round(20 + (value / 50) * 200);
  return Math.round(220 - ((value - 50) / 50) * 75);
}

function hslToColor(h, s, l) {
  return new THREE.Color().setHSL(h / 360, s / 100, l / 100);
}

// ─── GLSL Shaders ─────────────────────────────────────────────────────────────
const VERT = /* glsl */`
  uniform float uTime;
  uniform float uIntensity;
  varying vec3 vNormal;
  varying vec3 vPos;

  vec3 mod289v3(vec3 x) { return x - floor(x*(1./289.))*289.; }
  vec4 mod289v4(vec4 x) { return x - floor(x*(1./289.))*289.; }
  vec4 permute(vec4 x) { return mod289v4(((x*34.)+1.)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314*r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1./6., 1./3.);
    const vec4 D = vec4(0., .5, 1., 2.);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g  = step(x0.yzx, x0.xyz);
    vec3 l  = 1. - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289v3(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.,i1.z,i2.z,1.))
      + i.y + vec4(0.,i1.y,i2.y,1.))
      + i.x + vec4(0.,i1.x,i2.x,1.));
    float n_ = .142857142857;
    vec3  ns = n_*D.wyz - D.xzx;
    vec4 j  = p - 49.*floor(p*ns.z*ns.z);
    vec4 x_ = floor(j*ns.z);
    vec4 y_ = floor(j - 7.*x_);
    vec4 x  = x_*ns.x + ns.yyyy;
    vec4 y  = y_*ns.x + ns.yyyy;
    vec4 h  = 1. - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.+1.;
    vec4 s1 = floor(b1)*2.+1.;
    vec4 sh = -step(h, vec4(0.));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.);
    m = m*m;
    return 42.*dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }

  void main() {
    vNormal  = normal;
    vPos     = position;
    float n  = snoise(position * 2.0 + vec3(uTime * 0.35));
    vec3 pos = position + normal * n * uIntensity;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.);
  }
`;

const FRAG = /* glsl */`
  uniform vec3 uColorDark;
  uniform vec3 uColorMid;
  uniform vec3 uColorLight;
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vPos;

  void main() {
    vec3 light1 = normalize(vec3(1.2, 1.5, 2.0));
    vec3 light2 = normalize(vec3(-1., -0.5, 0.5));
    float diff1 = max(dot(vNormal, light1), 0.);
    float diff2 = max(dot(vNormal, light2), 0.) * 0.25;
    float fresnel = pow(1. - max(dot(vNormal, vec3(0.,0.,1.)), 0.), 2.5);
    vec3 col = mix(uColorDark, uColorMid, diff1);
    col = mix(col, uColorLight, fresnel * 0.7);
    col += uColorLight * diff2 * 0.15;
    // subtle highlight shimmer
    col += vec3(0.08) * pow(diff1, 8.);
    gl_FragColor = vec4(col, 1.);
  }
`;

// ─── Wave Rings (listening / speaking surroundings) ────────────────────────
function WaveRings({ active, color }) {
  const refs = [useRef(), useRef(), useRef()];
  const delays = [0, 0.55, 1.1];

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    refs.forEach((r, i) => {
      if (!r.current) return;
      const phase = ((t * 0.65 + delays[i]) % 2.0) / 2.0; // 0..1
      const scale = 1.15 + phase * 1.1;
      const opacity = active ? Math.max(0, (1 - phase) * 0.55) : Math.max(0, (1 - phase) * 0.12);
      r.current.scale.setScalar(scale);
      r.current.material.opacity = opacity;
    });
  });

  return (
    <>
      {refs.map((ref, i) => (
        <mesh key={i} ref={ref}>
          <torusGeometry args={[1, 0.018, 16, 120]} />
          <meshBasicMaterial color={color} transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

// ─── Glow Halo ────────────────────────────────────────────────────────────────
function GlowHalo({ color }) {
  return (
    <mesh scale={1.35}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.07}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─── Main Orb Mesh ────────────────────────────────────────────────────────────
function OrbMesh({ state, hsl }) {
  const meshRef = useRef();

  const uniforms = useMemo(() => ({
    uTime:       { value: 0 },
    uIntensity:  { value: 0.12 },
    uColorDark:  { value: new THREE.Color() },
    uColorMid:   { value: new THREE.Color() },
    uColorLight: { value: new THREE.Color() },
  }), []);

  useFrame((_, delta) => {
    uniforms.uTime.value += delta;

    // target intensity per state
    const intensityMap = { idle: 0.10, listening: 0.24, processing: 0.16, speaking: 0.22 };
    const targetIntensity = intensityMap[state] ?? 0.12;
    uniforms.uIntensity.value += (targetIntensity - uniforms.uIntensity.value) * 0.04;

    // update colors
    const [h, s, l] = hsl;
    uniforms.uColorDark.value.setHSL(h/360, s/100, Math.max((l - 18) / 100, 0));
    uniforms.uColorMid.value.setHSL(h/360, s/100, l / 100);
    uniforms.uColorLight.value.setHSL(h/360, (s - 10) / 100, Math.min((l + 24) / 100, 1));

    // rotation
    if (meshRef.current) {
      const speed = state === 'processing' ? 1.2 : state === 'speaking' ? 0.35 : 0.12;
      meshRef.current.rotation.y += delta * speed;
      meshRef.current.rotation.x += delta * 0.04;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 96, 96]} />
      <shaderMaterial
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
      />
    </mesh>
  );
}

// ─── Scene contents (inside Canvas) ──────────────────────────────────────────
function SceneContents({ state, hsl }) {
  const waveActive = state === 'listening' || state === 'speaking';
  const glowColor = new THREE.Color().setHSL(hsl[0]/360, hsl[1]/100, hsl[2]/100);

  return (
    <>
      <OrbMesh state={state} hsl={hsl} />
      <WaveRings active={waveActive} color={glowColor} />
      <GlowHalo color={glowColor} />
    </>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────
export default function OrbScene({ state = 'idle', sliderValue = 50, speakingHue = null }) {
  const hsl = useMemo(() => {
    if (state === 'listening')  return [195, 72, 60];
    if (state === 'processing') return [265, 68, 62];
    if (state === 'speaking' && speakingHue !== null) return [speakingHue, 78, 62];
    return [sliderToHue(sliderValue), 76, 64];
  }, [state, sliderValue, speakingHue]);

  return (
    <Canvas
      style={{ width: '100%', height: '100%' }}
      camera={{ position: [0, 0, 3.2], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      dpr={Math.min(window.devicePixelRatio, 2)}
    >
      <SceneContents state={state} hsl={hsl} />
    </Canvas>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/chiragdodia/Desktop/MindLayer/mindlayer-react && npm run build
```

Expected: `✓ built in ~Xs` — no errors.

---

## Task 3: Replace OrbAssistant.jsx to use OrbScene

**Files:**
- Modify: `src/components/Orb/OrbAssistant.jsx`

OrbAssistant is imported in Home.jsx with props `state`, `sliderValue`, `speakingHue`. We keep that interface but render OrbScene inside a sized container instead of the old CSS div structure.

- [ ] **Step 1: Rewrite OrbAssistant.jsx**

Replace the entire file content with:

```jsx
import OrbScene from './OrbScene';

export default function OrbAssistant({ state = 'idle', sliderValue = 50, speakingHue = null }) {
  return (
    <div className="orb-container">
      <OrbScene state={state} sliderValue={sliderValue} speakingHue={speakingHue} />
    </div>
  );
}
```

- [ ] **Step 2: Update orb-container CSS**

In `src/styles/index.css`, find the `.orb-container` block and replace it. Also remove all the old `.orb-glow`, `.orb-ring`, `.orb-core`, `.orb-highlight`, `.orb-depth`, `.orb-dot`, `.orb--*` state blocks, and all the related keyframes (`orb-breathe`, `ring-breathe`, `glow-breathe`, `orb-pulse`, `glow-pulse`, `ring-ripple`, `ring-rotate`, `orb-spin-breathe`, `orb-glow-pulse`) because Three.js now handles all animation.

Replace from `/* ─── Orb Component ──` through to just before `/* ─── Orb State Label ──` with:

```css
/* ─── Orb Component (Three.js canvas) ───────────────────────────────────────── */
.orb-container {
  position: relative;
  width: 260px;
  height: 260px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
}
```

Also remove the old `@property` declarations at the top of the CSS for `--orb-h`, `--orb-s`, `--orb-l` since Three.js owns color now:

```css
/* DELETE these 3 lines: */
@property --orb-h { syntax: '<number>';     inherits: true; initial-value: 25;   }
@property --orb-s { syntax: '<percentage>'; inherits: true; initial-value: 78%;  }
@property --orb-l { syntax: '<percentage>'; inherits: true; initial-value: 66%;  }
```

- [ ] **Step 3: Verify build and check browser**

```bash
npm run build
```

Then open `http://localhost:3001` — the orb should render as a 3D fluid sphere.

---

## Task 4: Create MoodSlider.jsx — 3D pill segment design

**Files:**
- Create: `src/components/Home/MoodSlider.jsx`
- Modify: `src/components/Home/Home.jsx`
- Modify: `src/styles/index.css`

The design: a dark pill-shaped track with 5 raised pill segments. The active segment glows in mood-appropriate color with a 3D raised look (box-shadow layers, subtle top highlight). Inactive segments are recessed/dark.

Mood colors per score:
- `-2` → `#ef4444` (red)
- `-1` → `#f97316` (orange)
- `0`  → `#64748b` (slate)
- `+1` → `#a78bfa` (purple)
- `+2` → `#4ade80` (green)

- [ ] **Step 1: Create MoodSlider.jsx**

Create `/Users/chiragdodia/Desktop/MindLayer/mindlayer-react/src/components/Home/MoodSlider.jsx`:

```jsx
const SEGMENTS = [
  { score: -2, label: 'Very\nNegative', color: '#ef4444' },
  { score: -1, label: 'Negative',       color: '#f97316' },
  { score:  0, label: 'Neutral',         color: '#64748b' },
  { score:  1, label: 'Positive',        color: '#a78bfa' },
  { score:  2, label: 'Very\nPositive',  color: '#4ade80' },
];

// Map 0-100 slider value to score
function toScore(value) {
  if (value <= 15) return -2;
  if (value <= 35) return -1;
  if (value <= 60) return  0;
  if (value <= 80) return  1;
  return 2;
}

// Map score to canonical slider position
const SCORE_TO_VALUE = { '-2': 8, '-1': 25, '0': 50, '1': 70, '2': 92 };

export default function MoodSlider({ value, onChange }) {
  const activeScore = toScore(value);
  const activeSeg = SEGMENTS.find(s => s.score === activeScore);

  return (
    <div className="mood-pill-wrap">
      <div className="mood-pill-score">
        <span className="mood-pill-score__num" style={{ color: activeSeg.color }}>
          {activeScore > 0 ? `+${activeScore}` : activeScore}
        </span>
        <span className="mood-pill-score__label">{activeSeg.label.replace('\n', ' ')}</span>
      </div>

      <div className="mood-pill-track">
        {SEGMENTS.map(({ score, label, color }) => {
          const isActive = score === activeScore;
          return (
            <button
              key={score}
              className={`mood-pill-seg ${isActive ? 'mood-pill-seg--active' : ''}`}
              style={isActive ? {
                '--pill-color': color,
                '--pill-color-dark': color,
              } : {}}
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
```

- [ ] **Step 2: Add MoodSlider CSS to index.css**

Add this block after the existing `/* ─── Mood Slider ──` section (or replace it entirely):

```css
/* ─── Mood Slider (3D pill) ──────────────────────────────────────────────────── */
.mood-pill-wrap {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  margin-bottom: 24px;
}

.mood-pill-score {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.mood-pill-score__num {
  font-size: 30px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -1px;
  transition: color 0.3s;
}
.mood-pill-score__label {
  font-size: 14px;
  color: var(--text2);
  font-weight: 500;
}

/* The outer dark pill track — recessed (inner shadow = pushed in) */
.mood-pill-track {
  width: 100%;
  display: flex;
  gap: 5px;
  background: #080b12;
  border-radius: 50px;
  padding: 5px;
  box-shadow:
    inset 0 2px 8px rgba(0,0,0,0.7),
    inset 0 1px 3px rgba(0,0,0,0.5),
    0 1px 0 rgba(255,255,255,0.04);
}

/* Individual pill segments */
.mood-pill-seg {
  flex: 1;
  height: 44px;
  border: none;
  border-radius: 40px;
  cursor: pointer;
  background: transparent;
  color: var(--text3);
  font-family: inherit;
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  line-height: 1.2;
  transition: transform 0.15s, box-shadow 0.2s, background 0.2s, color 0.2s;
  position: relative;
  white-space: pre-line;
  text-align: center;
}
.mood-pill-seg:hover:not(.mood-pill-seg--active) {
  background: rgba(255,255,255,0.04);
  color: var(--text2);
}

/* Active pill — raised 3D look */
.mood-pill-seg--active {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--pill-color) 70%, white 30%) 0%,
    var(--pill-color) 45%,
    color-mix(in srgb, var(--pill-color) 70%, black 30%) 100%
  );
  color: #fff;
  transform: translateY(-2px);
  box-shadow:
    0 6px 16px color-mix(in srgb, var(--pill-color) 60%, transparent),
    0 3px 6px rgba(0,0,0,0.4),
    0 1px 0 rgba(255,255,255,0.2) inset,
    0 -1px 0 rgba(0,0,0,0.3) inset;
}
.mood-pill-seg__label { pointer-events: none; }
```

- [ ] **Step 3: Update Home.jsx to use MoodSlider**

In `src/components/Home/Home.jsx`:

1. Add import at top:
```jsx
import MoodSlider from './MoodSlider';
```

2. Replace the entire `{/* Mood Slider */}` section (the div with className `mood-slider-section`) with:
```jsx
{/* Mood Slider */}
<MoodSlider value={sliderValue} onChange={setSliderValue} />
```

3. Remove the `MOOD_SCALE` array and `getMoodScore` function from Home.jsx since they now live in MoodSlider.jsx. Keep only `getMoodLabel` for the API call (or import from MoodSlider if you extract it).

Actually — keep `getMoodScore` and `getMoodLabel` in Home.jsx since they're still used for the `moodLabel` variable that goes to `analyzeEntry()`. Only the rendering moves to MoodSlider.

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: clean build, no errors.

---

## Task 5: Create SplashScreen.jsx — hero intro animation

**Files:**
- Create: `src/components/Splash/SplashScreen.jsx`
- Modify: `src/styles/index.css`

The flow:
1. Full-screen dark screen with a large Three.js orb (scale ~2.2 via camera position)
2. "MindLayer" title fades in at 0.4s
3. At t=1.8s: start exit — the splash div gets class `splash--exit` (CSS opacity 0 + scale down)
4. At t=2.6s: call `onComplete()`

The orb in the splash uses the same `OrbScene` component but in a full-viewport container.

- [ ] **Step 1: Create SplashScreen.jsx**

Create `/Users/chiragdodia/Desktop/MindLayer/mindlayer-react/src/components/Splash/SplashScreen.jsx`:

```jsx
import { useEffect, useState } from 'react';
import OrbScene from '../Orb/OrbScene';

export default function SplashScreen({ onComplete }) {
  const [phase, setPhase] = useState('enter'); // 'enter' | 'exit'

  useEffect(() => {
    const exitTimer = setTimeout(() => setPhase('exit'), 1800);
    const doneTimer = setTimeout(() => onComplete(), 2700);
    return () => { clearTimeout(exitTimer); clearTimeout(doneTimer); };
  }, [onComplete]);

  return (
    <div className={`splash-screen splash--${phase}`}>
      <div className="splash-orb">
        <OrbScene state="idle" sliderValue={50} speakingHue={null} />
      </div>
      <div className="splash-text">
        <h1 className="splash-title">MindLayer</h1>
        <p className="splash-sub">Your mental clarity companion</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add SplashScreen CSS to index.css**

Add before the `/* ─── Onboarding ──` block:

```css
/* ─── Splash / Hero Intro ────────────────────────────────────────────────────── */
.splash-screen {
  position: fixed;
  inset: 0;
  background: var(--bg1);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 32px;
  z-index: 500;
  transition: opacity 0.7s ease, transform 0.7s ease;
}

.splash--enter {
  opacity: 1;
  transform: scale(1);
}

.splash--exit {
  opacity: 0;
  transform: scale(1.06);
  pointer-events: none;
}

.splash-orb {
  width: 300px;
  height: 300px;
  border-radius: 50%;
  overflow: hidden;
  animation: splash-orb-enter 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes splash-orb-enter {
  from { transform: scale(0.4); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}

.splash-text {
  text-align: center;
  animation: fade-up 0.6s ease 0.4s both;
}

.splash-title {
  font-size: 36px;
  font-weight: 700;
  background: linear-gradient(135deg, #c4b5fd, #a78bfa, #818cf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -1px;
  margin-bottom: 6px;
}

.splash-sub {
  font-size: 14px;
  color: var(--text3);
  font-weight: 400;
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: clean build.

---

## Task 6: Wire SplashScreen into App.jsx

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Update App.jsx**

Replace the entire content of `src/App.jsx` with:

```jsx
import { useState } from 'react';
import { useApp } from './context/AppContext';
import Navigation from './components/Navigation/Navigation';
import Home from './components/Home/Home';
import Journal from './components/Journal/Journal';
import Tracker from './components/Tracker/Tracker';
import Onboarding from './components/Onboarding/Onboarding';
import SplashScreen from './components/Splash/SplashScreen';

function App() {
  const { activeScreen, setActiveScreen, userProfile } = useApp();
  const [splashDone, setSplashDone] = useState(false);

  if (!splashDone) return <SplashScreen onComplete={() => setSplashDone(true)} />;
  if (!userProfile) return <Onboarding />;

  const renderScreen = () => {
    switch (activeScreen) {
      case 'home':     return <Home />;
      case 'insights': return <Tracker />;
      case 'journal':  return <Journal />;
      default:         return <Home />;
    }
  };

  return (
    <div className="mindlayer-app">
      <main className="screen-container">
        {renderScreen()}
      </main>
      <Navigation activeScreen={activeScreen} onScreenChange={setActiveScreen} />
    </div>
  );
}

export default App;
```

- [ ] **Step 2: Final build verification**

```bash
cd /Users/chiragdodia/Desktop/MindLayer/mindlayer-react && npm run build
```

Expected: `✓ built in ~Xs`, no errors.

- [ ] **Step 3: Test in browser**

Open `http://localhost:3001` and verify:
1. Splash screen appears — large orb bounces in, "MindLayer" text fades in
2. After ~2s, splash fades out
3. Onboarding appears (if no profile) or Home appears (if profile exists)
4. Home shows the 3D fluid sphere orb
5. Moving the mood slider changes the orb color
6. Clicking the orb starts voice recording — wave rings emit from the orb
7. Submitting text shows processing (fast spinning), then speaking (wave rings pulse)
8. The mood pill track shows 5 raised/recessed segments, active one glows

---

## Self-Review

### Spec coverage
- ✅ Three.js 3D orb with fluid shader → Task 2
- ✅ Wave ring surroundings when listening → Task 2 (WaveRings, active when listening/speaking)
- ✅ Wave ring surroundings when speaking → Task 2 (WaveRings, active when listening/speaking)
- ✅ Chat output: only insight + try this now → already done in Home.jsx (no change needed)
- ✅ 3D pill mood slider → Task 4
- ✅ Hero splash: big orb → shrinks/fades → home → Task 5 + 6

### Placeholder scan
- No TBD, TODO, or "implement later" entries found.
- All code blocks are complete.

### Type consistency
- `OrbScene` props: `state`, `sliderValue`, `speakingHue` — used consistently in OrbAssistant, SplashScreen
- `MoodSlider` props: `value`, `onChange` — used in Home.jsx
- `SplashScreen` props: `onComplete` — called in App.jsx
- `WaveRings` `active` boolean — set based on `state === 'listening' || state === 'speaking'`
