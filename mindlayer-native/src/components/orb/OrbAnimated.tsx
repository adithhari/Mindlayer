import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  CONNS, N_PTS, N_CONN, HUB,
  getMoodHSL, heartbeatPulse, projectPoints,
} from './orbUtils';

export type OrbState = 'idle' | 'listening' | 'processing' | 'speaking';

interface Props {
  state?: OrbState;
  sliderValue?: number;
  speakingHue?: number | null;
  size?: number;
}

interface OrbPaths {
  linePaths: string[];   // 5 depth buckets
  dotPaths: string[];    // 5 depth buckets
  hue: number;
  sat: number;
  glowV: number;
  ampColorV: number;
}

const LS = 0.07; // lerp speed

function buildPathsForFrame(
  state: OrbState,
  sliderValue: number,
  speakingHue: number | null,
  sz: number,
  ctx: {
    t: number;
    curH: number; curS: number; curL: number;
    rotSpeedV: number; radiusV: number; scaleYV: number;
    ampColorV: number; glowV: number;
    rotYacc: number; rotXV: number;
    ampSmooth: number;
  },
  dt: number,
): OrbPaths {
  const cx = sz / 2, cy = sz / 2, D = sz;

  const cur = state;
  const amp = ctx.ampSmooth;

  // Per-state targets
  let tRotSpd = 0.14, tRadius = D * 0.43, tScaleY = 1, tAmpC = 0, tGlow = 0;

  if (cur === 'idle') {
    tRotSpd = 0.12;
    tRadius = D * (0.43 + Math.sin(ctx.t * 0.9) * 0.012);
  } else if (cur === 'listening') {
    tRotSpd = 0.18 + amp * 0.55;
    tRadius = D * (0.43 + amp * 0.09);
    tAmpC = amp; tGlow = amp;
  } else if (cur === 'processing') {
    const hb = heartbeatPulse(ctx.t / 1.25);
    tRotSpd = 0.13 + hb * 0.18;
    tRadius = D * (0.43 + hb * 0.13);
    tAmpC = hb * 0.70; tGlow = hb * 0.90;
  } else if (cur === 'speaking') {
    const speechDrive =
      Math.abs(Math.sin(ctx.t * 3.8)) * 0.55 +
      Math.abs(Math.sin(ctx.t * 7.2)) * 0.28 +
      Math.abs(Math.sin(ctx.t * 2.1)) * 0.17;
    const drive = Math.max(speechDrive * 0.07, amp * 0.11);
    tRotSpd = 0.22 + speechDrive * 0.28 + amp * 0.35;
    tRadius = D * (0.43 + drive);
    tAmpC = Math.max(speechDrive * 0.55, amp * 0.90);
    tGlow = Math.max(speechDrive * 0.45, amp * 0.80);
  }

  ctx.rotSpeedV += (tRotSpd - ctx.rotSpeedV) * LS;
  ctx.radiusV   += (tRadius - ctx.radiusV) * LS;
  ctx.scaleYV   += (tScaleY - ctx.scaleYV) * LS;
  ctx.ampColorV += (tAmpC - ctx.ampColorV) * LS;
  ctx.glowV     += (tGlow - ctx.glowV) * LS;

  ctx.rotYacc += ctx.rotSpeedV * dt;
  ctx.rotXV = 0.30 + Math.sin(ctx.t * 0.06) * 0.18;

  // Mood color
  const [tH, tS, tL] = getMoodHSL(sliderValue);
  let hd = tH - ctx.curH;
  if (hd > 180) hd -= 360;
  if (hd < -180) hd += 360;
  ctx.curH = (ctx.curH + hd * 0.08 + 360) % 360;
  ctx.curS += (tS - ctx.curS) * 0.08;
  ctx.curL += (tL - ctx.curL) * 0.08;

  let h = ctx.curH, s = ctx.curS;
  if (cur === 'speaking' && speakingHue !== null) {
    h = speakingHue; s = Math.max(s, 68);
  }
  const sB = Math.min(s + ctx.ampColorV * 34, 100);

  // Project all points
  const { px, py, depth } = projectPoints(ctx.rotYacc, ctx.rotXV, ctx.radiusV, cx, cy, ctx.scaleYV);

  // Build 5 line bucket paths
  const lineBuckets: string[] = ['', '', '', '', ''];
  for (let c = 0; c < N_CONN; c++) {
    const ci = Math.floor(CONNS[c * 3]);
    const cj = Math.floor(CONNS[c * 3 + 1]);
    const avgD = (depth[ci] + depth[cj]) * 0.5;
    const b = Math.min(4, Math.floor(avgD * 5));
    lineBuckets[b] += `M${px[ci].toFixed(1)},${py[ci].toFixed(1)}L${px[cj].toFixed(1)},${py[cj].toFixed(1)}`;
  }

  // Build 5 dot bucket paths (arcs)
  const dotBuckets: string[] = ['', '', '', '', ''];
  for (let i = 0; i < N_PTS; i++) {
    const d = depth[i];
    if (d < 0.05) continue;
    const b = Math.min(4, Math.floor(d * 5));
    const frac = b / 4;
    const dotR = ((0.8 + frac * 1.4) * HUB[i]).toFixed(2);
    const r = parseFloat(dotR);
    const x = px[i], y = py[i];
    // SVG arc circle: two arcs
    dotBuckets[b] += `M${(x - r).toFixed(1)},${y.toFixed(1)}a${r},${r},0,1,0,${(2 * r).toFixed(1)},0a${r},${r},0,1,0,${(-2 * r).toFixed(1)},0`;
  }

  return {
    linePaths: lineBuckets,
    dotPaths: dotBuckets,
    hue: h,
    sat: sB,
    glowV: ctx.glowV,
    ampColorV: ctx.ampColorV,
  };
}

