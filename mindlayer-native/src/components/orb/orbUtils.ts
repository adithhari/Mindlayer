// Pure math for the 3D orb — no DOM, no React
// Ported from OrbScene.jsx — reduced N_PTS: 200→80, CONN_THRESH: 0.42→0.55

function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}

export function heartbeatPulse(p: number): number {
  p = ((p % 1) + 1) % 1;
  return Math.exp(-200 * (p - 0.10) ** 2) + Math.exp(-200 * (p - 0.26) ** 2) * 0.60;
}

const MOOD_KF = [
  { v: 0,   h: 0,   s: 84, l: 60 },
  { v: 25,  h: 25,  s: 93, l: 57 },
  { v: 50,  h: 215, s: 52, l: 55 },
  { v: 70,  h: 258, s: 90, l: 76 },
  { v: 100, h: 142, s: 69, l: 58 },
];

export function lerpHue(a: number, b: number, t: number): number {
  let d = b - a;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return (a + d * t + 360) % 360;
}

export function getMoodHSL(v: number): [number, number, number] {
  for (let i = 0; i < MOOD_KF.length - 1; i++) {
    if (v >= MOOD_KF[i].v && v <= MOOD_KF[i + 1].v) {
      const t = (v - MOOD_KF[i].v) / (MOOD_KF[i + 1].v - MOOD_KF[i].v);
      return [
        lerpHue(MOOD_KF[i].h, MOOD_KF[i + 1].h, t),
        MOOD_KF[i].s + (MOOD_KF[i + 1].s - MOOD_KF[i].s) * t,
        MOOD_KF[i].l + (MOOD_KF[i + 1].l - MOOD_KF[i].l) * t,
      ];
    }
  }
  return [MOOD_KF[MOOD_KF.length - 1].h, MOOD_KF[MOOD_KF.length - 1].s, MOOD_KF[MOOD_KF.length - 1].l];
}

// ── Generate 80 uniform points on sphere (Marsaglia method, seeded) ──
export const N_PTS = 80;
export const CONN_THRESH = 0.55;

export const BASE: number[] = (() => {
  const rng = makeRng(0xdeadbeef);
  const out: number[] = [];
  let count = 0;
  while (count < N_PTS) {
    const x = rng() * 2 - 1, y = rng() * 2 - 1, z = rng() * 2 - 1;
    const d = x * x + y * y + z * z;
    if (d > 1 || d < 1e-4) continue;
    const r = 1 / Math.sqrt(d);
    out.push(x * r, y * r, z * r);
    count++;
  }
  return out;
})();

// ── Precompute connection graph ──
// Each entry: [i, j, normDist]
export const CONNS: number[] = (() => {
  const arr: number[] = [];
  for (let i = 0; i < N_PTS; i++) {
    for (let j = i + 1; j < N_PTS; j++) {
      const dx = BASE[i * 3] - BASE[j * 3];
      const dy = BASE[i * 3 + 1] - BASE[j * 3 + 1];
      const dz = BASE[i * 3 + 2] - BASE[j * 3 + 2];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d < CONN_THRESH) arr.push(i, j, d / CONN_THRESH);
    }
  }
  return arr;
})();
export const N_CONN = CONNS.length / 3;

// ── Hub scores — more connections = bigger node ──
export const HUB: number[] = (() => {
  const counts = new Array(N_PTS).fill(0);
  for (let c = 0; c < N_CONN; c++) {
    counts[Math.floor(CONNS[c * 3])]++;
    counts[Math.floor(CONNS[c * 3 + 1])]++;
  }
  const max = Math.max(...counts);
  return counts.map((v: number) => 0.5 + (v / max) * 2.3);
})();

// ── Project all points given rotation angles & radius ──
// Returns { px, py, depth } arrays
export function projectPoints(rotY: number, rotX: number, radius: number, cx: number, cy: number, scaleY: number) {
  const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
  const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
  const px = new Array<number>(N_PTS);
  const py = new Array<number>(N_PTS);
  const depth = new Array<number>(N_PTS);

  for (let i = 0; i < N_PTS; i++) {
    const bx = BASE[i * 3], by = BASE[i * 3 + 1], bz = BASE[i * 3 + 2];
    const x1 =  bx * cosY + bz * sinY;
    const z1 = -bx * sinY + bz * cosY;
    const y2 = by * cosX - z1 * sinX;
    const z2 = by * sinX + z1 * cosX;
    px[i] = cx + x1 * radius;
    py[i] = cy + y2 * radius * scaleY;
    depth[i] = (z2 + 1) * 0.5;
  }
  return { px, py, depth };
}
