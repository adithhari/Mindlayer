import { useRef, useEffect } from 'react';

// ─── Seeded PRNG (consistent every load, no random jitter) ────────────────────
function makeRng(seed) {
  let s = seed >>> 0;
  return () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}

// ─── Heartbeat lub-dub ─────────────────────────────────────────────────────────
function heartbeatPulse(p) {
  p = ((p % 1) + 1) % 1;
  return Math.exp(-200*(p-0.10)**2) + Math.exp(-200*(p-0.26)**2)*0.60;
}

// ─── Mood colors ───────────────────────────────────────────────────────────────
const MOOD_KF = [
  { v: 0,   h: 0,   s: 84, l: 60 },
  { v: 25,  h: 25,  s: 93, l: 57 },
  { v: 50,  h: 215, s: 16, l: 55 },
  { v: 70,  h: 258, s: 90, l: 76 },
  { v: 100, h: 142, s: 69, l: 58 },
];
function lerpHue(a, b, t) { let d=b-a; if(d>180)d-=360; if(d<-180)d+=360; return(a+d*t+360)%360; }
function getMoodHSL(v) {
  for (let i = 0; i < MOOD_KF.length-1; i++) {
    if (v >= MOOD_KF[i].v && v <= MOOD_KF[i+1].v) {
      const t = (v-MOOD_KF[i].v)/(MOOD_KF[i+1].v-MOOD_KF[i].v);
      return [lerpHue(MOOD_KF[i].h,MOOD_KF[i+1].h,t), MOOD_KF[i].s+(MOOD_KF[i+1].s-MOOD_KF[i].s)*t, MOOD_KF[i].l+(MOOD_KF[i+1].l-MOOD_KF[i].l)*t];
    }
  }
  return [MOOD_KF.at(-1).h, MOOD_KF.at(-1).s, MOOD_KF.at(-1).l];
}

// ─── Generate random uniform points on sphere (Marsaglia, seeded) ──────────────
const N_PTS  = 200;
const BASE   = (() => {
  const rng = makeRng(0xdeadbeef);
  const out  = new Float32Array(N_PTS * 3);
  let i = 0;
  while (i < N_PTS) {
    const x = rng()*2-1, y = rng()*2-1, z = rng()*2-1;
    const d = x*x + y*y + z*z;
    if (d > 1 || d < 1e-4) continue;
    const r = 1/Math.sqrt(d);
    out[i*3]=x*r; out[i*3+1]=y*r; out[i*3+2]=z*r; i++;
  }
  return out;
})();

// ─── Precompute connection graph ───────────────────────────────────────────────
// 0.42 threshold with 200 pts → organic clusters with sparser long-range links
const CONN_THRESH = 0.42;
const CONNS = (() => {
  const arr = [];
  for (let i = 0; i < N_PTS; i++) {
    for (let j = i+1; j < N_PTS; j++) {
      const dx=BASE[i*3]-BASE[j*3], dy=BASE[i*3+1]-BASE[j*3+1], dz=BASE[i*3+2]-BASE[j*3+2];
      const d = Math.sqrt(dx*dx+dy*dy+dz*dz);
      if (d < CONN_THRESH) arr.push(i, j, d/CONN_THRESH);
    }
  }
  return new Float32Array(arr);
})();
const N_CONN = CONNS.length / 3;

// ─── Hub score per node: nodes with more connections = bigger "soma" dot ───────
const HUB = (() => {
  const counts = new Float32Array(N_PTS);
  for (let c = 0; c < N_CONN; c++) counts[CONNS[c*3]|0]++, counts[CONNS[c*3+1]|0]++;
  const max = Math.max(...counts);
  // Normalize 0→1, then map to size multiplier 0.5→2.8 (small dendrite → large soma)
  return counts.map(v => 0.5 + (v / max) * 2.3);
})();

// ─── Per-frame working arrays (avoid GC) ──────────────────────────────────────
const PROJ  = new Float32Array(N_PTS * 2);
const DEPTH = new Float32Array(N_PTS);
const IDX   = new Int16Array(N_PTS).map((_,i)=>i);

// 5 depth buckets for batched line rendering (5 stroke calls instead of N_CONN)
const BUCKETS = [[], [], [], [], []];

// ─── Lerp speed ────────────────────────────────────────────────────────────────
const LS = 0.07;
const TWO_PI = Math.PI * 2;

