// Route Choice junctions: the highway splits in two. The left carriageway leads to one route,
// the right carriageway to another. Once the centre barrier starts you're committed to your side.
// The chosen route reshapes the road ahead (flyover, hairpins, hills), its environment and its traffic.
// Pure data/logic (no Three.js / DOM) so it can be unit-tested in Node.

const ROUTE_FIRST_Z = 540;      // metres from the start to the first junction gate
const ROUTE_SPACING = 480;      // metres between junctions (multiple of the 60m chunk length)
const ROUTE_LOCK_LENGTH = 50;   // metres before the gate where the centre barrier locks your side
const ROUTE_SIDES = [-3.6, 3.6];
const ROUTE_START = 90;         // metres past the gate where the new route starts shaping the road
const ROUTE_RAMP = 130;         // metres to blend into the route's shape
const ROUTE_FADE_START = 380;   // road blends back to neutral before the next junction
const ROUTE_FADE_END = 450;

const ROUTES = {
  flyover: {
    id: 'flyover', icon: '🏙', name: 'CITY FLYOVER', color: '#7c3aed',
    perkLabel: '+15% top speed', trafficLabel: 'Light, fast traffic',
    biome: 'urban', lift: 8, curveAmp: 8, curveFreq: 0.006, hillAmp: 0, turn: 14,
    palette: { sky: 0x0b1026, sun: 0x38bdf8, sunI: 0.35, hemiSky: 0x312e81, hemiGround: 0x0f172a, head: 2.6, glow: 2.4, fog: 0.0032 },
    badge: '🏙 CITY FLYOVER • NEON NIGHT',
    traffic: { mix: [['car', 0.4], ['taxi', 0.3], ['bike', 0.3]], count: 9, speedMult: 1.15 },
    perk: { speedMult: 1.15 }
  },
  village: {
    id: 'village', icon: '🌾', name: 'VILLAGE ROAD', color: '#ca8a04',
    perkLabel: 'Double power-ups', trafficLabel: 'Packed & slow',
    biome: 'rural', lift: 0, curveAmp: 26, curveFreq: 0.013, hillAmp: 2, turn: 28,
    palette: { sky: 0xe8a25e, sun: 0xffc078, sunI: 1.5, hemiSky: 0xffeedd, hemiGround: 0x8a6344, head: 0.4, glow: 0.3, fog: 0.004 },
    badge: '🌾 VILLAGE ROAD • GOLDEN HOUR',
    traffic: { mix: [['auto', 0.35], ['bike', 0.25], ['truck', 0.25], ['bus', 0.15]], count: 16, speedMult: 0.8 },
    perk: { pickupSpacing: 90 }
  },
  ghat: {
    id: 'ghat', icon: '⛰', name: 'GHAT SECTION', color: '#15803d',
    perkLabel: '2x near-miss points', trafficLabel: 'Trucks & buses crawling',
    biome: 'ghat', lift: 0, curveAmp: 30, curveFreq: 0.02, hillAmp: 9, turn: 20,
    palette: { sky: 0x93a8a0, sun: 0xe2e8f0, sunI: 0.8, hemiSky: 0xd1fae5, hemiGround: 0x14532d, head: 1.2, glow: 0.8, fog: 0.007 },
    badge: '⛰ GHAT SECTION • MONSOON MIST',
    traffic: { mix: [['truck', 0.45], ['bus', 0.3], ['car', 0.25]], count: 12, speedMult: 0.75 },
    perk: { nearMissMult: 2 }
  },
  coastal: {
    id: 'coastal', icon: '🌊', name: 'KONKAN COAST', color: '#0284c7',
    perkLabel: 'Meter charges 2x', trafficLabel: 'Bikes & taxis',
    biome: 'coastal', lift: 0, curveAmp: 14, curveFreq: 0.008, hillAmp: 1.5, turn: 22,
    palette: { sky: 0x7dd3fc, sun: 0xfff7e0, sunI: 1.6, hemiSky: 0xe0f2fe, hemiGround: 0xc2a46b, head: 0.2, glow: 0.2, fog: 0.0025 },
    badge: '🌊 KONKAN COAST • SUNNY NOON',
    traffic: { mix: [['bike', 0.3], ['taxi', 0.25], ['car', 0.25], ['auto', 0.2]], count: 11, speedMult: 1.0 },
    perk: { meterMult: 2 }
  }
};

// Is this chunk start (zPos, negative going forward) the one that hosts a junction?
function isRouteChunk(zPos, chunkLength = 60) {
  const d = -zPos;
  if (d < ROUTE_FIRST_Z - chunkLength * 0.5) return false;
  const k = Math.round((d - ROUTE_FIRST_Z) / ROUTE_SPACING);
  return k >= 0 && Math.abs(d - (ROUTE_FIRST_Z + k * ROUTE_SPACING)) < chunkLength * 0.5;
}

// Is this chunk close to a junction (keep its approach clear of hazards)?
function nearRouteJunction(zPos, before = 120, after = 40) {
  const d = -zPos;
  const k = Math.round((d - ROUTE_FIRST_Z) / ROUTE_SPACING);
  for (const kk of [k - 1, k, k + 1]) {
    if (kk < 0) continue;
    const j = ROUTE_FIRST_Z + kk * ROUTE_SPACING;
    if (d > j - before && d < j + after) return true;
  }
  return false;
}

// Two different routes: [left carriageway, right carriageway]
function pickRouteOptions(rng = Math.random) {
  const pool = Object.values(ROUTES);
  const a = pool.splice(Math.floor(rng() * pool.length), 1)[0];
  const b = pool[Math.floor(rng() * pool.length)];
  return [a, b];
}

function sideIndex(offset) {
  return offset < 0 ? 0 : 1;
}

function smoothstep(a, b, x) {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
}

// How strongly a route shapes the road `d` metres past its gate (0 at both junctions)
function routeWeight(d) {
  return smoothstep(ROUTE_START, ROUTE_START + ROUTE_RAMP, d) * (1 - smoothstep(ROUTE_FADE_START, ROUTE_FADE_END, d));
}

// Extra road shape for a route: lateral curve, flyover lift and hills
function routeShape(route, d, side) {
  const w = routeWeight(d);
  if (w === 0) return { curve: 0, lift: 0, hill: 0 };
  const sign = side === 0 ? -1 : 1; // left carriageway turns off left, right turns right
  return {
    curve: w * (sign * route.turn + route.curveAmp * Math.sin(d * route.curveFreq)),
    lift: w * route.lift,
    hill: w * route.hillAmp * Math.sin(d * 0.016)
  };
}

// Weighted pick from a traffic mix like [['car', 0.4], ['bike', 0.6]]
function pickTrafficType(mix, rng = Math.random) {
  const total = mix.reduce((s, m) => s + m[1], 0);
  let r = rng() * total;
  for (const [type, weight] of mix) {
    r -= weight;
    if (r < 0) return type;
  }
  return mix[mix.length - 1][0];
}

const ROUTE_API = {
  ROUTES, ROUTE_SIDES, ROUTE_LOCK_LENGTH, ROUTE_START, ROUTE_SPACING,
  isRouteChunk, nearRouteJunction, pickRouteOptions, sideIndex, routeWeight, routeShape, pickTrafficType
};
if (typeof window !== 'undefined') Object.assign(window, ROUTE_API);