export default function OrbAnimated({ state = 'idle', sliderValue = 50, speakingHue = null, size = 280 }: Props) {
  const [paths, setPaths] = useState<OrbPaths>({
    linePaths: ['', '', '', '', ''],
    dotPaths: ['', '', '', '', ''],
    hue: 215,
    sat: 70,
    glowV: 0,
    ampColorV: 0,
  });

  const stateRef = useRef(state);
  const sliderRef = useRef(sliderValue);
  const speakHueRef = useRef(speakingHue);
  const sizeRef = useRef(size);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { sliderRef.current = sliderValue; }, [sliderValue]);
  useEffect(() => { speakHueRef.current = speakingHue; }, [speakingHue]);

  const [initH, initS, initL] = getMoodHSL(sliderValue);
  const animCtx = useRef({
    t: 0,
    curH: initH, curS: initS, curL: initL,
    rotSpeedV: 0.14,
    radiusV: size * 0.43,
    scaleYV: 1.0,
    ampColorV: 0,
    glowV: 0,
    rotYacc: 0,
    rotXV: 0.30,
    ampSmooth: 0,
  });

  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  useEffect(() => {
    const draw = (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = Math.min((ts - lastTsRef.current) / 1000, 0.05);
      lastTsRef.current = ts;
      animCtx.current.t += dt;

      const newPaths = buildPathsForFrame(
        stateRef.current,
        sliderRef.current,
        speakHueRef.current,
        sizeRef.current,
        animCtx.current,
        dt,
      );
      setPaths(newPaths);
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const { linePaths, dotPaths, hue, sat, glowV, ampColorV } = paths;
  const h = Math.round(hue);
  const s = Math.round(sat);
  const lLine = Math.max(28, 52 - ampColorV * 18 - glowV * 10);
  const lDot = Math.max(22, 44 - ampColorV * 16 - glowV * 12);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Lines — 5 depth buckets, increasing opacity front→back */}
        {linePaths.map((d, b) => {
          if (!d) return null;
          const frac = b / 4;
          const opacity = 0.06 + frac * 0.32;
          const strokeWidth = 0.45 + frac * 0.55;
          return (
            <Path
              key={`line-${b}`}
              d={d}
              stroke={`hsla(${h},${s}%,${lLine}%,${opacity})`}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
            />
          );
        })}
        {/* Dots — 5 depth buckets */}
        {dotPaths.map((d, b) => {
          if (!d) return null;
          const frac = b / 4;
          const opacity = 0.18 + frac * 0.82;
          return (
            <Path
              key={`dot-${b}`}
              d={d}
              fill={`hsla(${h},${s}%,${lDot}%,${opacity})`}
            />
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
});