export default function OrbScene({ state='idle', sliderValue=50, speakingHue=null, amplitudeRef }) {
  const canvasRef   = useRef(null);
  const stateRef    = useRef(state);
  const sliderRef   = useRef(sliderValue);
  const speakHueRef = useRef(speakingHue);

  useEffect(()=>{ stateRef.current    = state;       }, [state]);
  useEffect(()=>{ sliderRef.current   = sliderValue; }, [sliderValue]);
  useEffect(()=>{ speakHueRef.current = speakingHue; }, [speakingHue]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr  = Math.min(window.devicePixelRatio||1, 2);
    const size = canvas.parentElement?.clientWidth || 300;
    canvas.width  = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width  = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const W=size, H=size, cx=W/2, cy=H/2, D=Math.min(W,H);

    let [curH, curS, curL] = getMoodHSL(sliderRef.current);
    let ampSmooth = 0;

    // Smoothed animation state
    let rotSpeedV = 0.14, radiusV = D*0.43, scaleYV = 1.0;
    let ampColorV = 0, glowV = 0;
    let rotYacc   = 0, rotXV   = 0.30;

    let t=0, lastTs=null, raf=null;

    const draw = (ts) => {
      if (!lastTs) lastTs = ts;
      const dt = Math.min((ts-lastTs)/1000, 0.05);
      lastTs = ts; t += dt;

      const cur    = stateRef.current;
      const rawAmp = Math.min(amplitudeRef?.current ?? 0, 1);
      const isLive = cur==='listening' || cur==='speaking';
      const atk    = rawAmp > ampSmooth ? (isLive ? 0.50 : 0.28) : 0.055;
      ampSmooth   += (rawAmp - ampSmooth) * atk;
      const amp    = ampSmooth;

      // ── Per-state targets ──────────────────────────────────────────
      let tRotSpd=0.14, tRadius=D*0.43, tScaleY=1, tAmpC=0, tGlow=0;

      if (cur === 'idle') {
        tRotSpd = 0.12;
        tRadius = D * (0.43 + Math.sin(t*0.9)*0.012);

      } else if (cur === 'listening') {
        tRotSpd = 0.18 + amp * 0.55;
        tRadius = D * (0.43 + amp * 0.09);
        tAmpC   = amp;
        tGlow   = amp;

      } else if (cur === 'processing') {
        // Heartbeat drives the orb itself — no ring
        const hb = heartbeatPulse(t / 1.25);
        tRotSpd  = 0.13 + hb * 0.18;
        tRadius  = D * (0.43 + hb * 0.13);
        tAmpC    = hb * 0.70;
        tGlow    = hb * 0.90;

      } else if (cur === 'speaking') {
        // Speech-rhythm oscillator: layered sines simulate natural speech cadence
        // so the orb looks alive even between TTS amplitude peaks
        const speechDrive =
          Math.abs(Math.sin(t * 3.8)) * 0.55 +
          Math.abs(Math.sin(t * 7.2)) * 0.28 +
          Math.abs(Math.sin(t * 2.1)) * 0.17;
        const drive = Math.max(speechDrive * 0.07, amp * 0.11);
        tRotSpd = 0.22 + speechDrive * 0.28 + amp * 0.35;
        tRadius = D * (0.43 + drive);
        tAmpC   = Math.max(speechDrive * 0.55, amp * 0.90);
        tGlow   = Math.max(speechDrive * 0.45, amp * 0.80);
      }

      rotSpeedV += (tRotSpd  - rotSpeedV) * LS;
      radiusV   += (tRadius  - radiusV)   * LS;
      scaleYV   += (tScaleY  - scaleYV)   * LS;
      ampColorV += (tAmpC    - ampColorV) * LS;
      glowV     += (tGlow    - glowV)     * LS;

      rotYacc += rotSpeedV * dt;
      rotXV    = 0.30 + Math.sin(t*0.06)*0.18;

      // ── Mood color ─────────────────────────────────────────────────
      const [tH,tS,tL] = getMoodHSL(sliderRef.current);
      let hd=tH-curH; if(hd>180)hd-=360; if(hd<-180)hd+=360;
      curH=(curH+hd*0.04+360)%360;
      curS+=(tS-curS)*0.04; curL+=(tL-curL)*0.04;
      let h=curH, s=curS, l=curL;
      if (cur==='speaking' && speakHueRef.current!==null) {
        h=speakHueRef.current; s=Math.max(s,68); l=Math.max(l,58);
      }
      const sB  = Math.min(s + ampColorV*34, 100);

      // ── Rotate + project all points ─────────────────────────────
      const cosX=Math.cos(rotXV), sinX=Math.sin(rotXV);
      const cosY=Math.cos(rotYacc), sinY=Math.sin(rotYacc);
      const R=radiusV, sY=scaleYV;

      for (let i=0; i<N_PTS; i++) {
        const bx=BASE[i*3], by=BASE[i*3+1], bz=BASE[i*3+2];
        // Y rotation
        const x1= bx*cosY + bz*sinY;
        const z1=-bx*sinY + bz*cosY;
        // X rotation
        const y2= by*cosX - z1*sinX;
        const z2= by*sinX + z1*cosX;
        PROJ[i*2]   = cx + x1 * R;
        PROJ[i*2+1] = cy + y2 * R * sY;
        DEPTH[i]    = (z2 + 1) * 0.5;   // 0=back, 1=front
      }

      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';

      // ── Colors for white background — dark, saturated ──────────────
      // Lines/dots need low lightness so they're visible on white
      const lLine = Math.max(28, 52 - ampColorV * 18 - glowV * 10);  // 28-52%
      const lDot  = Math.max(22, 44 - ampColorV * 16 - glowV * 12);  // 22-44%
      const lGlow = Math.max(35, 55 - glowV * 15);                    // glow shadow

      const sphereA = 1;

      if (sphereA > 0.02) {
        ctx.globalAlpha = sphereA;

        // ── Bucket connections by depth for batched stroke ──────────
        for (let b=0; b<5; b++) BUCKETS[b].length = 0;
        for (let c=0; c<N_CONN; c++) {
          const ci=CONNS[c*3]|0, cj=CONNS[c*3+1]|0;
          const avgD = (DEPTH[ci]+DEPTH[cj])*0.5;
          BUCKETS[Math.min(4, (avgD*5)|0)].push(c);
        }

        // Draw connections — 5 batch calls instead of N_CONN individual strokes
        ctx.lineCap = 'round';
        for (let b=0; b<5; b++) {
          const frac  = b / 4;
          const alpha = 0.06 + frac * 0.32;
          const lw    = 0.45 + frac * 0.55;
          ctx.strokeStyle = `hsla(${h},${sB}%,${lLine}%,${alpha})`;
          ctx.lineWidth   = lw;
          ctx.shadowColor = `hsl(${h},${sB}%,${lGlow}%)`;
          ctx.shadowBlur  = frac * (2 + glowV * 6);
          ctx.beginPath();
          for (const c of BUCKETS[b]) {
            const ci=CONNS[c*3]|0, cj=CONNS[c*3+1]|0;
            ctx.moveTo(PROJ[ci*2], PROJ[ci*2+1]);
            ctx.lineTo(PROJ[cj*2], PROJ[cj*2+1]);
          }
          ctx.stroke();
        }
        ctx.shadowBlur = 0;

        // ── Dots — sorted back→front, depth-modulated size + glow ────
        for (let i=0; i<N_PTS; i++) IDX[i]=i;
        IDX.sort((a,b) => DEPTH[a]-DEPTH[b]);

        // Batch dots into 5 depth buckets too
        for (let b=0; b<5; b++) BUCKETS[b].length = 0;
        for (let oi=0; oi<N_PTS; oi++) {
          const i  = IDX[oi];
          const d  = DEPTH[i];
          if (d < 0.05) continue;   // skip deepest back-face points
          BUCKETS[Math.min(4, (d*5)|0)].push(i);
        }

        for (let b=0; b<5; b++) {
          const frac = b / 4;
          const dotA = 0.18 + frac * 0.82;
          ctx.fillStyle   = `hsla(${h},${sB}%,${lDot}%,${dotA})`;
          ctx.shadowColor = `hsl(${h},${sB}%,${lGlow}%)`;
          ctx.shadowBlur  = frac * (5 + glowV * 14);
          ctx.beginPath();
          for (const i of BUCKETS[b]) {
            const px  = PROJ[i*2], py = PROJ[i*2+1];
            // Hub nodes (many connections) render as large soma; sparse nodes as small dendrite tips
            const dotR = (0.8 + frac * 1.4) * HUB[i];
            ctx.moveTo(px + dotR, py);
            ctx.arc(px, py, dotR, 0, TWO_PI);
          }
          ctx.fill();
        }
        ctx.shadowBlur  = 0;
        ctx.globalAlpha = 1;
      }



      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
}
